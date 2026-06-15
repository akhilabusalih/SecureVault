import React, { useState } from "react";
import { 
  FileText, Database, Shield, FolderGit2, BookOpen, Terminal, 
  Layers, KeyRound, Server, ArrowRight, CheckCircle2, AlertTriangle, Cpu 
} from "lucide-react";

export default function DocsLayout() {
  const [activeTab, setActiveTab] = useState<"architecture" | "database" | "structure" | "hosting" | "roadmap">("architecture");

  return (
    <div className="w-full min-h-screen bg-[#0A0A0A] text-[#FFFFFF] font-sans border-t border-neutral-900">
      <div className="max-w-7xl mx-auto px-4 py-8 md:px-8">
        
        {/* Header Block */}
        <div className="mb-10 text-left border-b border-neutral-900 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00D4AA]/10 text-[#00D4AA] rounded-full text-xs font-mono mb-4 border border-[#00D4AA]/20">
            <Shield size={12} />
            ARCHITECTURAL DOCUMENTATION PORTAL
          </div>
          <h1 className="text-4xl font-sans font-bold tracking-tight mb-3">
            SecureVault Architecture Specifications
          </h1>
          <p className="text-base text-neutral-400 max-w-3xl font-light">
            In-depth engineering manual, security review, cryptographic workflows, databases schemas, 
            RESTful API specification, and deployment blueprints for SecureVault local-first password manager.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1 space-y-1.5">
            <button
              onClick={() => setActiveTab("architecture")}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 border ${
                activeTab === "architecture"
                  ? "bg-[#171717]/85 border-[#00D4AA]/30 text-[#00D4AA] font-medium shadow-md shadow-[#00D4AA]/5"
                  : "bg-transparent border-transparent hover:bg-[#121212] hover:border-neutral-900 text-neutral-400"
              }`}
            >
              <Layers size={18} />
              <span>1. Architecture & Flows</span>
            </button>
            <button
              onClick={() => setActiveTab("database")}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 border ${
                activeTab === "database"
                  ? "bg-[#171717]/85 border-[#00D4AA]/30 text-[#00D4AA] font-medium shadow-md shadow-[#00D4AA]/5"
                  : "bg-transparent border-transparent hover:bg-[#121212] hover:border-neutral-900 text-neutral-400"
              }`}
            >
              <Database size={18} />
              <span>2. Database & API Spec</span>
            </button>
            <button
              onClick={() => setActiveTab("structure")}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 border ${
                activeTab === "structure"
                  ? "bg-[#171717]/85 border-[#00D4AA]/30 text-[#00D4AA] font-medium shadow-md shadow-[#00D4AA]/5"
                  : "bg-transparent border-transparent hover:bg-[#121212] hover:border-neutral-900 text-neutral-400"
              }`}
            >
              <FolderGit2 size={18} />
              <span>3. Target Folder Map</span>
            </button>
            <button
              onClick={() => setActiveTab("hosting")}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 border ${
                activeTab === "hosting"
                  ? "bg-[#171717]/85 border-[#00D4AA]/30 text-[#00D4AA] font-medium shadow-md shadow-[#00D4AA]/5"
                  : "bg-transparent border-transparent hover:bg-[#121212] hover:border-neutral-900 text-neutral-400"
              }`}
            >
              <Terminal size={18} />
              <span>4. Deployment Manual</span>
            </button>
            <button
              onClick={() => setActiveTab("roadmap")}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 border ${
                activeTab === "roadmap"
                  ? "bg-[#171717]/85 border-[#00D4AA]/30 text-[#00D4AA] font-medium shadow-md shadow-[#00D4AA]/5"
                  : "bg-transparent border-transparent hover:bg-[#121212] hover:border-neutral-900 text-neutral-400"
              }`}
            >
              <BookOpen size={18} />
              <span>5. Roadmap & Extension</span>
            </button>

            <div className="pt-6 border-t border-neutral-900 mt-6 px-4">
              <div className="bg-[#121212] border border-neutral-900 p-4 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono text-[#00D4AA]">
                  <Cpu size={14} />
                  <span>CRYPTO ENGINE</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed font-light">
                  All security controls are fully simulated in real time using the <span className="text-[#FFFFFF] hover:underline font-mono">Web Crypto API</span>.
                </p>
                <div className="text-[10px] font-mono text-neutral-500">
                  AES-256-GCM + PBKDF2
                </div>
              </div>
            </div>
          </div>

          {/* Technical Documentation Content Workspace */}
          <div className="lg:col-span-3 bg-[#121212]/30 border border-neutral-900 p-6 md:p-8 rounded-2xl">
            
            {/* TAB 1: Cryptographic Architecture */}
            {activeTab === "architecture" && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h2 className="text-2xl font-semibold mb-2 font-sans text-neutral-100 flex items-center gap-2">
                    <Shield className="text-[#00D4AA]" size={22} />
                    Cryptographic Architecture & Vault Flows
                  </h2>
                  <p className="text-neutral-400 font-light text-sm max-w-2xl leading-relaxed">
                    SecureVault relies on client-side, zero-knowledge cryptographic primitives. 
                    The central premise is that the server is a dumb store: it receives only encrypted payloads 
                    (ciphertext), unique salts, and public authenticator verifiers. Under no condition can the host server access or decrypt user credentials.
                  </p>
                </div>

                {/* Key Derivation Architecture Flow Diagram */}
                <div className="bg-[#171717] p-5 rounded-xl border border-neutral-900">
                  <div className="text-xs font-mono text-[#00D4AA] mb-4">FLOW DIAGRAM: ZERO-KNOWLEDGE ENCRYPTION PIPELINE</div>
                  
                  <div className="space-y-4">
                    {/* Step 1 */}
                    <div className="flex gap-4 items-start">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full bg-[#00D4AA]/20 text-[#00D4AA] border border-[#00D4AA]/30 flex items-center justify-center font-mono text-xs font-bold">1</div>
                        <div className="w-0.5 h-10 bg-neutral-800"></div>
                      </div>
                      <div className="flex-1 bg-[#121212] p-3 rounded-lg border border-neutral-900">
                        <div className="text-xs font-mono text-[#FFFFFF] font-bold">Master Password Input (Client)</div>
                        <p className="text-[#A1A1AA] text-xs font-light mt-1">
                          User enters Master Password. Client fetches the unique user salt from `/api/auth/check/:username`.
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-4 items-start">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full bg-[#00D4AA]/20 text-[#00D4AA] border border-[#00D4AA]/30 flex items-center justify-center font-mono text-xs font-bold">2</div>
                        <div className="w-0.5 h-10 bg-neutral-800"></div>
                      </div>
                      <div className="flex-1 bg-[#121212] p-3 rounded-lg border border-neutral-900">
                        <div className="text-xs font-mono text-[#FFFFFF] font-bold">Master Key Derivation (Argon2id / PBKDF2)</div>
                        <p className="text-[#A1A1AA] text-xs font-light mt-1">
                          The client derives two distinct keys:
                        </p>
                        <ul className="list-disc list-inside text-[11px] text-[#A1A1AA] mt-1 space-y-1 ml-1 font-light">
                          <li><strong className="text-neutral-100 font-mono">Encryption Key (K_enc)</strong>: PBKDF2-HMAC-SHA256 (100,000 iterations) targeting AES-GCM-256 for local encryption.</li>
                          <li><strong className="text-neutral-100 font-mono">Verifier Hash (H_auth)</strong>: PBKDF2-HMAC-SHA256 (50,000 iterations) to authenticate API payloads without leaking K_enc or the Master Password.</li>
                        </ul>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-4 items-start">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full bg-[#00D4AA]/20 text-[#00D4AA] border border-[#00D4AA]/30 flex items-center justify-center font-mono text-xs font-bold">3</div>
                        <div className="w-0.5 h-10 bg-neutral-800"></div>
                      </div>
                      <div className="flex-1 bg-[#121212] p-3 rounded-lg border border-neutral-900">
                        <div className="text-xs font-mono text-[#FFFFFF] font-bold">AES-256-GCM Block Encryption (Client Body)</div>
                        <p className="text-[#A1A1AA] text-xs font-light mt-1">
                          Plaintext credentials (JSON containing Username, Password, URL, Notes) are converted to bytes. 
                          A 96-bit (12-byte) random Cryptographically Secure Initialization Vector (IV) is generated. 
                          The block is encrypted in Galois/Counter Mode, outputting ciphertext and a 128-bit authentication tag.
                        </p>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex gap-4 items-start">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full bg-[#00D4AA]/20 text-[#00D4AA] border border-[#00D4AA]/30 flex items-center justify-center font-mono text-xs font-bold">4</div>
                      </div>
                      <div className="flex-1 bg-[#121212] p-3 rounded-lg border border-neutral-900">
                        <div className="text-xs font-mono text-[#FFFFFF] font-bold">Secure Transport (Transmit Ciphertext Only)</div>
                        <p className="text-[#A1A1AA] text-xs font-light mt-1">
                          Only `{`{ ciphertext, iv, salt_id, url, category, isFavorite }`}` is transferred over HTTPS to the database. K_enc never leaves the client's memory stack.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cryptographic Specifications Detailed */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-neutral-100">Cryptographic Standard Selections</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#171717]/40 p-4 rounded-xl border border-neutral-900 space-y-2">
                      <div className="flex items-center gap-2 font-mono text-xs text-[#00D4AA] font-bold">
                        <KeyRound size={14} /> PBKDF2 & ARGON2ID
                      </div>
                      <p className="text-xs text-[#A1A1AA] leading-relaxed font-light">
                        Argon2id (m=65536, t=3, p=4) is the self-hosting standard. 
                        For thin-client browsers without compiled WASM binaries, the architecture leverages 
                        <strong> PBKDF2-HMAC-SHA256 with 100,000 iterations</strong> running natively on Chrome/Firefox Web Crypto engine.
                      </p>
                    </div>

                    <div className="bg-[#171717]/40 p-4 rounded-xl border border-neutral-900 space-y-2">
                      <div className="flex items-center gap-2 font-mono text-xs text-[#00D4AA] font-bold">
                        <Server size={14} /> AES-256-GCM AUTHENTICATION
                      </div>
                      <p className="text-xs text-[#A1A1AA] leading-relaxed font-light">
                        Galois/Counter Mode provides high performance and integrated integrity checks. 
                        By outputting a 16-byte authentication tag appended to the ciphertext, it ensures that 
                        <strong> no offline tampering or bit-flipping attacks</strong> are possible during communication.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Threat Vulnerability Map */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-neutral-100 text-left">Zero-Knowledge Threat Model</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse border border-neutral-900">
                      <thead>
                        <tr className="bg-[#171717] text-neutral-300 font-mono border-b border-neutral-900">
                          <th className="p-3">Threat vector</th>
                          <th className="p-3">Target Scope</th>
                          <th className="p-3">Mitigation / Architectural Defense</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-900 text-neutral-400 font-light">
                        <tr>
                          <td className="p-3 font-mono text-neutral-200">Server Host Takeover</td>
                          <td className="p-3">Full DB Access</td>
                          <td className="p-3 text-emerald-400/90">Attacker gets encrypted binary blobs. Decryption requires Master Password, which is physically stored only in user memory.</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-mono text-neutral-200">Man-In-The-Middle (MITM)</td>
                          <td className="p-3">Network Traffic Sniffing</td>
                          <td className="p-3 text-emerald-400/90">Zero-knowledge verifier hash avoids Master Password transmission. AES-GCM tags guarantee ciphertext authenticity.</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-mono text-neutral-200">GPU-based Brute-Force</td>
                          <td className="p-3">Offline Salty Hashes</td>
                          <td className="p-3 text-emerald-400/90">Memory-hard key derivation makes offline dictionary cracking economically unfeasible (100k rounds iterations).</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Schema Design & API Endpoint Specification */}
            {activeTab === "database" && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h2 className="text-2xl font-semibold mb-2 font-sans text-neutral-100 flex items-center gap-2">
                    <Database className="text-[#00D4AA]" size={22} />
                    Database Schema & RESTful APIs Specifications
                  </h2>
                  <p className="text-neutral-400 font-light text-sm max-w-2xl leading-relaxed">
                    Designed for secure relational mapping or dynamic JSON persistence. 
                    This specification handles high concurrency while indexing metadata to allow 
                    performant queries without compromising the secrecy of the encrypted payload contents.
                  </p>
                </div>

                {/* NoSQL/SQL Schema Layouts */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
                    Database Schema Models (JSON/NoSQL Document Spec)
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-[11px]">
                    <div className="bg-[#171717] p-4 rounded-xl border border-neutral-900">
                      <div className="text-xs text-[#00D4AA] font-bold mb-2 border-b border-neutral-900 pb-1">SCHEMA: users</div>
                      <pre className="text-neutral-300 leading-relaxed font-light">{`{
  "_id": "ObjectId",
  "username": "String (Unique, Indexed)",
  "salt": "String (Hex, Cryptographic salt)",
  "verifierHash": "String (Hex, derived auth hash)",
  "createdAt": "ISODate"
}`}</pre>
                    </div>

                    <div className="bg-[#171717] p-4 rounded-xl border border-neutral-900">
                      <div className="text-xs text-[#00D4AA] font-bold mb-2 border-b border-neutral-900 pb-1">SCHEMA: vault_entries</div>
                      <pre className="text-neutral-300 leading-relaxed font-light">{`{
  "_id": "ObjectId",
  "username": "String (Indexed, Foreign Key)",
  "url": "String (Plaintext for domain sorting)",
  "category": "String (Plaintext index)",
  "encryptedBlob": "String (Hex, GCM Ciphertext)",
  "iv": "String (Hex, 12-byte IV)",
  "salt": "String (Hex, vault key salt)",
  "isFavorite": "Boolean (Index)",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}`}</pre>
                    </div>

                    <div className="bg-[#171717] p-4 rounded-xl border border-neutral-900">
                      <div className="text-xs text-[#00D4AA] font-bold mb-2 border-b border-neutral-900 pb-1">SCHEMA: activity_logs</div>
                      <pre className="text-neutral-300 leading-relaxed font-light">{`{
  "_id": "ObjectId",
  "username": "String (Indexed)",
  "action": "String",
  "timestamp": "ISODate",
  "ipAddress": "String",
  "status": "String (Success | Failed)"
}`}</pre>
                    </div>

                    <div className="bg-[#171717] p-4 rounded-xl border border-neutral-900">
                      <div className="text-xs text-[#00D4AA] font-bold mb-2 border-b border-neutral-900 pb-1">SCHEMA: settings & backups</div>
                      <pre className="text-neutral-300 leading-relaxed font-light">{`{
  "settings": {
    "username": "String (Foreign Key)",
    "autoLockTime": "Int (Default: 15min)",
    "requirePasswordOnCopy": "Boolean"
  },
  "backups": {
    "_id": "ObjectId",
    "username": "String",
    "filename": "String",
    "createdAt": "ISODate",
    "size": "String",
    "type": "String (Manual | Auto)"
  }
}`}</pre>
                    </div>
                  </div>
                </div>

                {/* API Specifications table */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-neutral-100">RESTful Endpoint Specifications</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse border border-neutral-900">
                      <thead>
                        <tr className="bg-[#171717] text-neutral-300 font-mono border-b border-neutral-900">
                          <th className="p-3">HTTP Verb</th>
                          <th className="p-3">Endpoint Route</th>
                          <th className="p-3">Required Headers / Payload</th>
                          <th className="p-3">Response Behavior</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-900 text-neutral-400 font-light">
                        <tr>
                          <td className="p-3 font-mono font-bold text-emerald-400">POST</td>
                          <td className="p-3 font-mono font-medium text-[#00D4AA]">/api/auth/register</td>
                          <td className="p-3 font-mono text-[11px]">{`{ username, salt, verifierHash }`}</td>
                          <td className="p-3 text-neutral-300">Creates user. Initialized default settings model for security rules.</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-mono font-bold text-emerald-400">POST</td>
                          <td className="p-3 font-mono font-medium text-[#00D4AA]">/api/auth/login</td>
                          <td className="p-3 font-mono text-[11px]">{`{ username, verifierHash }`}</td>
                          <td className="p-3 text-neutral-300">Verifies master key signature. Returns user metadata and session token.</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-mono font-bold text-blue-400">GET</td>
                          <td className="p-3 font-mono font-medium text-[#00D4AA]">/api/vault</td>
                          <td className="p-3 font-mono text-[11px]">{"Header: X-Vault-User: <username>"}</td>
                          <td className="p-3 text-neutral-300">Fetches encrypted database structures belonging exclusively to requested user.</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-mono font-bold text-emerald-400">POST</td>
                          <td className="p-3 font-mono font-medium text-[#00D4AA]">/api/vault/add</td>
                          <td className="p-3 font-mono text-[11px]">{`{ encryptedBlob, iv, category, url, isFavorite }`}</td>
                          <td className="p-3 text-neutral-300">Saves a client-encrypted credential item. Appends unique item id.</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-mono font-bold text-amber-500">PUT</td>
                          <td className="p-3 font-mono font-medium text-[#00D4AA]">/api/vault/update</td>
                          <td className="p-3 font-mono text-[11px]">{`{ id, encryptedBlob, iv, category, isFavorite }`}</td>
                          <td className="p-3 text-neutral-300">Updates specific record. Logs action in server activity history logs.</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-mono font-bold text-red-500">DELETE</td>
                          <td className="p-3 font-mono font-medium text-[#00D4AA]">/api/vault/delete/:id</td>
                          <td className="p-3 font-mono text-[11px]">Params: id | Header: user</td>
                          <td className="p-3 text-neutral-300">Deletes vault payload entry securely. Updates activity log index list.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Production Code Folder Structure */}
            {activeTab === "structure" && (
              <div className="space-y-6 animate-fade-in text-left">
                <div>
                  <h2 className="text-2xl font-semibold mb-2 font-sans text-neutral-100 flex items-center gap-2">
                    <FolderGit2 className="text-[#00D4AA]" size={22} />
                    Project Foundation & Production Folder Mapping
                  </h2>
                  <p className="text-neutral-400 font-light text-sm max-w-2xl leading-relaxed">
                    Designed to ensure absolute separation of concerns. 
                    The following directory hierarchy isolates the frontend client logic (Web Crypto engine, hooks) 
                    from backend servers (Express controllers, filesystem storage, and logger service).
                  </p>
                </div>

                <div className="bg-[#171717] p-6 rounded-xl border border-neutral-900 font-mono text-xs leading-relaxed max-w-2xl mx-auto">
                  <div className="text-neutral-400 border-b border-neutral-800 pb-2 mb-3 flex items-center justify-between">
                    <span className="text-[#00D4AA] font-bold">DIRECTORY ARCHITECTURE TREE</span>
                    <span className="text-[10px] font-mono">SecureVault v1.0 Production Spec</span>
                  </div>
                  
                  <div className="text-neutral-200 space-y-1">
                    <div>📁 <strong className="text-neutral-100">SecureVault/</strong></div>
                    <div className="pl-4">├── 📁 <strong className="text-neutral-100">frontend/</strong> <span className="text-neutral-500">// React Client Workspace</span></div>
                    <div className="pl-8">├── 📁 <strong className="text-neutral-300">components/</strong> <span className="text-neutral-500">// Modular, encapsulated UI buttons and forms</span></div>
                    <div className="pl-12">├── 📄 AuthScreen.tsx <span className="text-neutral-500">// Vault lock/unlock interface and PBKDF2 salt fetching</span></div>
                    <div className="pl-12">├── 📄 VaultDashboard.tsx <span className="text-neutral-500">// Central password list, filters, search, favorite triggers</span></div>
                    <div className="pl-12">├── 📄 PasswordGenerator.tsx <span className="text-neutral-500">// Configurable cryptographic string and passphrase builder</span></div>
                    <div className="pl-8">├── 📁 <strong className="text-neutral-300">hooks/</strong> <span className="text-neutral-500">// Custom react hooks for handling vault state engines</span></div>
                    <div className="pl-12">└── 📄 useVaultState.ts <span className="text-neutral-500">// State wrapper for automatic secure lock timeouts</span></div>
                    <div className="pl-8">├── 📁 <strong className="text-neutral-300">store/</strong> <span className="text-neutral-500">// Client memory context & local encryption cache</span></div>
                    <div className="pl-8">└── 📁 <strong className="text-neutral-300">utils/</strong></div>
                    <div className="pl-12">└── 📄 crypto.ts <span className="text-neutral-500">// Zero-knowledge PBKDF2 key derivation and AES-GCM operations</span></div>
                    
                    <div className="pl-4 pt-2">├── 📁 <strong className="text-neutral-100">backend/</strong> <span className="text-neutral-500">// Node Express Host environment</span></div>
                    <div className="pl-8">├── 📁 <strong className="text-neutral-300">controllers/</strong> <span className="text-neutral-500">// Route entry orchestration</span></div>
                    <div className="pl-12">├── 📄 authController.ts <span className="text-neutral-500">// Secure password registration and check endpoints</span></div>
                    <div className="pl-12">└── 📄 vaultController.ts <span className="text-neutral-500">// CRUD management of encrypted ciphertext lists</span></div>
                    <div className="pl-8">├── 📁 <strong className="text-neutral-300">models/</strong> <span className="text-neutral-500">// Data schemas mapping DB interfaces</span></div>
                    <div className="pl-8">├── 📁 <strong className="text-neutral-300">services/</strong> <span className="text-neutral-500">// Background tasks and backup storage management</span></div>
                    <div className="pl-12">└── 📄 backupManager.ts <span className="text-neutral-500">// Backups retention logic keeping history count &lt;= 30 files</span></div>
                    <div className="pl-8">└── 📄 server.ts <span className="text-neutral-500">// Express app bootloader, middleware pipelines</span></div>

                    <div className="pl-4 pt-2">├── 📄 .env.example <span className="text-neutral-500">// Template for deployment keys, salt length configs</span></div>
                    <div className="pl-4">├── 📄 docker-compose.yml <span className="text-neutral-500">// Ready-to-go single node container virtualization template</span></div>
                    <div className="pl-4">└── 📄 package.json <span className="text-neutral-500">// Unified build engine manifest</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Self-Hosting & Deployment Manual */}
            {activeTab === "hosting" && (
              <div className="space-y-6 animate-fade-in text-left">
                <div>
                  <h2 className="text-2xl font-semibold mb-2 font-sans text-neutral-100 flex items-center gap-2">
                    <Terminal className="text-[#00D4AA]" size={22} />
                    Deployment Guide & Self-Hosting Hardening Manual
                  </h2>
                  <p className="text-neutral-400 font-light text-sm max-w-2xl leading-relaxed">
                    Designed for high durability. Placing SecureVault on your local server or home network 
                    requires proper SSL wrapping to enable browser SubtleCrypto APIs safely.
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 p-4 rounded-xl flex gap-3 text-neutral-300">
                    <AlertTriangle className="text-[#EF4444] shrink-0" size={18} />
                    <div>
                      <strong className="text-white block mb-1">CRITICAL REQUIREMENT: HTTPS / SSL SETUP</strong>
                      Modern web browsers (including Chrome, Safari, and Firefox) restrict the <code className="bg-[#171717] px-1 py-0.5 rounded text-[#00D4AA]">window.crypto.subtle</code> (Web Crypto API) exclusively to secure contexts. 
                      You <strong>MUST</strong> deploy SecureVault behind an HTTPS certificate or access it over `localhost`. 
                      Non-secured HTTP network clients will fail to lock/unlock vaults!
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-neutral-100">Frictionless Docker Deployment</h3>
                    <p className="text-neutral-400 font-light leading-relaxed">
                      Build and deploy the service instantly inside standard sandboxed systems using docker containers.
                    </p>
                    <div className="bg-[#171717] p-4 rounded-xl border border-neutral-900 font-mono text-[11px] text-neutral-300">
                      <div className="text-neutral-500 mb-2"># Single-Click Node Composition (docker-compose.yml)</div>
                      <div>{`version: '3.8'
