import React, { useState, useEffect } from "react";
import { Copy, RefreshCw, Check, ShieldCheck, HelpCircle } from "lucide-react";

const WORD_LIST = [
  "alpha", "battery", "correct", "staple", "horse", "gravity", "cosmic", "quantum",
  "secure", "vault", "castle", "forest", "desert", "matrix", "beacon", "sunset",
  "glacier", "nebula", "cipher", "anchor", "shadow", "winter", "harvest", "crystal",
  "phoenix", "galaxy", "breeze", "magnet", "timber", "silver", "whisper", "zenith"
];

interface PasswordGeneratorProps {
  onUsePassword?: (password: string) => void;
  inline?: boolean;
}

export default function PasswordGenerator({ onUsePassword, inline = false }: PasswordGeneratorProps) {
  const [length, setLength] = useState(16);
  const [useUppercase, setUseUppercase] = useState(true);
  const [useLowercase, setUseLowercase] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [mode, setMode] = useState<"password" | "passphrase">("password");
  const [wordCount, setWordCount] = useState(4);
  const [separator, setSeparator] = useState("-");
  
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [strength, setStrength] = useState({ score: 0, text: "Weak", color: "bg-red-500", rawPercent: 0 });

  const charsetUpper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const charsetLower = "abcdefghijklmnopqrstuvwxyz";
  const charsetNumbers = "0123456789";
  const charsetSymbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  const generate = () => {
    if (mode === "passphrase") {
      const words: string[] = [];
      for (let i = 0; i < wordCount; i++) {
        const randomIndex = Math.floor(Math.random() * WORD_LIST.length);
        words.push(WORD_LIST[randomIndex]);
      }
      setGeneratedPassword(words.join(separator));
      return;
    }

    let currentCharset = "";
    if (useUppercase) currentCharset += charsetUpper;
    if (useLowercase) currentCharset += charsetLower;
    if (useNumbers) currentCharset += charsetNumbers;
    if (useSymbols) currentCharset += charsetSymbols;

    if (!currentCharset) {
      setGeneratedPassword("");
      return;
    }

    let pwd = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * currentCharset.length);
      pwd += currentCharset[randomIndex];
    }
    setGeneratedPassword(pwd);
  };

  useEffect(() => {
    generate();
  }, [length, useUppercase, useLowercase, useNumbers, useSymbols, mode, wordCount, separator]);

  // Calculate password strength
  useEffect(() => {
    if (!generatedPassword) {
      setStrength({ score: 0, text: "Weak", color: "bg-red-500", rawPercent: 5 });
      return;
    }

    let score = 0;
    
    if (mode === "passphrase") {
      score = Math.min(100, wordCount * 25);
    } else {
      // Regular password rating
      const pwdLen = generatedPassword.length;
      score += pwdLen * 4; // Length weight
      
      let charTypes = 0;
      if (/[A-Z]/.test(generatedPassword)) charTypes++;
      if (/[a-z]/.test(generatedPassword)) charTypes++;
      if (/[0-9]/.test(generatedPassword)) charTypes++;
      if (/[^A-Za-z0-9]/.test(generatedPassword)) charTypes++;
      
      score += charTypes * 12;
    }

    score = Math.min(100, score);

    let text = "Weak";
    let color = "bg-[#EF4444]";
    
    if (score >= 80) {
      text = "Strong (Excellent)";
      color = "bg-[#22C55E]";
    } else if (score >= 50) {
      text = "Moderate (Decent)";
      color = "bg-[#F59E0B]";
    }

    setStrength({
      score: Math.round(score),
      text,
      color,
      rawPercent: score
    });
  }, [generatedPassword, mode, wordCount]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`bg-[#171717]/80 rounded-xl border border-neutral-900 ${inline ? "p-0 bg-transparent border-none" : "p-5"}`}>
      {!inline && (
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="text-[#00D4AA]" size={18} />
          <h3 className="text-sm font-semibold text-neutral-100">Cryptographically Secure Generator</h3>
        </div>
      )}

      {/* Output Screen */}
      <div className="flex items-center justify-between gap-2 bg-[#0A0A0A] border border-neutral-800 rounded-xl p-3 mb-4">
        <span className="font-mono text-xs md:text-sm text-neutral-100 break-all select-all font-semibold tracking-wide">
          {generatedPassword || "Select some charsets..."}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={generate}
            title="Regenerate password"
            className="p-1.5 text-neutral-400 hover:text-[#00D4AA] hover:bg-[#121212] rounded transition-colors"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={copyToClipboard}
            title={copied ? "Copied!" : "Copy password"}
            className="p-1.5 text-neutral-400 hover:text-[#00D4AA] hover:bg-[#121212] rounded transition-colors"
          >
            {copied ? <Check size={14} className="text-[#00D4AA]" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* Strength Indicator */}
      <div className="mb-5 space-y-1">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-neutral-400 font-light">Calculated Strength Score</span>
          <span className="font-mono font-bold text-neutral-200">{strength.rawPercent}% ({strength.text})</span>
        </div>
        <div className="w-full bg-[#121212] h-1.5 rounded-full overflow-hidden border border-neutral-900/40">
          <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: `${strength.rawPercent}%` }}></div>
        </div>
      </div>

      {/* Selector Controls */}
      <div className="space-y-4">
        {/* Mode Selector */}
        <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
          <span className="text-xs font-light text-neutral-300">Generator Mode</span>
          <div className="flex bg-[#0A0A0A] p-0.5 rounded-lg border border-neutral-800">
            <button
              onClick={() => setMode("password")}
              className={`px-3 py-1 text-[11px] rounded transition-all font-mono ${
                mode === "password"
                  ? "bg-[#171717] text-[#00D4AA] font-semibold border border-neutral-800"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              Password
            </button>
            <button
              onClick={() => setMode("passphrase")}
              className={`px-3 py-1 text-[11px] rounded transition-all font-mono ${
                mode === "passphrase"
                  ? "bg-[#171717] text-[#00D4AA] font-semibold border border-neutral-800"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              Passphrase
            </button>
          </div>
        </div>

        {/* Password Configurations */}
        {mode === "password" && (
          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-300 font-mono">Character Length: {length}</span>
              </div>
              <input
                type="range"
                min="6"
                max="64"
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                className="w-full accent-[#00D4AA] cursor-pointer mt-1 bg-[#121212]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-neutral-900/60 transition-colors border border-transparent hover:border-neutral-900">
                <input
                  type="checkbox"
                  checked={useUppercase}
                  onChange={(e) => setUseUppercase(e.target.checked)}
                  className="rounded accent-[#00D4AA]"
                />
                <span className="text-xs text-neutral-400 font-mono">Uppercase</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-neutral-900/60 transition-colors border border-transparent hover:border-neutral-900">
                <input
                  type="checkbox"
                  checked={useLowercase}
                  onChange={(e) => setUseLowercase(e.target.checked)}
                  className="rounded accent-[#00D4AA]"
                />
                <span className="text-xs text-neutral-400 font-mono">Lowercase</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-neutral-900/60 transition-colors border border-transparent hover:border-neutral-900">
                <input
                  type="checkbox"
                  checked={useNumbers}
                  onChange={(e) => setUseNumbers(e.target.checked)}
                  className="rounded accent-[#00D4AA]"
                />
                <span className="text-xs text-neutral-400 font-mono">Numbers</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-neutral-900/60 transition-colors border border-transparent hover:border-neutral-900">
                <input
                  type="checkbox"
                  checked={useSymbols}
                  onChange={(e) => setUseSymbols(e.target.checked)}
                  className="rounded accent-[#00D4AA]"
                />
                <span className="text-xs text-neutral-400 font-mono">Symbols</span>
              </label>
            </div>
          </div>
        )}

        {/* Passphrase Configurations */}
        {mode === "passphrase" && (
          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-300 font-mono">Word Count: {wordCount} words</span>
              </div>
              <input
                type="range"
                min="3"
                max="8"
                value={wordCount}
                onChange={(e) => setWordCount(Number(e.target.value))}
                className="w-full accent-[#00D4AA] cursor-pointer mt-1 bg-[#121212]"
              />
            </div>

            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-neutral-900/40">
              <span className="text-xs text-neutral-400 font-mono">Separator Character</span>
              <select
                value={separator}
                onChange={(e) => setSeparator(e.target.value)}
                className="bg-[#0A0A0A] border border-neutral-800 text-xs text-neutral-200 rounded px-2 py-1 font-mono outline-none"
              >
                <option value="-">Hyphen (-)</option>
                <option value="_">Underscore (_)</option>
                <option value=" ">Space ( )</option>
                <option value=".">Dot (.)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {onUsePassword && (
        <button
          onClick={() => onUsePassword(generatedPassword)}
          disabled={!generatedPassword}
          className="w-full mt-4 bg-[#00D4AA] text-[#0A0A0A] font-medium py-2 rounded-xl text-xs hover:bg-[#00D4AA]/90 active:scale-98 transition-all disabled:opacity-50"
        >
          Insert generated password
        </button>
      )}
    </div>
  );
}
