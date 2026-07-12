import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";
import { getConfig } from "./config";

/**
 * Document-payload encryption. Contents are encrypted with AES-256-GCM before
 * they're written on-chain, so the public ledger only stores an opaque blob.
 * The key is derived from the wallet's PRIVATE_KEY — so only the key owner can
 * decrypt. (This is real encryption; a SHA-256 hash would be one-way and could
 * never be read back.)
 *
 * On-chain format:  enc:v1:<base64( iv[12] | tag[16] | ciphertext )>
 * Anything without the enc:v1: prefix is treated as legacy plaintext, so
 * documents written before encryption was added still read fine.
 */

const PREFIX = "enc:v1:";
const SALT = "blockchaindb:enc:v1"; // fixed, non-secret; the key material is the secret

// scrypt is deliberately slow, so cache the derived key per private key.
let cache: { pk: string; key: Buffer } | null = null;

function keyMaterial(): Buffer | null {
  const { privateKey } = getConfig();
  if (!privateKey) return null;
  if (cache && cache.pk === privateKey) return cache.key;
  const key = scryptSync(privateKey, SALT, 32);
  cache = { pk: privateKey, key };
  return key;
}

/** True when a wallet key is configured, so writes will be encrypted. */
export function isEncryptionAvailable(): boolean {
  return keyMaterial() !== null;
}

export function isEncrypted(stored: string): boolean {
  return stored.startsWith(PREFIX);
}

/** Encrypt a payload for on-chain storage. Falls back to plaintext only if no
 *  key is configured (writes always have a key, so that path is unreachable). */
export function encryptData(plaintext: string): string {
  const key = keyMaterial();
  if (!key) return plaintext;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export interface Decrypted {
  /** decrypted plaintext, or null when locked */
  text: string | null;
  /** was the stored value an encrypted blob? */
  encrypted: boolean;
  /** encrypted but we can't read it (no key, wrong key, or tampered) */
  locked: boolean;
}

/** Decrypt an on-chain value. Plaintext values pass through unchanged. */
export function decryptData(stored: string): Decrypted {
  if (!isEncrypted(stored)) {
    return { text: stored, encrypted: false, locked: false };
  }
  const key = keyMaterial();
  if (!key) return { text: null, encrypted: true, locked: true };
  try {
    const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
    return { text: plaintext, encrypted: true, locked: false };
  } catch {
    return { text: null, encrypted: true, locked: true };
  }
}
