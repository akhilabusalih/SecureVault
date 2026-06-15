import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "vault_db.json");

app.use(express.json());

// Initialize Database structure if it doesn't exist
interface User {
  username: string;
  salt: string;
  verifierHash: string; // Master Key proof
}

interface VaultEntry {
  id: string;
  username: string; // owner
  url: string;
  category: string;
  encryptedBlob: string; // The encrypted JSON comprising title, username, password, notes, tags
  iv: string;
  salt: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ActivityLog {
  id: string;
  username: string;
  action: string;
  timestamp: string;
  ipAddress: string;
  status: "Success" | "Failed";
}

interface Setting {
  username: string;
  autoLockTime: number; // in minutes
  requirePasswordOnCopy: boolean;
  twoFactorEnabled: boolean;
}

interface Backup {
  id: string;
  username: string;
  filename: string;
  createdAt: string;
  size: string;
  type: "Manual" | "Auto";
}

interface Database {
  users: User[];
  vault: VaultEntry[];
  logs: ActivityLog[];
  settings: Setting[];
  backups: Backup[];
}

function loadDB(): Database {
  if (!fs.existsSync(DB_FILE)) {
    const initialDB: Database = {
      users: [],
      vault: [],
      logs: [],
      settings: [],
      backups: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2));
    return initialDB;
  }
  try {
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Failed to read database file, resetting standard database.", err);
    return { users: [], vault: [], logs: [], settings: [], backups: [] };
  }
}

function saveDB(db: Database) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// REST APIs
// 1. Auth Endpoint
app.post("/api/auth/register", (req, res) => {
  const { username, salt, verifierHash } = req.body;
  if (!username || !salt || !verifierHash) {
    return res.status(400).json({ error: "Missing registration parameters" });
  }

  const db = loadDB();
  const existingUser = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: "Username is already registered" });
  }

  db.users.push({ username, salt, verifierHash });
  
  // Initialize default user settings
  db.settings.push({
    username,
    autoLockTime: 15,
    requirePasswordOnCopy: false,
    twoFactorEnabled: false
  });

  // Log action
  db.logs.push({
    id: Math.random().toString(36).substring(2, 9),
    username,
    action: "Account Registration",
    timestamp: new Date().toISOString(),
    ipAddress: req.ip || "127.0.0.1",
    status: "Success"
  });

  saveDB(db);
  res.status(201).json({ message: "Registration successful" });
});

app.post("/api/auth/login", (req, res) => {
  const { username, verifierHash } = req.body;
  if (!username || !verifierHash) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  const db = loadDB();
  const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  
  if (!user || user.verifierHash !== verifierHash) {
    // Add failed log
    db.logs.push({
      id: Math.random().toString(36).substring(2, 9),
      username: username || "anonymous",
      action: "Failed Login Attempt",
      timestamp: new Date().toISOString(),
      ipAddress: req.ip || "127.0.0.1",
      status: "Failed"
    });
    saveDB(db);
    return res.status(401).json({ error: "Invalid username or master key verifier" });
  }

  // Record successful login
  db.logs.push({
    id: Math.random().toString(36).substring(2, 9),
    username,
    action: "Successful Authentication",
    timestamp: new Date().toISOString(),
    ipAddress: req.ip || "127.0.0.1",
    status: "Success"
  });

  saveDB(db);
  res.status(200).json({ 
    message: "Login successful", 
    salt: user.salt,
    username: user.username
  });
});

