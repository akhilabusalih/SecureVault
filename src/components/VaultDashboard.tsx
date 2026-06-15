import React, { useState, useEffect } from "react";
import { 
  Plus, Search, Copy, Download, Upload, Shield, 
  Settings, Key, AlertCircle, FileSpreadsheet, Lock, 
  BookOpen, LogOut, Check, Eye, EyeOff, LayoutGrid, 
  Heart, Calendar, RefreshCw, ChevronRight, Activity, 
  FileText, Trash2, Edit3, Sparkles, Smartphone, Laptop,
  X, CheckCircle, ShieldAlert, Sliders, KeyRound
} from "lucide-react";
import { VaultItem, EncryptedVaultItem, BackupItem, ActivityLogItem, UserSettings } from "../types";
import { 
  encryptPayload, decryptPayload, generateSalt, bufToHex, 
  encryptFile, decryptFile, hexToBuf, generateVerifierHash 
} from "../utils/crypto";
import PasswordGenerator from "./PasswordGenerator";
import DocsLayout from "./DocsLayout";

// Detect browser userAgent details to discover active workstation and platform
const getActiveDevice = () => {
  if (typeof window === "undefined" || !navigator) {
    return {
      id: "session-active",
      name: "Workstation (Unknown - Session Secure)",
      lastActive: "Just Now",
      isCurrent: true,
      type: "desktop" as "desktop" | "mobile"
    };
  }

  const cachedSess = sessionStorage.getItem("securevault_active_session");
  if (cachedSess) {
    try {
      return JSON.parse(cachedSess);
    } catch (e) {
      // ignore
    }
  }

  const ua = navigator.userAgent;
  let osName = "Unknown Workstation";
  let browserName = "Unknown Browser";
  let type: "desktop" | "mobile" = "desktop";

  if (/Windows/i.test(ua)) osName = "Windows";
  else if (/Macintosh|Mac OS X/i.test(ua)) {
    if (/iPhone|iPad|iPod/i.test(ua)) {
      osName = "iOS";
      type = "mobile";
    } else {
      osName = "macOS";
    }
  } else if (/Android/i.test(ua)) {
    osName = "Android";
    type = "mobile";
  } else if (/Linux/i.test(ua)) osName = "Linux";

  if (/Firefox/i.test(ua)) browserName = "Firefox";
  else if (/Chrome/i.test(ua) && !/Edge|Edg/i.test(ua)) browserName = "Chrome";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua) && !/Edge|Edg/i.test(ua)) browserName = "Safari";
  else if (/Edge|Edg/i.test(ua)) browserName = "Edge";
  else if (/MSIE|Trident/i.test(ua)) browserName = "Internet Explorer";

  const currentSess = {
    id: "session-active",
    name: `Current Workstation (${osName} - ${browserName} - Session Secure)`,
    lastActive: "Just Now",
    isCurrent: true,
    type
  };

  sessionStorage.setItem("securevault_active_session", JSON.stringify(currentSess));
  return currentSess;
};

interface VaultDashboardProps {
  username: string;
  masterKey: CryptoKey;
  onLock: () => void;
}

