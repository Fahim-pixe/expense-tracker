import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { scryptAsync } from "@noble/hashes/scrypt.js";

import { normalizeFinanceState, type FinanceState } from "./finance";

const BACKUP_FORMAT = "expense-tracker.backup";
const BACKUP_VERSION = 1;
const KDF_PARAMS = { algorithm: "scrypt" as const, N: 32_768, r: 8, p: 1, dkLen: 32 };
const MIN_PASSPHRASE_LENGTH = 12;

export type BackupRandomBytes = (length: number) => Promise<Uint8Array>;

type BackupEnvelope = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  kdf: typeof KDF_PARAMS;
  salt: string;
  nonce: string;
  ciphertext: string;
  createdAt: string;
};

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: unknown) {
  if (typeof value !== "string" || !/^(?:[\da-f]{2})+$/i.test(value)) throw new Error("The backup file is malformed.");
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}

function isEnvelope(value: unknown): value is BackupEnvelope {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const envelope = value as Record<string, unknown>;
  return envelope.format === BACKUP_FORMAT
    && envelope.version === BACKUP_VERSION
    && typeof envelope.createdAt === "string"
    && typeof envelope.salt === "string"
    && typeof envelope.nonce === "string"
    && typeof envelope.ciphertext === "string"
    && typeof envelope.kdf === "object"
    && envelope.kdf !== null
    && (envelope.kdf as Record<string, unknown>).algorithm === KDF_PARAMS.algorithm
    && (envelope.kdf as Record<string, unknown>).N === KDF_PARAMS.N
    && (envelope.kdf as Record<string, unknown>).r === KDF_PARAMS.r
    && (envelope.kdf as Record<string, unknown>).p === KDF_PARAMS.p
    && (envelope.kdf as Record<string, unknown>).dkLen === KDF_PARAMS.dkLen;
}

async function deriveKey(passphrase: string, salt: Uint8Array) {
  return scryptAsync(passphrase.normalize("NFKC"), salt, KDF_PARAMS);
}

export function validateBackupPassphrase(passphrase: string) {
  const normalized = passphrase.normalize("NFKC");
  if (normalized.length < MIN_PASSPHRASE_LENGTH) return `Use a passphrase of at least ${MIN_PASSPHRASE_LENGTH} characters.`;
  return null;
}

export async function encryptFinanceBackup(state: FinanceState, passphrase: string, randomBytes: BackupRandomBytes) {
  const passphraseError = validateBackupPassphrase(passphrase);
  if (passphraseError) throw new Error(passphraseError);

  const [salt, nonce] = await Promise.all([randomBytes(16), randomBytes(24)]);
  if (salt.length !== 16 || nonce.length !== 24) throw new Error("Secure random values are unavailable on this device.");
  const key = await deriveKey(passphrase, salt);
  try {
    const plaintext = new TextEncoder().encode(JSON.stringify({ state: normalizeFinanceState(state) }));
    const ciphertext = xchacha20poly1305(key, nonce).encrypt(plaintext);
    const envelope: BackupEnvelope = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      kdf: KDF_PARAMS,
      salt: bytesToHex(salt),
      nonce: bytesToHex(nonce),
      ciphertext: bytesToHex(ciphertext),
      createdAt: new Date().toISOString(),
    };
    return JSON.stringify(envelope);
  } finally {
    key.fill(0);
  }
}

export async function decryptFinanceBackup(serializedBackup: string, passphrase: string): Promise<FinanceState> {
  const passphraseError = validateBackupPassphrase(passphrase);
  if (passphraseError) throw new Error(passphraseError);

  let parsed: unknown;
  try {
    parsed = JSON.parse(serializedBackup);
  } catch {
    throw new Error("This is not a readable Expense Tracker backup.");
  }
  if (!isEnvelope(parsed)) throw new Error("This backup uses an unsupported or malformed format.");

  const salt = hexToBytes(parsed.salt);
  const nonce = hexToBytes(parsed.nonce);
  const ciphertext = hexToBytes(parsed.ciphertext);
  if (salt.length !== 16 || nonce.length !== 24 || ciphertext.length < 17) throw new Error("This backup file is incomplete.");
  const key = await deriveKey(passphrase, salt);
  try {
    const decrypted = xchacha20poly1305(key, nonce).decrypt(ciphertext);
    const payload = JSON.parse(new TextDecoder().decode(decrypted)) as { state?: unknown };
    return normalizeFinanceState(payload.state);
  } catch {
    throw new Error("The passphrase is incorrect or the backup file has been altered.");
  } finally {
    key.fill(0);
  }
}