app.get("/api/auth/check/:username", (req, res) => {
  const db = loadDB();
  const user = db.users.find(u => u.username.toLowerCase() === req.params.username.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.status(200).json({ salt: user.salt });
});

// 2. Vault Entries Endpoints
app.get("/api/vault", (req, res) => {
  const username = req.headers["x-vault-user"] as string;
  if (!username) {
    return res.status(401).json({ error: "Authentication user header required" });
  }
  const db = loadDB();
  const userVault = db.vault.filter(item => item.username.toLowerCase() === username.toLowerCase());
  res.status(200).json(userVault);
});

app.post("/api/vault/add", (req, res) => {
  const username = req.headers["x-vault-user"] as string;
  if (!username) {
    return res.status(401).json({ error: "Authentication user header required" });
  }
  const { url, category, encryptedBlob, iv, salt, isFavorite } = req.body;
  if (!encryptedBlob || !iv) {
    return res.status(400).json({ error: "Missing encrypted vault fields" });
  }

  const db = loadDB();
  const newEntry: VaultEntry = {
    id: Math.random().toString(36).substring(2, 11),
    username,
    url: url || "",
    category: category || "General",
    encryptedBlob,
    iv,
    salt,
    isFavorite: !!isFavorite,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.vault.push(newEntry);
  
  db.logs.push({
    id: Math.random().toString(36).substring(2, 9),
    username,
    action: "Vault Entry Created",
    timestamp: new Date().toISOString(),
    ipAddress: req.ip || "127.0.0.1",
    status: "Success"
  });

  saveDB(db);
  res.status(201).json(newEntry);
});

app.put("/api/vault/update", (req, res) => {
  const username = req.headers["x-vault-user"] as string;
  if (!username) {
    return res.status(401).json({ error: "Authentication user header required" });
  }
  const { id, url, category, encryptedBlob, iv, salt, isFavorite } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Missing entry ID" });
  }

  const db = loadDB();
  const index = db.vault.findIndex(item => item.id === id && item.username.toLowerCase() === username.toLowerCase());
  if (index === -1) {
    return res.status(404).json({ error: "Vault entry not found" });
  }

  db.vault[index] = {
    ...db.vault[index],
    url: url !== undefined ? url : db.vault[index].url,
    category: category !== undefined ? category : db.vault[index].category,
    encryptedBlob: encryptedBlob !== undefined ? encryptedBlob : db.vault[index].encryptedBlob,
    iv: iv !== undefined ? iv : db.vault[index].iv,
    salt: salt !== undefined ? salt : db.vault[index].salt,
    isFavorite: isFavorite !== undefined ? !!isFavorite : db.vault[index].isFavorite,
    updatedAt: new Date().toISOString()
  };

  db.logs.push({
    id: Math.random().toString(36).substring(2, 9),
    username,
    action: "Vault Entry Updated",
    timestamp: new Date().toISOString(),
    ipAddress: req.ip || "127.0.0.1",
    status: "Success"
  });

  saveDB(db);
  res.status(200).json(db.vault[index]);
});

app.delete("/api/vault/delete/:id", (req, res) => {
  const username = req.headers["x-vault-user"] as string;
  if (!username) {
    return res.status(401).json({ error: "Authentication user header required" });
  }
  const { id } = req.params;

  const db = loadDB();
  const initialLen = db.vault.length;
  db.vault = db.vault.filter(item => !(item.id === id && item.username.toLowerCase() === username.toLowerCase()));

  if (db.vault.length === initialLen) {
    return res.status(404).json({ error: "Entry not found" });
  }

  db.logs.push({
    id: Math.random().toString(36).substring(2, 9),
    username,
    action: "Vault Entry Deleted",
    timestamp: new Date().toISOString(),
    ipAddress: req.ip || "127.0.0.1",
    status: "Success"
  });

  saveDB(db);
  res.status(200).json({ message: "Vault entry deleted successfully" });
});

// 3. Backups Endpoints
app.get("/api/backups", (req, res) => {
  const username = req.headers["x-vault-user"] as string;
  if (!username) {
    return res.status(401).json({ error: "User authentication required" });
  }
  const db = loadDB();
  const userBackups = db.backups.filter(b => b.username.toLowerCase() === username.toLowerCase());
  res.status(200).json(userBackups);
});

app.post("/api/backups/create", (req, res) => {
  const username = req.headers["x-vault-user"] as string;
  if (!username) {
    return res.status(401).json({ error: "User authentication required" });
  }
  const { type } = req.body;

  const db = loadDB();
  const userVault = db.vault.filter(item => item.username.toLowerCase() === username.toLowerCase());
  const backupId = Math.random().toString(36).substring(2, 10);
  const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `securevault_backup_${username}_${dateStr}.json`;
  
  // Simulate active backup file record creation
  const newBackup: Backup = {
    id: backupId,
    username,
    filename,
    createdAt: new Date().toISOString(),
    size: `${(JSON.stringify(userVault).length / 1024).toFixed(2)} KB`,
    type: type === "Auto" ? "Auto" : "Manual"
  };

  db.backups.push(newBackup);

  // Maintain max 30 backups retention policy to prevent bloat
  const userBackups = db.backups.filter(b => b.username.toLowerCase() === username.toLowerCase());
  if (userBackups.length > 30) {
    userBackups.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const excess = userBackups.length - 30;
    for (let i = 0; i < excess; i++) {
       db.backups = db.backups.filter(b => b.id !== userBackups[i].id);
    }
  }

  db.logs.push({
    id: Math.random().toString(36).substring(2, 9),
    username,
    action: `Backup Created (${newBackup.type})`,
    timestamp: new Date().toISOString(),
    ipAddress: req.ip || "127.0.0.1",
    status: "Success"
  });

  saveDB(db);
  res.status(201).json(newBackup);
});

app.post("/api/backups/restore", (req, res) => {
  const username = req.headers["x-vault-user"] as string;
  if (!username) {
    return res.status(401).json({ error: "User authentication required" });
  }
  const { backupData } = req.body;
  if (!Array.isArray(backupData)) {
    return res.status(400).json({ error: "Invalid backup data structure" });
  }

  const db = loadDB();
  
  // Filter out any existing entries for this user and overwrite with backup
  db.vault = db.vault.filter(item => item.username.toLowerCase() !== username.toLowerCase());

  const importedEntries = backupData.map(entry => ({
    id: entry.id || Math.random().toString(36).substring(2, 11),
    username,
    url: entry.url || "",
    category: entry.category || "General",
    encryptedBlob: entry.encryptedBlob,
    iv: entry.iv,
    salt: entry.salt,
    isFavorite: !!entry.isFavorite,
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));

  db.vault.push(...importedEntries);

  db.logs.push({
    id: Math.random().toString(36).substring(2, 9),
    username,
    action: "Vault Restored from Backup",
    timestamp: new Date().toISOString(),
    ipAddress: req.ip || "127.0.0.1",
    status: "Success"
  });

  saveDB(db);
  res.status(200).json({ message: "Backup data successfully restored!", restoredCount: importedEntries.length });
});

// 4. Audit & Settings & Logs
app.get("/api/logs", (req, res) => {
  const username = req.headers["x-vault-user"] as string;
  if (!username) {
    return res.status(401).json({ error: "User authentication required" });
  }
  const db = loadDB();
  const userLogs = db.logs.filter(log => log.username.toLowerCase() === username.toLowerCase());
  res.status(200).json(userLogs.reverse().slice(0, 100)); // Limit to last 100
});

app.get("/api/settings", (req, res) => {
  const username = req.headers["x-vault-user"] as string;
  if (!username) {
    return res.status(401).json({ error: "User authentication required" });
  }
  const db = loadDB();
  let userSettings = db.settings.find(s => s.username.toLowerCase() === username.toLowerCase());
  if (!userSettings) {
    userSettings = {
      username,
      autoLockTime: 15,
      requirePasswordOnCopy: false,
      twoFactorEnabled: false
    };
    db.settings.push(userSettings);
    saveDB(db);
  }
  res.status(200).json(userSettings);
});

app.post("/api/settings/update", (req, res) => {
  const username = req.headers["x-vault-user"] as string;
  if (!username) {
    return res.status(401).json({ error: "User authentication required" });
  }
  const { autoLockTime, requirePasswordOnCopy, twoFactorEnabled } = req.body;

  const db = loadDB();
  const index = db.settings.findIndex(s => s.username.toLowerCase() === username.toLowerCase());
  if (index === -1) {
    db.settings.push({
      username,
      autoLockTime: Number(autoLockTime) || 15,
      requirePasswordOnCopy: !!requirePasswordOnCopy,
      twoFactorEnabled: !!twoFactorEnabled
    });
  } else {
    db.settings[index] = {
      username,
      autoLockTime: autoLockTime !== undefined ? Number(autoLockTime) : db.settings[index].autoLockTime,
      requirePasswordOnCopy: requirePasswordOnCopy !== undefined ? !!requirePasswordOnCopy : db.settings[index].requirePasswordOnCopy,
      twoFactorEnabled: twoFactorEnabled !== undefined ? !!twoFactorEnabled : db.settings[index].twoFactorEnabled
    };
  }

  db.logs.push({
    id: Math.random().toString(36).substring(2, 9),
    username,
    action: "Updated Security Settings",
    timestamp: new Date().toISOString(),
    ipAddress: req.ip || "127.0.0.1",
    status: "Success"
  });

  saveDB(db);
  res.status(200).json({ message: "Settings updated successfully" });
});

// Bootstrapping Vite dev server or serving static files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SecureVault] Production-grade backend server running on http://localhost:${PORT}`);
  });
}

startServer();