export default function VaultDashboard({ username, masterKey, onLock }: VaultDashboardProps) {
  // Navigation
  const [activeSubView, setActiveSubView] = useState<"vault" | "audit" | "backups" | "logs" | "settings" | "docs">("vault");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  // State
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  
  // High-Security User Settings matching specification
  const [settings, setSettings] = useState<UserSettings>({
    autoLockTime: 15,
    requirePasswordOnCopy: false,
    twoFactorEnabled: false,
    requirePasswordOnAction: true,
    autoClearClipboardTime: 30,
    maxFailedAttempts: 5,
    lockOnBrowserClose: true,
    rememberTrustedDevice: false
  });

  // Reauthentication dialog state
  const [reauthModal, setReauthModal] = useState<{
    isOpen: boolean;
    onSuccess: () => void;
    reason: string;
  }>({
    isOpen: false,
    onSuccess: () => {},
    reason: ""
  });
  const [reauthPassword, setReauthPassword] = useState("");
  const [reauthError, setReauthError] = useState("");
  const [isReauthing, setIsReauthing] = useState(false);

  // Trusted Devices list dynamically aligned with current active session and trusted storage state
  const [trustedDevices, setTrustedDevices] = useState<any[]>(() => {
    const currentDev = getActiveDevice();
    const storedTrustedKey = `securevault_trusted_devices_${username.trim().toLowerCase()}`;
    let loadedDevices: any[] = [];
    try {
      const savedStr = localStorage.getItem(storedTrustedKey);
      if (savedStr) {
        loadedDevices = JSON.parse(savedStr);
      }
    } catch (e) {
      console.error("Error reading trusted devices storage:", e);
    }

    const activeExists = loadedDevices.some(d => d.name === currentDev.name);
    
    const combined = activeExists
      ? loadedDevices.map(d => d.name === currentDev.name ? { ...d, isCurrent: true, lastActive: "Just Now" } : { ...d, isCurrent: false })
      : [currentDev, ...loadedDevices.map(d => ({ ...d, isCurrent: false }))];

    return combined;
  });

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Feedback
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedFeedbackId, setCopiedFeedbackId] = useState<string | null>(null);
  const [apiError, setApiError] = useState("");
  const [apiSuccess, setApiSuccess] = useState("");
  const [viewPasswordIds, setViewPasswordIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formCategory, setFormCategory] = useState("Login");
  const [formNotes, setFormNotes] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formIsFavorite, setFormIsFavorite] = useState(false);
  const [showFormGenerator, setShowFormGenerator] = useState(false);
  const [formAttachments, setFormAttachments] = useState<any[]>([]);

  // Load vault items, backups, logs, and settings
  const fetchAllData = async () => {
    setIsLoading(true);
    setApiError("");
    try {
      // 1. Fetch encrypted items from express server
      const vaultResp = await fetch("/api/vault", {
        headers: { "x-vault-user": username }
      });
      if (!vaultResp.ok) throw new Error("Failed to load vault payload from server");
      const encryptedData: EncryptedVaultItem[] = await vaultResp.json();

      // 2. Decrypt all items client-side using the master key
      const decryptedList: VaultItem[] = [];
      for (const item of encryptedData) {
        try {
          const payload = await decryptPayload(item.encryptedBlob, item.iv, masterKey);
          decryptedList.push({
            id: item.id,
            url: item.url,
            category: item.category,
            title: payload.title,
            username: payload.username,
            password: payload.password,
            notes: payload.notes,
            tags: payload.tags || [],
            isFavorite: item.isFavorite,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            attachments: payload.attachments || []
          });
        } catch (decErr) {
          console.error(`Failed decryption for item id: ${item.id}`, decErr);
          // Keep a safe placeholder instead of crashing everything
          decryptedList.push({
            id: item.id,
            url: item.url,
            category: item.category,
            title: "🔐 Encrypted Content (Failed to Decrypt)",
            username: "unknown",
            password: "",
            notes: "The master key block may be tempered or invalid for this record.",
            tags: [],
            isFavorite: item.isFavorite,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt
          });
        }
      }
      setVaultItems(decryptedList);

      // 3. Fetch logs
      const logsResp = await fetch("/api/logs", { headers: { "x-vault-user": username } });
      if (logsResp.ok) {
        const logsData = await logsResp.json();
        setLogs(logsData);
      }

      // 4. Fetch backups list
      const backupsResp = await fetch("/api/backups", { headers: { "x-vault-user": username } });
      if (backupsResp.ok) {
        const backupsData = await backupsResp.json();
        setBackups(backupsData);
      }

      // 5. Fetch settings
      const settingsResp = await fetch("/api/settings", { headers: { "x-vault-user": username } });
      if (settingsResp.ok) {
        const settingsData = await settingsResp.json();
        setSettings(settingsData);
        localStorage.setItem(`securevault_settings_${username.trim().toLowerCase()}`, JSON.stringify(settingsData));
      }
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "Communication discrepancy. Failed to orchestrate data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [username]);

  // Handle Automatic session lockout and browser close locks
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      if (settings.autoLockTime === 0) return; // Never Lock
      const limitMs = settings.autoLockTime * 60 * 1000;
      timeoutId = setTimeout(() => {
        onLock();
      }, limitMs);
    };

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    resetTimer();

    // Lock Vault on Browser Close
    const handleBeforeUnload = () => {
      if (settings.lockOnBrowserClose) {
        onLock();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [settings.autoLockTime, settings.lockOnBrowserClose, onLock]);

  // Global Keydown listener for Panic Lock shortcut: Ctrl + Shift + L
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "L" || e.key === "l")) {
        e.preventDefault();
        triggerPanicLock();
      }
    };
    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => {
      window.removeEventListener("keydown", handleGlobalShortcuts);
    };
  }, []);

  // Handle toggling persistent Device Trust based on rememberTrustedDevice setting
  useEffect(() => {
    const currentDev = getActiveDevice();
    const storedTrustedKey = `securevault_trusted_devices_${username.trim().toLowerCase()}`;
    let loadedDevices: any[] = [];
    try {
      const savedStr = localStorage.getItem(storedTrustedKey);
      if (savedStr) {
        loadedDevices = JSON.parse(savedStr);
      }
    } catch (e) {
      // ignore
    }

    if (settings.rememberTrustedDevice) {
      const alreadySaved = loadedDevices.some(d => d.name === currentDev.name);
      if (!alreadySaved) {
        const toSave = { 
          id: currentDev.id, 
          name: currentDev.name, 
          lastActive: "Just Now", 
          isCurrent: false, 
          type: currentDev.type 
        };
        const updated = [...loadedDevices, toSave];
        localStorage.setItem(storedTrustedKey, JSON.stringify(updated));
        
        setTrustedDevices(prev => {
          const exists = prev.some(d => d.name === currentDev.name);
          if (!exists) {
            return [currentDev, ...prev];
          }
          return prev;
        });
      }
    } else {
      const updated = loadedDevices.filter(d => d.name !== currentDev.name);
      localStorage.setItem(storedTrustedKey, JSON.stringify(updated));
    }
  }, [settings.rememberTrustedDevice, username]);

  // Panic Lock Implementation
  const triggerPanicLock = () => {
    // 1. Clear sensitive clipboard memory cache instantly
    navigator.clipboard.writeText("[SecureVault Panic Lock Cleared]");
    // 2. Clear any stored auth tokens
    sessionStorage.clear();
    localStorage.removeItem("securevault_active_session");
    // 3. Immediately seal decryption memory keys and return to auth screen
    onLock();
  };

  // Reauthentication flow before sensitive actions
  const triggerReauth = (reason: string, onSuccess: () => void) => {
    if (!settings.requirePasswordOnAction) {
      onSuccess();
      return;
    }
    setReauthPassword("");
    setReauthError("");
    setReauthModal({
      isOpen: true,
      onSuccess,
      reason
    });
  };

  const handleReauthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reauthPassword) {
      setReauthError("Master passphrase is required.");
      return;
    }
    setIsReauthing(true);
    setReauthError("");
    try {
      // 1. Get user salt from server
      const saltResp = await fetch(`/api/auth/check/${encodeURIComponent(username.trim())}`);
      if (!saltResp.ok) throw new Error("Verification error: Master salt signature lookup failed.");
      const { salt: saltHex } = await saltResp.json();
      const saltBytes = hexToBuf(saltHex);

      // 2. Compute master verifier
      const verifier = await generateVerifierHash(reauthPassword, saltBytes);

      // 3. Verify verifier credentials on backend server
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          verifierHash: verifier
        })
      });

      if (!response.ok) {
        throw new Error("Invalid master passphrase authentication check.");
      }

      // Close modal and execute action callback
      setReauthModal(prev => ({ ...prev, isOpen: false }));
      reauthModal.onSuccess();
    } catch (err: any) {
      setReauthError(err.message || "Failed authentication checks.");
    } finally {
      setIsReauthing(false);
    }
  };

  const copyToClipboard = (text: string, fieldType: string, feedbackId?: string) => {
    // Require Verification Before Copy (if enabled under settings, or if requirePasswordOnAction is set for password copies)
    const needsVerification = (settings.requirePasswordOnCopy && fieldType === "Password") || 
                              (settings.requirePasswordOnAction && fieldType === "Password");

    if (needsVerification) {
      triggerReauth("Copy sensitive credential elements", () => {
        performCopy(text, fieldType, feedbackId);
      });
    } else {
      performCopy(text, fieldType, feedbackId);
    }
  };

  const performCopy = (text: string, fieldType: string, feedbackId?: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldType);
    if (feedbackId) setCopiedFeedbackId(feedbackId);
    
    // Auto clear feedback status
    setTimeout(() => {
      setCopiedField(null);
      setCopiedFeedbackId(null);
    }, 2000);

    // Auto Clear Clipboard Memory limit
    if (settings.autoClearClipboardTime > 0) {
      setTimeout(() => {
        // Read current text, if unchanged, overwrite to clear
        navigator.clipboard.readText().then(currentText => {
          if (currentText === text) {
            navigator.clipboard.writeText("[SecureVault Clipboard Cleared]");
            setApiSuccess("Clipboard securely purged!");
            setTimeout(() => setApiSuccess(""), 2000);
          }
        }).catch(() => {
          // Fallback overwrite
          navigator.clipboard.writeText("[SecureVault Clipboard Cleared]");
        });
      }, settings.autoClearClipboardTime * 1000);
    }
  };

  const togglePasswordVisibility = (id: string) => {
    const isCurrentlyShowing = viewPasswordIds.includes(id);
    if (!isCurrentlyShowing && settings.requirePasswordOnAction) {
      triggerReauth("View sensitive vault record credentials", () => {
        setViewPasswordIds(prev => [...prev, id]);
      });
    } else {
      setViewPasswordIds(prev => 
        prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
      );
    }
  };

  // Create or Update handling
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle) {
      setApiError("Title field is mandatory.");
      return;
    }

    setApiError("");
    setApiSuccess("");
    setIsLoading(true);

    try {
      const parsedTags = formTags ? formTags.split(",").map(t => t.trim()).filter(Boolean) : [];
      
      // Pack plaintext body content
      const plaintextPayload = {
        title: formTitle.trim(),
        username: formUsername.trim(),
        password: formPassword,
        notes: formNotes.trim(),
        tags: parsedTags,
        attachments: formAttachments
      };

      // Encrypt client-side
      const encrypted = await encryptPayload(plaintextPayload, masterKey);

      if (isEditing && selectedItem) {
        // Edit API request
        const response = await fetch("/api/vault/update", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-vault-user": username
          },
          body: JSON.stringify({
            id: selectedItem.id,
            url: formUrl.trim(),
            category: formCategory,
            encryptedBlob: encrypted.ciphertext,
            iv: encrypted.iv,
            isFavorite: formIsFavorite
          })
        });

        if (!response.ok) {
          const respData = await response.json();
          throw new Error(respData.error || "Failed to update vault item.");
        }

        setApiSuccess("Vault item updated.");
      } else {
        // Create API request
        const response = await fetch("/api/vault/add", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-vault-user": username
          },
          body: JSON.stringify({
            url: formUrl.trim(),
            category: formCategory,
            encryptedBlob: encrypted.ciphertext,
            iv: encrypted.iv,
            isFavorite: formIsFavorite
          })
        });

        if (!response.ok) {
          const respData = await response.json();
          throw new Error(respData.error || "Failed to add vault item.");
        }

        setApiSuccess("Item securely locked on filesystem.");
      }

      // Close state reset forms
      setIsAddingNew(false);
      setIsEditing(false);
      setSelectedItem(null);
      resetForm();
      fetchAllData();
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "Failed to secure transaction.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormTitle("");
    setFormUsername("");
    setFormPassword("");
    setFormUrl("");
    setFormCategory("Login");
    setFormNotes("");
    setFormTags("");
    setFormIsFavorite(false);
    setShowFormGenerator(false);
    setFormAttachments([]);
  };

  const handleEditClick = (item: VaultItem) => {
    setSelectedItem(item);
    setFormTitle(item.title);
    setFormUsername(item.username);
    setFormPassword(item.password || "");
    setFormUrl(item.url || "");
    setFormCategory(item.category);
    setFormNotes(item.notes || "");
    setFormTags(item.tags.join(", "));
    setFormIsFavorite(item.isFavorite);
    setFormAttachments(item.attachments || []);
    setIsEditing(true);
    setIsAddingNew(false);
  };

  const handleDeleteClick = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this credential? This cannot be undone.")) return;
    setApiError("");
    setApiSuccess("");
    try {
      const response = await fetch(`/api/vault/delete/${id}`, {
        method: "DELETE",
        headers: { "x-vault-user": username }
      });
      if (!response.ok) throw new Error("Failed to delete item on backend host");
      
      setApiSuccess("Item destroyed.");
      setSelectedItem(null);
      fetchAllData();
    } catch (err: any) {
      setApiError(err.message || "Failed to delete item.");
    }
  };

  // Client-Side Zero-Knowledge Attachment Operations
  const [isEncryptingAttachment, setIsEncryptingAttachment] = useState(false);
  const [isDecryptingAttachmentId, setIsDecryptingAttachmentId] = useState<string | null>(null);

  const handleAddAttachment = async (file: File) => {
    if (!file) return;

    const MAX_MB = 4;
    if (file.size > MAX_MB * 1024 * 1024) {
      setApiError(`File size exceeds storage limits. Maximum size is ${MAX_MB}MB.`);
      return;
    }

    setIsEncryptingAttachment(true);
    setApiError("");
    setApiSuccess("");
    try {
      const reader = new FileReader();
      const arrayBufferPromise = new Promise<ArrayBuffer>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(new Error("File reading issue."));
        reader.readAsArrayBuffer(file);
      });

      const arrayBuffer = await arrayBufferPromise;
      const encryptedFile = await encryptFile(arrayBuffer, masterKey);

      const newAttachment = {
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        encryptedBlob: encryptedFile.ciphertext,
        iv: encryptedFile.iv
      };

      setFormAttachments(prev => [...prev, newAttachment]);
      setApiSuccess(`Successfully GCM-encrypted and attached "${file.name}"!`);
    } catch (err: any) {
      console.error(err);
      setApiError("Cryptographic file wrapper failure: " + err.message);
    } finally {
      setIsEncryptingAttachment(false);
    }
  };

  const handleDownloadAttachment = async (att: any) => {
    setIsDecryptingAttachmentId(att.id);
    setApiError("");
    setApiSuccess("");
    try {
      const decryptedBuffer = await decryptFile(att.encryptedBlob, att.iv, masterKey);
      const blob = new Blob([decryptedBuffer], { type: att.type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = att.name;
      link.click();
      setApiSuccess(`Decrypted and downloaded "${att.name}"!`);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      console.error(err);
      setApiError("Authentication key mismatch: attachment failed decapsulation.");
    } finally {
      setIsDecryptingAttachmentId(null);
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setFormAttachments(prev => prev.filter(att => att.id !== id));
  };

  // Backups and import triggers
  const handleCreateRawBackupOnServer = async () => {
    triggerReauth("Create server database backup snapshot", async () => {
      setApiError("");
      setApiSuccess("");
      try {
        const response = await fetch("/api/backups/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-vault-user": username
          },
          body: JSON.stringify({ type: "Manual" })
        });
        if (!response.ok) throw new Error("Server failed to write snapshot log.");
        
        setApiSuccess("Durable snapshot created on host filesystem.");
        fetchAllData();
      } catch (err: any) {
        setApiError(err.message || "Failed to write backup.");
      }
    });
  };

  // Export encrypted payload payload down as physical file
  const handleExportPhysicalFile = async () => {
    triggerReauth("Export vault credentials container", async () => {
      try {
        const vaultResp = await fetch("/api/vault", {
          headers: { "x-vault-user": username }
        });
        if (!vaultResp.ok) throw new Error("Unable to read snapshot databases.");
        const encryptedData = await vaultResp.json();

        const blob = new Blob([JSON.stringify(encryptedData, null, 2)], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `securevault_export_${username}.json`;
        link.click();
        
        setApiSuccess("Downloaded completely encrypted database (zero-knowledge payload).");
      } catch (err: any) {
        setApiError(err.message || "Export file write failure.");
      }
    });
  };

  // Import encrypted backup and restore
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerReauth("Restore vault entries from backup container", async () => {
      setApiError("");
      setApiSuccess("");
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const fileContent = event.target?.result as string;
          const parsedData = JSON.parse(fileContent);

          if (!Array.isArray(parsedData)) {
            throw new Error("Invalid file format. Backup must be a JSON array of encrypted vault items.");
          }

          // Test at least one decryp block check to avoid loading corrupt secrets
          if (parsedData.length > 0) {
            const testItem = parsedData[0];
            if (!testItem.encryptedBlob || !testItem.iv) {
              throw new Error("File contains invalid cipher structures.");
            }
          }

          const response = await fetch("/api/backups/restore", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-vault-user": username
            },
            body: JSON.stringify({ backupData: parsedData })
          });

          if (!response.ok) {
            const respData = await response.json();
            throw new Error(respData.error || "Failed to restore array indices.");
          }

          setApiSuccess(`Successfully imported and decrypted ${parsedData.length} records!`);
          fetchAllData();
        } catch (err: any) {
          setApiError(err.message || "Error reading uploaded backup container.");
        }
      };
      reader.readAsText(file);
    });
  };

  // Save Settings State onto server
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerReauth("Modify local security settings config", async () => {
      setApiError("");
      setApiSuccess("");
      try {
        const response = await fetch("/api/settings/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-vault-user": username
          },
          body: JSON.stringify(settings)
        });
        if (!response.ok) throw new Error("Failed validation settings storage.");
        
        // Save to local storage for AuthScreen access on login lockouts
        localStorage.setItem(`securevault_settings_${username.trim().toLowerCase()}`, JSON.stringify(settings));

        setApiSuccess("Local-first security rules applied.");
        fetchAllData();
      } catch (err: any) {
        setApiError(err.message || "Failed update setting.");
      }
    });
  };

  // Helper selectors
  const filteredItems = vaultItems.filter(item => {
    const matchesCategory = activeCategory === "All" || item.category === activeCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.url.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Security calculations
  const calculateAuditOverview = () => {
    let weakCount = 0;
    let reusedCount = 0;
    let duplicateMap: { [pwdHex: string]: number } = {};

    vaultItems.forEach(item => {
      if (item.password) {
        if (item.password.length < 12) weakCount++;
        duplicateMap[item.password] = (duplicateMap[item.password] || 0) + 1;
      }
    });

    Object.values(duplicateMap).forEach(count => {
      if (count > 1) reusedCount += count;
    });

    const safeCount = Math.max(0, vaultItems.length - weakCount);
    const healthPercent = vaultItems.length > 0 ? Math.round((safeCount / vaultItems.length) * 100) : 100;

    return {
      weakCount,
      reusedCount,
      healthPercent,
      totalCount: vaultItems.length
    };
  };

  const auditStats = calculateAuditOverview();

  return (
    <div className="h-screen overflow-hidden bg-[#0A0A0A] text-white font-sans flex flex-col antialiased">
      
      {/* Top Banner Control Rail */}
      <header className="bg-[#0C0C0C]/80 border-b border-white/10 px-6 py-4 flex flex-wrap gap-4 justify-between items-center sticky top-0 z-40 backdrop-blur-md shrink-0">
        
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#00D4AA]/10 border border-[#00D4AA]/20 flex items-center justify-center text-[#00D4AA]">
            <Shield size={16} className="stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 animate-fade-in">
              <h1 className="font-sans font-bold text-sm tracking-tight text-white">SecureVault Host</h1>
              <span className="text-[10px] font-mono bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded border border-green-500/20">● ONLINE</span>
            </div>
            <div className="text-[11px] text-zinc-500 font-mono text-left">
              Session cache: <span className="text-zinc-300 font-semibold">{username}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubView("docs")}
            className={`px-3 py-1.5 rounded-md text-xs transition-all flex items-center gap-1.5 border cursor-pointer ${
              activeSubView === "docs" 
                ? "bg-white/5 text-[#00D4AA] border-white/10" 
                : "text-zinc-400 border-transparent hover:text-white hover:bg-white/5"
            }`}
          >
            <BookOpen size={14} />
            <span className="hidden sm:inline">System Architecture & Docs</span>
          </button>

          <button
            onClick={onLock}
            className="p-2 bg-[#171717] hover:bg-red-500/10 rounded-md text-zinc-400 hover:text-red-400 border border-white/5 transition-all cursor-pointer"
            title="Lock Vault Sessions"
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Main Container Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row min-h-0 overflow-hidden">
        
        {/* Left Side navigation rail */}
        <aside className="w-full md:w-64 bg-[#0C0C0C] p-4 border-b md:border-b-0 md:border-r border-white/10 flex flex-col gap-6 text-left shrink-0 md:h-full md:overflow-y-auto">
          
          {/* Main sections */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold px-2 block mb-2">Vault Views</span>
            <button
              onClick={() => { setActiveSubView("vault"); setActiveCategory("All"); setSelectedItem(null); }}
              className={`w-full px-3 py-2 text-xs rounded-md transition-all flex items-center justify-between cursor-pointer ${
                activeSubView === "vault" && activeCategory !== "Secure Note"
                  ? "bg-white/5 text-[#00D4AA] font-semibold" 
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="flex items-center gap-2">
                <LayoutGrid size={13} />
                <span>Password Vault</span>
              </span>
              <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-zinc-500 font-mono">
                {vaultItems.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveSubView("vault"); setActiveCategory("Secure Note"); setSelectedItem(null); }}
              className={`w-full px-3 py-2 text-xs rounded-md transition-all flex items-center justify-between cursor-pointer ${
                activeSubView === "vault" && activeCategory === "Secure Note"
                  ? "bg-white/5 text-[#00D4AA] font-semibold" 
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="flex items-center gap-2">
                <FileText size={13} />
                <span>Secure Notes Vault</span>
              </span>
              <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-zinc-500 font-mono">
                {vaultItems.filter(item => item.category === "Secure Note").length}
              </span>
            </button>

            <button
              onClick={() => setActiveSubView("audit")}
              className={`w-full px-3 py-2 text-xs rounded-md transition-all flex items-center justify-between cursor-pointer ${
                activeSubView === "audit" 
                  ? "bg-white/5 text-[#00D4AA] font-semibold" 
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="flex items-center gap-2">
                <Shield size={13} />
                <span>Security Center</span>
              </span>
              {auditStats.weakCount > 0 && (
                <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono">
                  {auditStats.weakCount} Weak
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubView("backups")}
              className={`w-full px-3 py-2 text-xs rounded-md transition-all flex items-center justify-between cursor-pointer ${
                activeSubView === "backups" 
                  ? "bg-white/5 text-[#00D4AA] font-semibold" 
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="flex items-center gap-2">
                <Download size={13} />
                <span>Backup & Recovery</span>
              </span>
              <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-zinc-500 font-mono">
                {backups.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSubView("logs")}
              className={`w-full px-3 py-2 text-xs rounded-md transition-all flex items-center gap-2 cursor-pointer ${
                activeSubView === "logs" 
                  ? "bg-white/5 text-[#00D4AA] font-semibold" 
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Activity size={13} />
              <span>Activity History</span>
            </button>

            <button
              onClick={() => setActiveSubView("settings")}
              className={`w-full px-3 py-2 text-xs rounded-md transition-all flex items-center gap-2 cursor-pointer ${
                activeSubView === "settings" 
                  ? "bg-white/5 text-[#00D4AA] font-semibold" 
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Settings size={13} />
              <span>Security Settings</span>
            </button>
          </div>

          {/* Categories select menu */}
          {activeSubView === "vault" && (
            <div className="space-y-1 pt-4 border-t border-white/10">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold px-2 block mb-2">Categories</span>
              {["All", "Login", "Secure Note", "Credit Card", "Identity"].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`w-full text-left px-3 py-1.5 text-xs rounded-md transition-all flex items-center justify-between cursor-pointer ${
                    activeCategory === cat 
                      ? "bg-white/5 text-[#00D4AA] font-semibold" 
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>{cat}</span>
                  <span className="text-[10px] text-zinc-600 font-mono">
                    {cat === "All" 
                      ? vaultItems.length 
                      : vaultItems.filter(item => item.category === cat).length
                    }
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Quick status bar at bottom of menu */}
          <div className="mt-auto pt-4 border-t border-white/10 bg-[#0C0C0C] sticky bottom-0">
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5 flex flex-col align-left text-left">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#00D4AA] font-semibold uppercase tracking-wider">
                <Shield size={12} />
                <span>Vault Health</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-500">Security Index</span>
                <span className="font-mono text-zinc-200">{auditStats.healthPercent}%</span>
              </div>
              <div className="w-full bg-[#0A0A0A] h-1 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${auditStats.healthPercent >= 85 ? "bg-green-500" : "bg-amber-500"}`}
                  style={{ width: `${auditStats.healthPercent}%` }}
                />
              </div>
            </div>
          </div>
        </aside>

        {/* Central working panel */}
        <main className="flex-1 bg-[#0A0A0A] flex flex-col min-h-0 relative overflow-y-auto">
          
          {/* Global Alert Notification toasts */}
          {apiError && (
            <div className="m-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-500 flex items-start gap-2.5 shadow-lg relative z-20">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <div className="flex-1 align-left text-left">{apiError}</div>
              <button onClick={() => setApiError("")} className="text-neutral-500 hover:text-neutral-200 font-mono text-[10px] px-1">✕</button>
            </div>
          )}

          {apiSuccess && (
            <div className="m-4 bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-xs text-green-500 flex items-start gap-2.5 shadow-lg relative z-20">
              <Check size={15} className="shrink-0 mt-0.5 text-green-400" />
              <div className="flex-1 align-left text-left">{apiSuccess}</div>
              <button onClick={() => setApiSuccess("")} className="text-neutral-500 hover:text-neutral-200 font-mono text-[10px] px-1">✕</button>
            </div>
          )}

          {/* VIEW WORKSPACE ROADS */}
          {activeSubView === "docs" ? (
            <DocsLayout />
          ) : activeSubView === "vault" ? (
            
            /* SUBVIEW: VAULT INTERFACE */
            <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 min-h-0">
              
              {/* Left Column: Password List Grid (Col span 7) */}
              <div className="lg:col-span-7 border-b lg:border-b-0 lg:border-r border-white/10 p-4 flex flex-col gap-4 min-h-0">
                
                {/* Search / Add Actions bar */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                    <input
                      type="text"
                      placeholder={`Search credentials in ${activeCategory}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#171717] border border-white/5 pl-10 pr-4 py-2 rounded-md text-sm text-white placeholder-zinc-500 outline-none focus:border-[#00D4AA]/50 transition-colors"
                    />
                  </div>
                  <button
                    onClick={() => {
                      resetForm();
                      setIsEditing(false);
                      setIsAddingNew(true);
                      setSelectedItem(null);
                      if (activeCategory === "Secure Note") {
                        setFormCategory("Secure Note");
                      }
                    }}
                    className="px-4 py-2 bg-[#00D4AA] text-black font-semibold text-sm rounded-md hover:bg-[#00B894] transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Plus size={15} className="stroke-[2.5]" />
                    <span>New Entry</span>
                  </button>
                </div>

                {/* Subcategory Breadcrumb */}
                <div className="flex items-center justify-between text-zinc-400 text-xs px-1 border-b border-white/5 pb-2">
                  <span className="font-mono text-[10px] tracking-widest uppercase text-zinc-500 font-semibold">
                    Category: <span className="text-[#00D4AA] font-bold">{activeCategory}</span>
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    Showing {filteredItems.length} entries
                  </span>
                </div>

                {/* Main List Scroll Area */}
                <div className="flex-1 overflow-y-auto space-y-2 max-h-[60vh] lg:max-h-[70vh] pr-1">
                  
                  {isLoading && vaultItems.length === 0 ? (
                    <div className="py-20 text-center text-zinc-500 text-xs font-mono">
                      Decrypting zero-knowledge vault arrays...
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="py-20 text-center text-zinc-500 border border-white/10 border-dashed rounded-xl flex flex-col items-center justify-center p-6 gap-3">
                      <Lock size={24} className="text-zinc-700" />
                      <div className="text-xs">No vault credentials match search indexes.</div>
                    </div>
                  ) : (
                    filteredItems.map(item => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedItem(item);
                          setIsAddingNew(false);
                          setIsEditing(false);
                        }}
                        className={`p-3.5 rounded-lg border transition-all text-left cursor-pointer flex items-center justify-between gap-3 ${
                          selectedItem?.id === item.id
                            ? "bg-white/5 border-[#00D4AA]/40 shadow-sm"
                            : "bg-[#121212]/55 hover:bg-white/[0.03] border-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Domain visual initials */}
                          <div className="w-8 h-8 rounded bg-zinc-800 border border-white/5 flex items-center justify-center text-[#00D4AA] font-mono font-bold text-xs uppercase shrink-0">
                            {item.title.substring(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-white truncate flex items-center gap-1.5">
                              <span>{item.title}</span>
                              {item.isFavorite && <Heart size={10} className="fill-[#00D4AA] text-[#00D4AA]" />}
                            </div>
                            <div className="flex items-center space-x-1.5 text-[11px] text-zinc-400 font-mono mt-0.5 truncate">
                              <span>{item.username || "no username"}</span>
                              {item.url && (
                                <>
                                  <span className="text-zinc-700">•</span>
                                  <span className="text-zinc-500 truncate">{item.url}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-450 shrink-0">
                          <span className="bg-white/5 px-2 py-0.5 rounded text-[10px] border border-white/5">{item.category}</span>
                          <ChevronRight size={13} className="text-zinc-600" />
                        </div>
                      </div>
                    ))
                  )}

                </div>
              </div>

              {/* Right Column: Secure Details Panel / Form Overlay (Col span 5) */}
              <div className="lg:col-span-5 bg-[#0A0A0A] p-4 border-t lg:border-t-0 border-white/10 min-h-0 overflow-y-auto">
                
                {/* STATE A: Add / Edit Item Form */}
                {(isAddingNew || isEditing) ? (
                  <div className="space-y-4 text-left animate-fade-in bg-[#0C0C0C] border border-white/10 rounded-xl p-5">
                    <div className="flex justify-between items-center pb-2 border-b border-white/10">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#00D4AA]">
                        {isEditing ? `Edit Entry Spec` : `New Secure Credential`}
                      </h3>
                      <button
                        onClick={() => {
                          setIsAddingNew(false);
                          setIsEditing(false);
                          resetForm();
                        }}
                        className="text-zinc-500 hover:text-zinc-300 font-mono text-[11px] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <form onSubmit={handleSaveEntry} className="space-y-3.5 text-xs text-left">
                      {/* Title */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-zinc-500 font-mono uppercase tracking-wider block">Title *</label>
                        <input
                          type="text"
                          placeholder="My Personal Email"
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          className="w-full bg-[#171717] border border-white/5 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-650 outline-none focus:border-[#00D4AA]/50 transition-colors"
                          required
                        />
                      </div>

                      {/* Category & Favorite row */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-zinc-500 font-mono uppercase tracking-wider block">Category</label>
                          <select
                            value={formCategory}
                            onChange={(e) => setFormCategory(e.target.value)}
                            className="w-full bg-[#171717] border border-white/5 rounded-md px-2 py-2 text-sm text-white outline-none focus:border-[#00D4AA]/50 transition-colors"
                          >
                            <option value="Login">Login</option>
                            <option value="Secure Note">Secure Note</option>
                            <option value="Credit Card">Credit Card</option>
                            <option value="Identity">Identity</option>
                          </select>
                        </div>

                        <div className="flex items-end pb-2 pl-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={formIsFavorite}
                              onChange={(e) => setFormIsFavorite(e.target.checked)}
                              className="rounded accent-[#00D4AA] w-3.5 h-3.5 cursor-pointer"
                            />
                            <span className="text-xs text-zinc-400 font-semibold">Favorite Item</span>
                          </label>
                        </div>
                      </div>

                      {/* Username ID */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-zinc-500 font-mono uppercase tracking-wider block">Username / Key Identifier</label>
                        <input
                          type="text"
                          placeholder="alex_selfhost"
                          value={formUsername}
                          onChange={(e) => setFormUsername(e.target.value)}
                          className="w-full bg-[#171717] border border-white/5 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-650 outline-none focus:border-[#00D4AA]/50 transition-colors"
                        />
                      </div>

                      {/* Hidden Password */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-semibold text-zinc-500 font-mono uppercase tracking-wider block">Secure Password</label>
                          <button
                            type="button"
                            onClick={() => setShowFormGenerator(!showFormGenerator)}
                            className="text-[10px] text-[#00D4AA] flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <Sparkles size={11} />
                            <span>{showFormGenerator ? "Hide Generator" : "Secure Generator"}</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Type password..."
                          value={formPassword}
                          onChange={(e) => setFormPassword(e.target.value)}
                          className="w-full bg-[#171717] border border-white/5 rounded-md px-3 py-2 text-sm text-white font-mono placeholder-zinc-650 outline-none focus:border-[#00D4AA]/50 transition-colors"
                        />
                      </div>

                      {/* Generator popup drawer (embedded on request) */}
                      {showFormGenerator && (
                        <div className="border border-white/10 bg-[#121212] rounded-md p-3.5 shadow-inner my-1">
                          <span className="text-[9px] font-mono text-[#00D4AA] block mb-2 font-bold uppercase tracking-wider">Inline Generator Helper</span>
                          <PasswordGenerator 
                            inline 
                            onUsePassword={(generatedPwd) => {
                              setFormPassword(generatedPwd);
                              setShowFormGenerator(false);
                            }} 
                          />
                        </div>
                      )}

                      {/* URL / Resource Address */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-zinc-500 font-mono uppercase tracking-wider block">Website / IP address</label>
                        <input
                          type="text"
                          placeholder="e.g. 192.168.1.50 or accounts.google.com"
                          value={formUrl}
                          onChange={(e) => setFormUrl(e.target.value)}
                          className="w-full bg-[#171717] border border-white/5 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-650 outline-none focus:border-[#00D4AA]/50 transition-colors"
                        />
                      </div>

                      {/* Notes block */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-zinc-500 font-mono uppercase tracking-wider block">
                          {formCategory === "Secure Note" ? "Secure Private Notes" : "Description"}
                        </label>
                        <textarea
                          placeholder={formCategory === "Secure Note" ? "Add details, API keys, recovery strings..." : "Add standard descriptions, backup codes, or metadata details..."}
                          value={formNotes}
                          onChange={(e) => setFormNotes(e.target.value)}
                          className="w-full bg-[#171717] border border-white/5 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-650 outline-none focus:border-[#00D4AA]/50 transition-colors h-20 resize-none"
                        />
                      </div>

                      {/* Secure File Attachments Section */}
                      <div className="space-y-1.5 pt-1">
                        <label className="text-[10px] font-semibold text-zinc-500 font-mono uppercase tracking-wider block">
                          {formCategory === "Secure Note" ? "Secure Document & Key Attachments (Client-side GCM Encrypted)" : "Upload Backup Code"}
                        </label>
                        
                        {/* Drag and Drop Zone */}
                        <div 
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleAddAttachment(file);
                          }}
                          className="border border-dashed border-white/10 rounded-lg p-4 bg-black/40 hover:bg-black/60 hover:border-[#00D4AA]/30 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1"
                          onClick={() => document.getElementById("attachment-file-input")?.click()}
                        >
                          <input 
                            id="attachment-file-input"
                            type="file" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleAddAttachment(file);
                            }}
                          />
                          {isEncryptingAttachment ? (
                            <div className="flex items-center gap-2 text-[#00D4AA] font-mono text-[11px] py-1">
                              <RefreshCw size={14} className="animate-spin text-[#00D4AA]" />
                              <span>Wrapping file in AES-GCM-256...</span>
                            </div>
                          ) : (
                            <>
                              <Upload size={16} className="text-zinc-500 stroke-[2] mb-0.5" />
                              <span className="text-xs text-zinc-350">
                                Click or Drag & Drop file attachment
                              </span>
                              <span className="text-[9px] text-zinc-500 font-mono">
                                e.g. Private keys, text files, PDFs (Max 4MB)
                              </span>
                            </>
                          )}
                        </div>

                        {/* Uploaded attachments list */}
                        {formAttachments.length > 0 && (
                          <div className="space-y-1.5 pt-1.5">
                            {formAttachments.map(att => (
                              <div key={att.id} className="flex items-center justify-between p-2 bg-[#121212] border border-white/5 rounded-md text-xs">
                                <div className="flex items-center gap-2 truncate pr-2">
                                  <FileText size={13} className="text-[#00D4AA] shrink-0" />
                                  <div className="truncate text-left">
                                    <p className="text-zinc-200 font-mono text-[10px] truncate" title={att.name}>{att.name}</p>
                                    <p className="text-[9px] text-zinc-500 font-mono mt-0.5 font-light">{(att.size / 1024).toFixed(1)} KB • {att.type || "binary"}</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAttachment(att.id)}
                                  className="p-1 px-1.5 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded transition-all cursor-pointer"
                                  title="Remove attachment"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-zinc-500 font-mono uppercase tracking-wider block">Metadata Tags (comma separated)</label>
                        <input
                          type="text"
                          placeholder="personal, local-network, work"
                          value={formTags}
                          onChange={(e) => setFormTags(e.target.value)}
                          className="w-full bg-[#171717] border border-white/5 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-650 outline-none focus:border-[#00D4AA]/50 transition-colors"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-[#00D4AA] text-black font-semibold py-2 px-4 rounded-md text-sm hover:bg-[#00B894] transition-colors cursor-pointer shadow-sm disabled:opacity-50 mt-1"
                      >
                        {isLoading ? "Encrypting and syncing..." : isEditing ? "Save and Encrypt Record" : "Encrypt and Add Record"}
                      </button>
                    </form>
                  </div>
                ) : selectedItem ? (
                  
                  /* STATE B: View Credentials Profile Panel */
                  <div className="bg-[#0C0C0C] border border-white/10 rounded-xl p-5 text-left space-y-5 animate-fade-in shadow-xl">
                    
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center text-[#00D4AA] font-mono font-bold tracking-wider border border-white/5">
                          {selectedItem.title.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-white">{selectedItem.title}</h3>
                          <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded border border-white/5 font-mono text-zinc-500 block mt-1 w-max">{selectedItem.category}</span>
                        </div>
                      </div>
                      
                      {/* Heart trigger */}
                      <button
                        onClick={async () => {
                          try {
                            const encPayload = await encryptPayload({
                              title: selectedItem.title,
                              username: selectedItem.username,
                              password: selectedItem.password || "",
                              notes: selectedItem.notes || "",
                              tags: selectedItem.tags
                            }, masterKey);

                            await fetch("/api/vault/update", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json", "x-vault-user": username },
                              body: JSON.stringify({
                                id: selectedItem.id,
                                isFavorite: !selectedItem.isFavorite,
                                encryptedBlob: encPayload.ciphertext,
                                iv: encPayload.iv
                              })
                            });
                            fetchAllData();
                            setSelectedItem({ ...selectedItem, isFavorite: !selectedItem.isFavorite });
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="p-1 px-2 hover:bg-white/5 text-zinc-500 rounded hover:text-white flex items-center justify-between cursor-pointer"
                      >
                        <Heart className={selectedItem.isFavorite ? "fill-[#00D4AA] text-[#00D4AA]" : ""} size={14} />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Row 1: Username */}
                      <div className="bg-[#121212] p-3 rounded-md border border-white/5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-[9px] font-mono text-zinc-500 block uppercase font-semibold">Identifier / Username</span>
                          <span className="text-xs font-mono font-medium text-zinc-200 block truncate mt-0.5">{selectedItem.username || "—"}</span>
                        </div>
                        {selectedItem.username && (
                          <button
                            onClick={() => copyToClipboard(selectedItem.username, "Username")}
                            className="p-1.5 text-zinc-500 hover:text-[#00D4AA] rounded hover:bg-white/5 cursor-pointer"
                            title="Copy Username"
                          >
                            {copiedField === "Username" ? <Check size={13} className="text-[#00D4AA]" /> : <Copy size={13} />}
                          </button>
                        )}
                      </div>

                      {/* Row 2: Decrypted Password */}
                      <div className="bg-[#121212] p-3 rounded-md border border-white/5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-[9px] font-mono text-zinc-500 block uppercase font-semibold">Credentials / Passphrase</span>
                          <span className="text-xs font-mono font-medium text-white block mt-0.5 select-all font-bold tracking-wide">
                            {viewPasswordIds.includes(selectedItem.id) 
                              ? (selectedItem.password || "—") 
                              : "•••••••••••••••••"
                            }
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => togglePasswordVisibility(selectedItem.id)}
                            className="p-1.5 text-zinc-500 hover:text-zinc-200 rounded hover:bg-white/5 cursor-pointer"
                            title="Toggle Password Visibility"
                          >
                            {viewPasswordIds.includes(selectedItem.id) ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                          {selectedItem.password && (
                            <button
                              onClick={() => copyToClipboard(selectedItem.password || "", "Password", selectedItem.id)}
                              className="p-1.5 text-zinc-500 hover:text-[#00D4AA] cursor-pointer"
                              title="Copy Password"
                            >
                              {(copiedField === "Password" && copiedFeedbackId === selectedItem.id) 
                                ? <Check size={13} className="text-[#00D4AA]" /> 
                                : <Copy size={13} />
                              }
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Row 3: Website Address */}
                      <div className="bg-[#121212] p-3 rounded-md border border-white/5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-[9px] font-mono text-zinc-500 block uppercase font-semibold">Address / Url</span>
                          {selectedItem.url ? (
                            <a 
                              href={selectedItem.url.startsWith("http") ? selectedItem.url : `https://${selectedItem.url}`} 
                              target="_blank" 
                              referrerPolicy="no-referrer"
                              className="text-xs text-zinc-300 hover:text-[#00D4AA] font-mono hover:underline truncate block mt-0.5"
                            >
                              {selectedItem.url}
                            </a>
                          ) : (
                            <span className="text-xs text-zinc-500 font-mono italic block mt-0.5">—</span>
                          )}
                        </div>
                        {selectedItem.url && (
                          <button
                            onClick={() => copyToClipboard(selectedItem.url, "Url")}
                            className="p-1.5 text-zinc-500 hover:text-[#00D4AA] rounded hover:bg-white/5 cursor-pointer"
                            title="Copy Website"
                          >
                            {copiedField === "Url" ? <Check size={13} className="text-[#00D4AA]" /> : <Copy size={13} />}
                          </button>
                        )}
                      </div>

                      {/* Row 4: Notes */}
                      {selectedItem.notes && (
                        <div className="bg-[#121212] p-3 rounded-md border border-white/5 text-left align-left">
                          <span className="text-[9px] font-mono text-zinc-500 block uppercase mb-1 font-semibold">Encrypted Notepad Details</span>
                          <p className="text-zinc-300 text-xs font-light whitespace-pre-wrap leading-relaxed mt-1">
                            {selectedItem.notes}
                          </p>
                        </div>
                      )}

                      {/* Zero-Knowledge Encrypted Attachments Section */}
                      {selectedItem.attachments && selectedItem.attachments.length > 0 && (
                        <div className="bg-[#121212] p-3 rounded-md border border-white/5 text-left">
                          <span className="text-[9px] font-mono text-zinc-500 block uppercase mb-2 font-semibold">Zero-Knowledge Encrypted Files</span>
                          <div className="space-y-2">
                            {selectedItem.attachments.map(att => (
                              <div key={att.id} className="flex items-center justify-between p-2 bg-black/45 border border-white/5 rounded-md text-xs">
                                <div className="flex items-center gap-2 min-w-0 pr-1.5">
                                  <FileText size={14} className="text-[#00D4AA] shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-zinc-200 font-medium truncate font-mono text-[10.5px]" title={att.name}>{att.name}</p>
                                    <p className="text-[9px] text-zinc-500 font-mono mt-0.5">
                                      {(att.size / 1024).toFixed(1)} KB • {att.type || "binary"}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDownloadAttachment(att)}
                                  disabled={isDecryptingAttachmentId === att.id}
                                  className="px-2.5 py-1 text-[10px] font-mono bg-white/5 hover:bg-[#00D4AA]/10 hover:text-[#00D4AA] text-zinc-300 rounded border border-white/5 disabled:opacity-50 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                                >
                                  {isDecryptingAttachmentId === att.id ? (
                                    <RefreshCw size={10} className="animate-spin text-[#00D4AA]" />
                                  ) : (
                                    <Download size={10} />
                                  )}
                                  <span>Decrypt & Save</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {selectedItem.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1 align-left text-left">
                          {selectedItem.tags.map(tag => (
                            <span 
                              key={tag} 
                              className="text-[10px] font-mono bg-white/5 border border-white/5 text-[#00D4AA] px-2 py-0.5 rounded-md font-semibold"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-white/10 flex justify-between gap-2">
                      <button
                        onClick={() => handleEditClick(selectedItem)}
                        className="flex-1 py-1.5 rounded-md border border-white/10 hover:border-white/20 bg-white/5 text-zinc-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Edit3 size={13} />
                        Edit Item
                      </button>
                      <button
                        onClick={() => handleDeleteClick(selectedItem.id)}
                        className="py-1.5 px-3 rounded-md bg-transparent hover:bg-red-500/10 text-zinc-500 hover:text-red-400 text-xs flex items-center justify-center transition-all cursor-pointer border border-transparent hover:border-red-500/10"
                        title="Delete vault entry"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Cryptographic metadata telemetry strictly on view */}
                    <div className="pt-2 px-1 text-[9px] text-zinc-500 uppercase tracking-wider font-mono flex items-center justify-between">
                      <span>Sync updated: {new Date(selectedItem.updatedAt).toLocaleDateString()}</span>
                      <span className="text-[#00D4AA] font-bold">GCM-Verified Secure</span>
                    </div>

                  </div>
                ) : (
                  
                  /* STATE C: Empty Default Right Pane */
                  <div className="hidden lg:flex flex-col items-center justify-center h-full p-6 text-center border border-dashed border-white/10 rounded-xl gap-3">
                    <Shield size={28} className="text-zinc-700 stroke-[1.5]" />
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-400">Credentials Inspector</h4>
                      <p className="text-[11px] text-zinc-500 font-light mt-1 max-w-[200px] leading-relaxed mx-auto">
                        Select any entry from your local decrypt sequence list to inspect security credentials.
                      </p>
                    </div>
                  </div>
                )}

              </div>

            </div>
          ) : activeSubView === "audit" ? (
            
            /* SUBVIEW: SECURITY CENTER AUDITER */
            <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto text-left">
              <div>
                <h2 className="text-xl font-bold mb-1">Vault Security Center Audit</h2>
                <p className="text-zinc-400 text-xs font-light max-w-xl">
                  Decrypted password payloads are analyzed locally in browser memory. 
                  Audit telemetry triggers indicators for potential vulnerability breaches without exporting secrets.
                </p>
              </div>

              {/* Stats Overview card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#0C0C0C] p-4 rounded-xl border border-white/10 text-left space-y-1">
                  <span className="text-[10px] font-semibold text-zinc-500 font-mono uppercase tracking-wider">Overall Security Score</span>
                  <div className="flex items-baseline gap-1.5 py-1">
                    <span className="text-2xl font-bold text-white font-mono">{auditStats.healthPercent}%</span>
                    <span className="text-[10px] text-zinc-500">Vault Health</span>
                  </div>
                  <div className="w-full bg-[#0A0A0A] h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full ${auditStats.healthPercent >= 80 ? "bg-green-500" : "bg-amber-500"}`} style={{ width: `${auditStats.healthPercent}%` }}></div>
                  </div>
                </div>

                <div className="bg-[#0C0C0C] p-4 rounded-xl border border-white/10 text-left space-y-1">
                  <span className="text-[10px] font-semibold text-zinc-500 font-mono uppercase tracking-wider">Weak Passwords</span>
                  <div className="flex items-baseline gap-1.5 py-1">
                    <span className={`text-2xl font-bold font-mono ${auditStats.weakCount > 0 ? "text-red-500" : "text-zinc-400"}`}>{auditStats.weakCount}</span>
                    <span className="text-[10px] text-zinc-500">Length &lt; 12 chars</span>
                  </div>
                </div>

                <div className="bg-[#0C0C0C] p-4 rounded-xl border border-white/10 text-left space-y-1">
                  <span className="text-[10px] font-semibold text-zinc-500 font-mono uppercase tracking-wider">Duplicate/Reused Keys</span>
                  <div className="flex items-baseline gap-1.5 py-1">
                    <span className={`text-2xl font-bold font-mono ${auditStats.reusedCount > 0 ? "text-red-500" : "text-zinc-400"}`}>{auditStats.reusedCount}</span>
                    <span className="text-[10px] text-zinc-500">Shared Secrets</span>
                  </div>
                </div>
              </div>

              {/* Password Generator tool built-in directly to the audit center! */}
              <div className="pt-2">
                <div className="bg-[#0C0C0C] border border-white/10 rounded-xl p-5 shadow-lg">
                  <span className="text-xs font-semibold text-[#00D4AA] block mb-3 uppercase tracking-wider">Quick Password Generator</span>
                  <PasswordGenerator inline />
                </div>
              </div>

              {/* Detailed Flagged items list */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Vulnerability Audit Reports</h3>
                
                {vaultItems.filter(item => (item.password && (item.password.length < 12 || vaultItems.filter(oth => oth.password === item.password).length > 1))).length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-500 border border-white/10 border-dashed rounded-xl">
                    ✓ Clean Audit: All active credential entries are strong and unique.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {vaultItems.map(item => {
                      const isWeak = item.password && item.password.length < 12;
                      const duplicateCount = vaultItems.filter(oth => item.password && oth.password === item.password).length;
                      if (!isWeak && duplicateCount <= 1) return null;

                      return (
                        <div key={item.id} className="bg-[#0C0C0C] p-4 rounded-xl border border-white/10 flex flex-wrap gap-4 items-center justify-between">
                          <div className="text-left space-y-1">
                            <h4 className="text-xs font-semibold text-white">{item.title}</h4>
                            <span className="text-[10px] font-mono text-zinc-500 block">Identifier: <span className="text-zinc-300">{item.username}</span></span>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 text-[10px]">
                            {isWeak && (
                              <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2.5 py-1 rounded font-mono font-semibold">
                                WEAK PASSWORD (Length: {item.password?.length} chars)
                              </span>
                            )}
                            {duplicateCount > 1 && (
                              <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-1 rounded font-mono font-semibold">
                                PASSWORD REUSED ON {duplicateCount} SITES
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : activeSubView === "backups" ? (
            
            /* SUBVIEW: BACKUPS SYSTEM */
            <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto text-left whitespace-normal">
              <div>
                <h2 className="text-xl font-bold mb-1">Local-First Backups & Self-Recovery</h2>
                <p className="text-zinc-400 text-xs font-light max-w-xl">
                  Configure automatic snapshots stored on your local disk mount or immediately download 
                  completely client-encrypted offline backup containers for full self-recovery.
                </p>
              </div>

              {/* Action grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Panel 1: Snapshot creation */}
                <div className="bg-[#0C0C0C] p-5 rounded-xl border border-white/10 text-left space-y-3 shadow-lg">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-[#00D4AA]" />
                    Host Server Database Backups
                  </h3>
                  <p className="text-xs text-zinc-400 font-light leading-relaxed">
                    Triggers a manual snapshot file write to the master self-hosted databases storage folder. 
                    Retention limits strictly enforce max 30 snapshots capacity logs.
                  </p>
                  <button
                    onClick={handleCreateRawBackupOnServer}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-xs font-semibold text-white transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} className="text-[#00D4AA]" />
                    Write Filesystem snapshot
                  </button>
                </div>

                {/* Panel 2: Offline file export */}
                <div className="bg-[#0C0C0C] p-5 rounded-xl border border-white/10 text-left space-y-3 shadow-lg">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Download size={16} className="text-[#00D4AA]" />
                    Export Local Zero-Knowledge Container (JSON File)
                  </h3>
                  <p className="text-xs text-zinc-400 font-light leading-relaxed">
                    Downloads all database files to your local device. 
                    Because the structures are fully client-encrypted, 
                    this export container contains zero plaintext values and is safe for storage.
                  </p>
                  
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={handleExportPhysicalFile}
                      className="px-4 py-2 bg-[#00D4AA] hover:bg-[#00B894] text-black text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer shadow-sm animate-fade-in"
                    >
                      <Download size={14} />
                      Export Encrypted JSON
                    </button>

                    <label className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer">
                      <Upload size={14} className="text-[#00D4AA]" />
                      Import Encrypted JSON
                      <input 
                        type="file" 
                        accept=".json" 
                        onChange={handleImportFile} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>

              </div>

              {/* Table list backups */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Filesystem Snapshot History</h3>
                {backups.length === 0 ? (
                  <div className="p-10 border border-dashed border-white/10 rounded-xl text-center text-xs text-zinc-500">
                    No system snapshot logs found on host storage disk.
                  </div>
                ) : (
                  <div className="bg-[#0C0C0C] rounded-xl border border-white/10 overflow-hidden text-xs shadow-lg">
                    <div className="grid grid-cols-12 bg-white/5 p-3 font-mono text-zinc-400 border-b border-white/5 font-semibold">
                      <div className="col-span-6">SNAPSHOT LONG NAME</div>
                      <div className="col-span-3 text-right">SNAPSHOT SIZE</div>
                      <div className="col-span-3 text-right">CREATION DATE</div>
                    </div>
                    <div className="divide-y divide-white/5">
                      {backups.slice(0).reverse().map(b => (
                        <div key={b.id} className="grid grid-cols-12 p-3 text-zinc-350 hover:bg-white/[0.02]">
                          <div className="col-span-6 font-mono text-[11px] truncate flex items-center gap-1.5 text-zinc-300">
                            <FileText size={12} className="text-zinc-500 flex-shrink-0" />
                            <span>{b.filename}</span>
                          </div>
                          <div className="col-span-3 text-right font-mono text-[11px] text-zinc-400">{b.size}</div>
                          <div className="col-span-3 text-right font-mono text-[11px] text-zinc-500">{new Date(b.createdAt).toLocaleDateString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeSubView === "logs" ? (
            
            /* SUBVIEW: ACTIVITY LOGS */
            <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto text-left">
              <div>
                <h2 className="text-xl font-bold mb-1">Host Server Secure Activity Logs</h2>
                <p className="text-zinc-400 text-xs font-light max-w-xl">
                  Audits all cryptographic, database transactions, 
                  and user session interactions recorded on the hosting server.
                </p>
              </div>

              {logs.length === 0 ? (
                <div className="p-20 text-center text-zinc-500 border border-dashed border-white/10 rounded-xl">
                  Waiting on telemetry activity recordings...
                </div>
              ) : (
                <div className="bg-[#0C0C0C] border border-white/10 rounded-xl overflow-hidden font-mono text-xs shadow-lg">
                  <div className="grid grid-cols-12 bg-white/5 p-3 text-zinc-400 font-bold border-b border-white/5">
                    <div className="col-span-4 pl-2 font-mono">ACTION SPECIES</div>
                    <div className="col-span-3 font-mono">IP ADDRESS</div>
                    <div className="col-span-3 font-mono text-right">TIMESTAMP</div>
                    <div className="col-span-2 font-mono text-right font-bold">STATUS</div>
                  </div>
                  <div className="divide-y divide-white/5 opacity-90">
                    {logs.map(log => (
                      <div key={log.id} className="grid grid-cols-12 p-3 text-zinc-300 hover:bg-white/[0.02] items-center">
                        <div className="col-span-4 pl-2 font-semibold text-zinc-200 truncate flex items-center gap-2">
                          <Activity size={12} className="text-zinc-500" />
                          <span>{log.action}</span>
                        </div>
                        <div className="col-span-3 text-zinc-400 truncate">{log.ipAddress}</div>
                        <div className="col-span-3 text-right text-zinc-550">{new Date(log.timestamp).toLocaleTimeString()}</div>
                        <div className="col-span-2 text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            log.status === "Success" 
                              ? "bg-green-500/10 text-green-400 border-green-500/20" 
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          }`}>
                            {log.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            
            /* SUBVIEW: USER SETTINGS */
            <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto text-left animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
                <div>
                  <h2 className="text-xl font-bold mb-1 font-sans tracking-tight text-white flex items-center gap-2">
                    <Settings className="text-[#00D4AA] shrink-0" size={22} />
                    Centralized Security Settings
                  </h2>
                  <p className="text-zinc-400 text-xs font-light">
                    Enforce critical system-wide security policies, browser memory controls, and physical threat containment guards.
                  </p>
                </div>
                
                {/* Panic lock action right in top header for quick accessibility */}
                <button
                  type="button"
                  onClick={triggerPanicLock}
                  className="px-4 py-2 bg-red-955/40 hover:bg-red-900/50 border border-red-500/30 text-red-200 text-xs font-semibold rounded-md flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                >
                  <ShieldAlert size={14} className="text-red-400 animate-pulse" />
                  Trigger Panic Lock
                  <kbd className="bg-red-900/20 px-1.5 py-0.5 text-[9px] text-red-300 font-mono rounded">Ctrl+Shift+L</kbd>
                </button>
              </div>

              {/* Grid 2-columns settings form */}
              <form onSubmit={handleSaveSettings} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  
                  {/* Card 1: Session Security */}
                  <div className="bg-[#0C0C0C] border border-white/10 rounded-xl p-5 space-y-4 shadow-lg min-h-[220px] flex flex-col justify-between">
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                        <Sliders size={16} className="text-[#00D4AA]" />
                        Session Security Policies
                      </h3>
                      
                      {/* Timeout Dropdown */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-zinc-400 font-mono uppercase tracking-wider block">
                          Automatic Session Timeout lock
                        </label>
                        <p className="text-zinc-500 text-[10px] font-light leading-relaxed">
                          Automatically seals decryption keys and logs out when your browser session becomes idle.
                        </p>
                        <select
                          value={settings.autoLockTime}
                          onChange={(e) => setSettings({ ...settings, autoLockTime: Number(e.target.value) })}
                          className="w-full bg-[#171717] border border-white/5 rounded-md px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-[#00D4AA]/50 transition-colors font-mono cursor-pointer"
                        >
                          <option value="5">5 Minutes (Maximum Policy)</option>
                          <option value="15">15 Minutes (Default Policy)</option>
                          <option value="30">30 Minutes</option>
                          <option value="60">1 Hour (Lenient Policy)</option>
                          <option value="0">Never Lock (High Vulnerability Warning)</option>
                        </select>
                        {settings.autoLockTime === 0 && (
                          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-2 text-[10px] text-yellow-400 font-light flex items-start gap-1.5 animate-fade-in mt-1">
                            <AlertCircle size={12} className="shrink-0 mt-0.5" />
                            <span>Warning: Disabling automatic lock exposes your plaintext keys if the device is left physically unattended.</span>
                          </div>
                        )}
                      </div>

                      {/* Reauthentication Policy Toggle */}
                      <div className="pt-3 border-t border-white/5">
                        <label className="flex items-start gap-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={settings.requirePasswordOnAction}
                            onChange={(e) => setSettings({ ...settings, requirePasswordOnAction: e.target.checked })}
                            className="rounded accent-[#00D4AA] w-4 h-4 mt-0.5 shrink-0 cursor-pointer"
                          />
                          <div>
                            <span className="text-xs font-semibold text-white block">Require Password Reauthentication</span>
                            <p className="text-[10px] text-zinc-500 leading-relaxed font-light mt-0.5">
                              Re-verify master password before sensitive operations (viewing passwords, JSON export, altering back-ups).
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Clipboard Security */}
                  <div className="bg-[#0C0C0C] border border-white/10 rounded-xl p-5 space-y-4 shadow-lg min-h-[220px] flex flex-col justify-between">
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                        <Copy size={16} className="text-[#00D4AA]" />
                        Clipboard Leakage Safeguards
                      </h3>
                      
                      {/* Auto Clear Clipboard Dropdown */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-zinc-400 font-mono uppercase tracking-wider block">
                          Auto Clear Clipboard Delay
                        </label>
                        <p className="text-zinc-500 text-[10px] font-light leading-relaxed">
                          Purges credential characters copied into your memory clipboard after usage.
                        </p>
                        <select
                          value={settings.autoClearClipboardTime}
                          onChange={(e) => setSettings({ ...settings, autoClearClipboardTime: Number(e.target.value) })}
                          className="w-full bg-[#171717] border border-white/5 rounded-md px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-[#00D4AA]/50 transition-colors font-mono cursor-pointer"
                        >
                          <option value="15">15 Seconds (Aggressive Control)</option>
                          <option value="30">30 Seconds (Recommended)</option>
                          <option value="60">1 Minute</option>
                          <option value="300">5 Minutes</option>
                          <option value="0">Never Clear Clipboard (Vulnerable)</option>
                        </select>
                      </div>

                      {/* Require Verification Before Copy */}
                      <div className="pt-3 border-t border-white/5">
                        <label className="flex items-start gap-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={settings.requirePasswordOnCopy}
                            onChange={(e) => setSettings({ ...settings, requirePasswordOnCopy: e.target.checked })}
                            className="rounded accent-[#00D4AA] w-4 h-4 mt-0.5 shrink-0 cursor-pointer"
                          />
                          <div>
                            <span className="text-xs font-semibold text-white block">Require Copy Verification Check</span>
                            <p className="text-[10px] text-zinc-500 leading-relaxed font-light mt-0.5">
                              Triggers a master password reauthentication prompt before any password element is exported to clipboard.
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Authentication Security & 2FA */}
                  <div className="bg-[#0C0C0C] border border-white/10 rounded-xl p-5 shadow-lg relative overflow-hidden md:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                          <KeyRound size={16} className="text-[#00D4AA]" />
                          MFA & Access Authentication
                        </h3>

                        {/* Enable 2FA toggle */}
                        <div className="space-y-2">
                          <label className="flex items-start gap-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={settings.twoFactorEnabled}
                              onChange={(e) => setSettings({ ...settings, twoFactorEnabled: e.target.checked })}
                              className="rounded accent-[#00D4AA] w-4 h-4 mt-0.5 shrink-0 cursor-pointer"
                            />
                            <div>
                              <span className="text-xs font-semibold text-white block">Enable Two-Factor Authentication (OTP)</span>
                              <p className="text-[10px] text-zinc-550 leading-relaxed font-light mt-0.5">
                                Enforce standard TOTP Authenticator apps during account lock sequence validations.
                              </p>
                            </div>
                          </label>
                        </div>

                        {/* Maximum failed unlock attempts */}
                        <div className="space-y-1.5 pt-3 border-t border-white/5">
                          <label className="text-[10px] font-semibold text-zinc-400 font-mono uppercase tracking-wider block">
                            Maximum Failed Unlock Attempts
                          </label>
                          <p className="text-zinc-500 text-[10px] font-light leading-relaxed">
                            Locks access to this database for 5 minutes when consecutive login password faults occur.
                          </p>
                          <select
                            value={settings.maxFailedAttempts}
                            onChange={(e) => setSettings({ ...settings, maxFailedAttempts: Number(e.target.value) })}
                            className="w-full bg-[#171717] border border-white/5 rounded-md px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-[#00D4AA]/50 transition-colors font-mono cursor-pointer"
                          >
                            <option value="5">5 Failed Attempts (Default Recommended)</option>
                            <option value="10">10 Failed Attempts (Low Security)</option>
                            <option value="0">Unlimited Attempts (Vulnerable to bypass)</option>
                          </select>
                        </div>
                      </div>

                      {/* Interactive 2FA Details Setup (Simulated setup keys if 2FA enabled) */}
                      <div>
                        {settings.twoFactorEnabled ? (
                          <div className="bg-[#121212] border border-white/5 rounded-xl p-4 space-y-3 text-xs animate-fade-in h-full flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                                <span className="text-[10px] font-semibold text-[#00D4AA] tracking-wider uppercase font-mono">TOTP Secret Activated</span>
                                <span className="px-1.5 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded text-[9px] font-bold font-mono">ENROLLED</span>
                              </div>
                              
                              <div className="space-y-1">
                                <p className="text-zinc-400 text-[10px] font-light leading-relaxed">
                                  Scan this setup secret inside Google Authenticator or secondary OTP utilities:
                                </p>
                                <div className="bg-black/40 border border-white/10 p-2 text-center rounded font-mono text-zinc-300 text-[11px] flex items-center justify-between gap-1 mt-1">
                                  <span>SV-JBSW-Y3DP-EHPK-3PXP</span>
                                  <button
                                    type="button"
                                    onClick={() => performCopy("SV-JBSW-Y3DP-EHPK-3PXP", "TOTP Secret")}
                                    className="text-zinc-400 hover:text-[#00D4AA] transition-colors cursor-pointer"
                                    title="Copy Secret"
                                  >
                                    <Copy size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1 pt-2 border-t border-white/5">
                              <p className="text-zinc-400 text-[10px] font-semibold">Active Backup Recovery Codes:</p>
                              <div className="grid grid-cols-2 gap-1.5 font-mono text-[9px] text-[#00D4AA]/90 pl-1">
                                <span>• SV-4820-1928</span>
                                <span>• SV-9281-2948</span>
                                <span>• SV-8831-1120</span>
                                <span>• SV-4921-9922</span>
                              </div>
                              <p className="text-[9px] text-zinc-500 font-light mt-1">If standard OTP fails, save/provide these single-use recovery parameters.</p>
                            </div>
                          </div>
                        ) : (
                          <div className="border border-dashed border-white/10 rounded-xl p-6 text-center h-full flex flex-col items-center justify-center text-zinc-500 space-y-2 min-h-[160px]">
                            <KeyRound size={24} className="text-zinc-650 animate-pulse text-[#00D4AA]/30" />
                            <div>
                              <p className="text-xs font-semibold text-zinc-400">Two-Factor Authentication Inactive</p>
                              <p className="text-[10px] text-zinc-500 max-w-[200px] mx-auto mt-0.5">Toggle standard verification to enroll authenticator cryptographic key tokens.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Vault Protection */}
                  <div className="bg-[#0C0C0C] border border-white/10 rounded-xl p-5 space-y-4 shadow-lg min-h-[220px] flex flex-col justify-between">
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                        <Lock size={16} className="text-red-400" />
                        Physical Vault Protection
                      </h3>
                      
                      {/* Lock on Browser close */}
                      <div className="space-y-2">
                        <label className="flex items-start gap-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={settings.lockOnBrowserClose}
                            onChange={(e) => setSettings({ ...settings, lockOnBrowserClose: e.target.checked })}
                            className="rounded accent-[#00D4AA] w-4 h-4 mt-0.5 shrink-0 cursor-pointer"
                          />
                          <div>
                            <span className="text-xs font-semibold text-white block">Lock Vault on Window Close</span>
                            <p className="text-[10px] text-zinc-500 leading-relaxed font-light mt-0.5">
                              Automatically locks the vault and purges active session storage indicators whenever the browser tab triggers unloading states.
                            </p>
                          </div>
                        </label>
                      </div>

                      {/* Panic action indicator */}
                      <div className="pt-3 border-t border-white/5 space-y-2">
                        <span className="text-xs font-semibold text-red-400 block">Emergency Panic Disarm</span>
                        <p className="text-[10px] text-zinc-500 leading-relaxed font-light">
                          Instantly locks the vault, clears your clipboard history, and purges all active key verifiers. Use in cases of immediate host device vulnerability.
                        </p>
                        <button
                          type="button"
                          onClick={triggerPanicLock}
                          className="w-full bg-red-955/20 hover:bg-red-950/40 border border-red-500/20 text-red-200 hover:text-white font-semibold py-1.5 rounded-md transition-all cursor-pointer text-xs"
                        >
                          Engage Immediate Emergency Lockout
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card 5: Device Trust Management */}
                  <div className="bg-[#0C0C0C] border border-white/10 rounded-xl p-5 space-y-4 shadow-lg min-h-[220px] flex flex-col justify-between">
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                        <Smartphone size={16} className="text-[#00D4AA]" />
                        Device Trust Management
                      </h3>
                      
                      {/* Remember Trusted Device */}
                      <div className="space-y-2">
                        <label className="flex items-start gap-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={settings.rememberTrustedDevice}
                            onChange={(e) => setSettings({ ...settings, rememberTrustedDevice: e.target.checked })}
                            className="rounded accent-[#00D4AA] w-4 h-4 mt-0.5 shrink-0 cursor-pointer"
                          />
                          <div>
                            <span className="text-xs font-semibold text-white block">Trust This Device Container</span>
                            <p className="text-[10px] text-zinc-500 leading-relaxed font-light mt-0.5">
                              Authorizes persistent device storage configuration, bypassing multi-factor prompts for consecutive logins.
                            </p>
                          </div>
                        </label>
                      </div>

                      {/* Trusted Devices list */}
                      <div className="space-y-2 pt-3 border-t border-white/5">
                        <span className="text-[10px] font-semibold text-zinc-400 font-mono uppercase tracking-wider block">Authorized Device Logbook</span>
                        <div className="space-y-2 text-[10px] max-h-[140px] overflow-y-auto pr-1">
                          {trustedDevices.map(dev => (
                            <div key={dev.id} className="flex items-center justify-between gap-2 p-2 bg-white/5 border border-white/5 rounded-lg animate-fade-in">
                              <div className="flex items-center gap-2.5 min-w-0">
                                {dev.type === "desktop" ? (
                                  <Laptop size={14} className="text-[#00D4AA] shrink-0" />
                                ) : (
                                  <Smartphone size={14} className="text-[#00D4AA] shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-[11px] font-medium text-white truncate">{dev.name}</p>
                                  <p className="text-[9px] text-zinc-500 font-mono">{dev.lastActive}</p>
                                </div>
                              </div>
                              
                              {!dev.isCurrent ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTrustedDevices(prev => {
                                      const filtered = prev.filter(d => d.id !== dev.id);
                                      const storedTrustedKey = `securevault_trusted_devices_${username.trim().toLowerCase()}`;
                                      const toSave = filtered.filter(d => !d.isCurrent);
                                      localStorage.setItem(storedTrustedKey, JSON.stringify(toSave));
                                      return filtered;
                                    });
                                    setApiSuccess(`Successfully revoked trust authorization for: "${dev.name}"`);
                                    setTimeout(() => setApiSuccess(""), 4000);
                                  }}
                                  className="px-2 py-1 bg-red-955/20 hover:bg-red-950/40 border border-red-500/20 text-red-300 rounded text-[9px] font-semibold transition-all cursor-pointer"
                                >
                                  Revoke
                                </button>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-[#00D4AA]/10 border border-[#00D4AA]/20 text-[#00D4AA] rounded text-[8px] font-semibold font-mono uppercase shrink-0">Current</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 6: Security Summary & Submit */}
                  <div className="bg-[#0C0C0C] border border-[#00D4AA]/20 rounded-xl p-5 shadow-lg relative overflow-hidden md:col-span-2 space-y-4">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
                      <Shield size={120} className="text-[#00D4AA]" />
                    </div>
                    
                    <div className="space-y-2 text-zinc-300 text-xs">
                      <span className="text-[10px] font-bold text-[#00D4AA] tracking-wider uppercase font-mono block">Zero-Knowledge Summary State</span>
                      <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
                        All preference changes are signed and fully written into the self-hosted database files client-side. The Express backend receives verification keys and lock configuration hashes without gaining any knowledge of your physical master secrets.
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-[10px]">
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-zinc-500">
                        <span>• AUTO-LOCK: <strong className="text-[#00D4AA]">{settings.autoLockTime === 0 ? "DISABLED" : `${settings.autoLockTime} MINS`}</strong></span>
                        <span>• RE-AUTH: <strong className="text-[#00D4AA]">{settings.requirePasswordOnAction ? "ENABLED" : "DISABLED"}</strong></span>
                        <span>• CLIPBOARD CLEAR: <strong className="text-[#00D4AA]">{settings.autoClearClipboardTime === 0 ? "OFF" : `${settings.autoClearClipboardTime}s`}</strong></span>
                        <span>• FAILED LIMIT: <strong className="text-[#00D4AA]">{settings.maxFailedAttempts === 0 ? "UNLIMITED" : `${settings.maxFailedAttempts} ATTEMPTS`}</strong></span>
                      </div>

                      <button
                        type="submit"
                        className="w-full sm:w-auto px-6 py-2 bg-[#00D4AA] hover:bg-[#00B894] text-black font-semibold text-xs rounded-md transition-all cursor-pointer shadow-sm hover:scale-[1.01] active:scale-[0.99] text-center"
                      >
                        Save Configuration Rules
                      </button>
                    </div>
                  </div>

                </div>
              </form>

            </div>
          )}

        </main>
      </div>

      {/* Zero-Knowledge Password Reauthentication Overlay */}
      {reauthModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4 font-sans animate-fade-in">
          <div className="bg-[#0C0C0C] border border-white/10 p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl relative text-left">
            <div className="absolute top-4 right-4">
              <button
                type="button"
                onClick={() => setReauthModal(prev => ({ ...prev, isOpen: false }))}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-lg bg-[#00D4AA]/10 flex items-center justify-center text-[#00D4AA]">
                <Lock size={16} />
              </div>
              <h3 className="text-sm font-semibold text-white">Reauthentication Required</h3>
              <p className="text-zinc-400 text-[11px] font-light leading-relaxed">
                For security enforcement, verify your master passphrase to authorize: 
                <strong className="text-white block mt-1 font-mono">{reauthModal.reason}</strong>
              </p>
            </div>

            <form onSubmit={handleReauthSubmit} className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-[9px] font-mono font-semibold text-zinc-500 uppercase tracking-wider block">Master Passphrase</label>
                <input
                  type="password"
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                  className="w-full bg-[#171717] border border-white/5 rounded-md px-3 py-2 text-xs text-white placeholder-zinc-700 outline-none focus:border-[#00D4AA]/50 transition-colors"
                  placeholder="••••••••••••••••"
                  autoFocus
                />
              </div>

              {reauthError && (
                <div className="text-[10px] text-red-400 font-light flex items-center gap-1.5 leading-relaxed">
                  <AlertCircle size={10} className="shrink-0 mt-0.5" />
                  <span>{reauthError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isReauthing}
                className="w-full bg-[#00D4AA] disabled:bg-zinc-700 disabled:text-zinc-400 text-black font-semibold py-2 rounded-md hover:bg-[#00B894] transition-colors cursor-pointer text-xs md:text-sm shadow"
              >
                {isReauthing ? "Validating key proof..." : "Authorize and Proceed"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
