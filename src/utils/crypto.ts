/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Zero-Knowledge local cryptographic operations using standard Web Crypto API (AES-GCM-256 and PBKDF2)

/**
 * Convert string to ArrayBuffer.
 */
export function stringToBuffer(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Convert ArrayBuffer to string.
 */
export function bufferToString(buf: ArrayBuffer): string {
  return new TextDecoder().decode(buf);
}

/**
 * Convert buffer to Hex string.
 */
export function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Convert Hex string to Uint8Array.
 */
export function hexToBuf(hex: string): Uint8Array {
  const view = new Uint8Array(hex.length / 2);
  for (let i = 0; i < view.length; i++) {
    view[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return view;
}

/**
 * Generate a cryptographically secure random salt.
 */
export function generateSalt(length = 16): Uint8Array {
  const salt = new Uint8Array(length);
  window.crypto.getRandomValues(salt);
  return salt;
}

/**
 * Generate an initialization vector (IV) for AES-GCM.
 */
export function generateIV(length = 12): Uint8Array {
  const iv = new Uint8Array(length);
  window.crypto.getRandomValues(iv);
  return iv;
}

/**
 * Derive a strong encryption key from Master Password and Salt using PBKDF2.
 * Mimics native CPU/memory-hard derivation using browser's optimized cryptographic framework.
 */
export async function deriveMasterKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    stringToBuffer(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false, // Exportable: false to prevent the private key from leaking into browser memory or inspector
    ["encrypt", "decrypt"]
  );
}

/**
 * Create a client-side verifier hash.
 * This verifier is sent to the server for authentication instead of the actual master password.
 * The server stores it, so even if the server is compromised, the master password cannot be retrieved.
 */
export async function generateVerifierHash(password: string, salt: Uint8Array): Promise<string> {
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    stringToBuffer(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 50000,
      hash: "SHA-256"
    },
    baseKey,
    256
  );

  return bufToHex(derivedBits);
}

/**
 * Encrypt a JSON object using AES-256-GCM and a derived CryptoKey.
 */
export async function encryptPayload(data: any, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const plaintext = stringToBuffer(JSON.stringify(data));
  const iv = generateIV();

  const ciphertextBuf = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    plaintext
  );

  return {
    ciphertext: bufToHex(ciphertextBuf),
    iv: bufToHex(iv)
  };
}

/**
 * Decrypt ciphertext back to original JSON using AES-256-GCM.
 */
export async function decryptPayload(ciphertextHex: string, ivHex: string, key: CryptoKey): Promise<any> {
  try {
    const ciphertext = hexToBuf(ciphertextHex);
    const iv = hexToBuf(ivHex);

    const decryptedBuf = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      key,
      ciphertext
    );

    const decryptedStr = bufferToString(decryptedBuf);
    return JSON.parse(decryptedStr);
  } catch (err) {
    console.error("Cryptographic Decryption Failed: Invalid master password or tempered ciphertext.", err);
    throw new Error("Decryption failure. The key might be invalid or payload is corrupted.");
  }
}

/**
 * Encrypt a raw ArrayBuffer using AES-256-GCM and a derived CryptoKey.
 */
export async function encryptFile(dataBuf: ArrayBuffer, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const iv = generateIV();

  const ciphertextBuf = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    dataBuf
  );

  return {
    ciphertext: bufToHex(ciphertextBuf),
    iv: bufToHex(iv)
  };
}

/**
 * Decrypt file ciphertext back to its original ArrayBuffer.
 */
export async function decryptFile(ciphertextHex: string, ivHex: string, key: CryptoKey): Promise<ArrayBuffer> {
  const ciphertext = hexToBuf(ciphertextHex);
  const iv = hexToBuf(ivHex);

  const decryptedBuf = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    ciphertext
  );

  return decryptedBuf;
}
