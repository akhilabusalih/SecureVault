/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AttachmentItem {
  id: string;
  name: string;
  type: string;
  size: number;
  encryptedBlob: string; // Hex AES-GCM ciphertext of the file buffer
  iv: string; // Hex IV used for this specific attachment
}

export interface DecryptedVaultPayload {
  title: string;
  username: string;
  password?: string;
  notes?: string;
  tags?: string[];
  attachments?: AttachmentItem[];
}

export interface VaultItem {
  id: string;
  url: string;
  category: string;
  title: string;
  username: string;
  password?: string;
  notes?: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  attachments?: AttachmentItem[];
}

export interface EncryptedVaultItem {
  id: string;
  url: string;
  category: string;
  encryptedBlob: string; // Hex AES-GCM ciphertext
  iv: string; // Hex IV
  salt: string; // Salt used (stored if item-level keys exist)
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BackupItem {
  id: string;
  username: string;
  filename: string;
  createdAt: string;
  size: string;
  type: "Manual" | "Auto";
}

export interface ActivityLogItem {
  id: string;
  username: string;
  action: string;
  timestamp: string;
  ipAddress: string;
  status: "Success" | "Failed";
}

export interface UserSettings {
  autoLockTime: number; // in minutes
  requirePasswordOnCopy: boolean; // maps to requireVerificationOnCopy
  twoFactorEnabled: boolean;
  requirePasswordOnAction: boolean;
  autoClearClipboardTime: number; // in seconds
  maxFailedAttempts: number; // 5, 10, or 0 (unlimited)
  lockOnBrowserClose: boolean;
  rememberTrustedDevice: boolean;
}