services:
  securevault:
    image: securevault:latest
    build: .
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NODE_ENV=production
      - DB_STORAGE_PATH=/data/vault_db.json
    volumes:
      - securevault_data:/data
    restart: unless-stopped

volumes:
  securevault_data:`}</div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h3 className="text-sm font-semibold text-neutral-100">CLI Production Management</h3>
                    <p className="text-neutral-400 font-light leading-relaxed">
                      Run standard manual package compilation or launch native hosts directly from Node.js engines.
                    </p>
                    <div className="bg-[#171717] p-4 rounded-xl border border-neutral-900 font-mono text-[11px] text-neutral-300 space-y-2">
                      <div><span className="text-neutral-500"># 1. Install required packages</span><br /><span className="text-[#00D4AA]">npm install</span></div>
                      <div><span className="text-neutral-500"># 2. Compile static distributions & web server bundle</span><br /><span className="text-[#00D4AA]">npm run build</span></div>
                      <div><span className="text-neutral-500"># 3. Securely start local production daemon on port 3000</span><br /><span className="text-[#00D4AA]">npm run start</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: Roadmap Spec & Extension Design */}
            {activeTab === "roadmap" && (
              <div className="space-y-6 animate-fade-in text-left">
                <div>
                  <h2 className="text-2xl font-semibold mb-2 font-sans text-neutral-100 flex items-center gap-2">
                    <BookOpen className="text-[#00D4AA]" size={22} />
                    Future Roadmap & Platform Extensions Spec
                  </h2>
                  <p className="text-neutral-400 font-light text-sm max-w-2xl leading-relaxed">
                    Designed to grow. Moving from a standalone local webapp into an integrated device manager 
                    requires standard browser extensions hooks, biometric challenges, and database replica engines.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Phase Blocks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#171717]/60 p-4 rounded-xl border border-neutral-900 space-y-2">
                      <div className="text-xs font-mono font-bold text-[#00D4AA]">PHASE 2: BROWSER EXTENSION INTEGRATION</div>
                      <p className="text-[11px] text-[#A1A1AA] leading-relaxed font-light">
                        Develop standalone MV3 (Manifest V3) extension shells. 
                        Implements background script synchronization pipelines syncing to SecureVault host JSON endpoints. 
                        Captures field matches using secure HTML document query selector hooks.
                      </p>
                    </div>

                    <div className="bg-[#171717]/60 p-4 rounded-xl border border-neutral-900 space-y-2">
                      <div className="text-xs font-mono font-bold text-[#00D4AA]">PHASE 3: SECURE DEPLOYMENT REPLICATION</div>
                      <p className="text-[11px] text-[#A1A1AA] leading-relaxed font-light">
                        Deploy encrypted network sync hubs using peer-to-peer WebRTC connections. 
                        Enables master replication across multiple local installations (e.g. laptop and Raspberry Pi) 
                        without a centralized intermediate cloud broker.
                      </p>
                    </div>

                    <div className="bg-[#171717]/60 p-4 rounded-xl border border-neutral-900 space-y-2">
                      <div className="text-xs font-mono font-bold text-[#00D4AA]">PHASE 4: REAL-TIME BREACH THREAT ALERTS</div>
                      <p className="text-[11px] text-[#A1A1AA] leading-relaxed font-light">
                        Query HaveIBeenPwned API hashes locally without forwarding sensitive plaintext parameters. 
                        Examines the first 5 characters of SHA-1 password strings to fetch matching candidate lists, 
                        auditing vault items client-side.
                      </p>
                    </div>

                    <div className="bg-[#171717]/60 p-4 rounded-xl border border-neutral-900 space-y-2">
                      <div className="text-xs font-mono font-bold text-[#00D4AA]">PHASE 5: WEBAUTHN / BIOMETRICS LOGIN</div>
                      <p className="text-[11px] text-[#A1A1AA] leading-relaxed font-light">
                        Utilize standard browser-native TouchID, FaceID, or hardware keys (YubiKey) 
                        using WebAuthn credentials to authenticate user vaults. Encrypts the master session key 
                        using user biometric keypairs directly in hardware enclaves.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
