import React, { useState } from "react";
import { 
  Lock, Eye, EyeOff, ShieldAlert, Key, UserCheck, 
  HelpCircle, UserPlus, LogIn, KeyRound 
} from "lucide-react";
import { 
  deriveMasterKey, generateVerifierHash, generateSalt, 
  bufToHex, hexToBuf 
} from "../utils/crypto";

interface AuthScreenProps {
  onAuthenticated: (username: string, masterKey: CryptoKey) => void;
}

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg("Please provide both an identifier and a master passphrase.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Security constraint: Master password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // 1. Generate client-side salt
      const saltBytes = generateSalt(16);
      const saltHex = bufToHex(saltBytes);

      // 2. Derive verifier hash
      const verifier = await generateVerifierHash(password, saltBytes);

      // 3. Register on self-hosted express backend
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          salt: saltHex,
          verifierHash: verifier
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "failed registration");
      }

      setSuccessMsg("Account enrolled successfully! You may now unlock your vault.");
      setPassword("");
      setIsRegister(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An error occurred during secure zero-knowledge registration.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg("Please enter your identifier and your master passphrase.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // 1. Retrieve the registered cryptographic salt from server first
      const saltResp = await fetch(`/api/auth/check/${encodeURIComponent(username.trim())}`);
      if (!saltResp.ok) {
        throw new Error("Invalid username or credential signature not found.");
      }
      const { salt: saltHex } = await saltResp.json();
      const saltBytes = hexToBuf(saltHex);

      // 2. Derive credentials on the client-side
      const verifier = await generateVerifierHash(password, saltBytes);
      const encryptionKey = await deriveMasterKey(password, saltBytes);

      // 3. Authenticate with the server using the verifier signature
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          verifierHash: verifier
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      // Successful auth! Hand over to core application state in memory.
      onAuthenticated(data.username, encryptionKey);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to authenticate signal. Check master passphrases.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 text-white font-sans">
      <div className="w-full max-w-md bg-[#0C0C0C] border border-white/10 rounded-xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        
        {/* Subtle glowing tech indicator */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#00D4AA]/0 via-[#00D4AA] to-[#00D4AA]/0"></div>

        {/* Brand / Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 rounded-lg bg-[#00D4AA] flex items-center justify-center text-black/90 mb-3 font-bold">
            <div className="w-5 h-5 border-2 border-black/80 rounded-sm flex items-center justify-center">
              <Lock size={10} className="stroke-[2.5]" />
            </div>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">SecureVault</h2>
          <p className="text-xs text-zinc-500 font-mono mt-1 uppercase tracking-wider">
            Zero-Knowledge Cryptographic Vault
          </p>
        </div>

        {/* Switch Mode Tab */}
        <div className="flex bg-[#121212] p-1 rounded-lg border border-white/5 mb-6">
          <button
            onClick={() => {
              setIsRegister(false);
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
              !isRegister 
                ? "bg-white/5 text-[#00D4AA]" 
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <LogIn size={13} />
            Unlock Vault
          </button>
          <button
            onClick={() => {
              setIsRegister(true);
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isRegister 
                ? "bg-white/5 text-[#00D4AA]" 
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <UserPlus size={13} />
            Create Account
          </button>
        </div>

        {/* Error / Success Notifications */}
        {errorMsg && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 text-xs text-red-500 rounded-lg p-3 flex items-start gap-2.5">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <div className="font-light">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 bg-green-500/10 border border-green-500/20 text-xs text-green-500 rounded-lg p-3 flex items-start gap-2.5">
            <UserCheck size={16} className="shrink-0 mt-0.5" />
            <div className="font-light">{successMsg}</div>
          </div>
        )}

        {/* Encryption Core Forms */}
        <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">
          <div className="space-y-1.5 align-left text-left">
            <label className="text-[10px] font-semibold text-zinc-500 font-mono uppercase tracking-wider block">
              Username ID
            </label>
            <input
              type="text"
              placeholder="e.g. selfhost_owner"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              className="w-full bg-[#171717] border border-white/5 rounded-md px-3.5 py-2 pl-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#00D4AA]/50 transition-colors"
              required
            />
          </div>

          <div className="space-y-1.5 align-left text-left">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-semibold text-zinc-500 font-mono uppercase tracking-wider block">
                Master Password
              </label>
              <div 
                className="text-[10px] text-zinc-500 flex items-center gap-1 cursor-help hover:text-zinc-400 font-light"
                title="The key used to encrypt all local entries. Never stored plaintext anywhere"
              >
                <HelpCircle size={10} />
                <span>Zero-Knowledge</span>
              </div>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="•••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full bg-[#171717] border border-white/5 rounded-md pl-3 pr-10 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#00D4AA]/50 transition-colors font-mono"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-[#00D4AA] cursor-pointer"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#00D4AA] text-black font-semibold py-2 rounded-md text-sm hover:bg-[#00B894] transition-colors flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-3.5 w-3.5 text-black" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <span>Deriving key...</span>
              </span>
            ) : isRegister ? (
              <>
                <KeyRound size={14} />
                Generate Vault Key & Enroll
              </>
            ) : (
              <>
                <Lock size={14} />
                Derive Key & Unlock Vault
              </>
            )}
          </button>
        </form>

        {/* Security Warning Notice */}
        <div className="mt-6 pt-5 border-t border-white/10 flex items-start gap-2 text-[10px] text-zinc-500 text-left font-light leading-relaxed">
          <Key className="text-[#00D4AA]/60 shrink-0 mt-0.5" size={13} />
          <div>
            The master password provides the entropy bounds for your PBKDF2 local decryption key. 
            <strong> Loss of this passphrase means absolute data loss</strong>; there are no server-side recovery pathways.
          </div>
        </div>
      </div>
    </div>
  );
}
