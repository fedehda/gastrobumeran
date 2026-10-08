import crypto from "node:crypto";

const MASTER_SECRET = process.env.APP_SECRET || "gastrobumeran-saas-master-key-2026-secure-vault";
const KEY = crypto.createHash("sha256").update(MASTER_SECRET).digest();
const ALGORITHM = "aes-256-gcm";

/**
 * Encrypts a string (e.g. POS API Key, Secret) using AES-256-GCM.
 * Output format: `enc:ivHex:tagHex:cipherHex`
 */
export function encryptCredential(plainText: string): string {
  if (!plainText || !plainText.trim()) return "";
  if (plainText.startsWith("enc:")) return plainText; // Already encrypted

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag().toString("hex");
  const ivHex = iv.toString("hex");

  return `enc:${ivHex}:${tag}:${encrypted}`;
}

/**
 * Decrypts a string encrypted with `encryptCredential`.
 * If not in `enc:` format (legacy plain text), returns the original string gracefully.
 */
export function decryptCredential(cipherText: string): string {
  if (!cipherText || !cipherText.trim()) return "";
  if (!cipherText.startsWith("enc:")) return cipherText; // Legacy unencrypted

  try {
    const parts = cipherText.split(":");
    if (parts.length !== 4) return cipherText;

    const [, ivHex, tagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    console.warn("Aviso: No se pudo descifrar la credencial (retornando original):", err);
    return cipherText;
  }
}
