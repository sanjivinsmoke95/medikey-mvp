import {
  randomBytes,
  createHmac,
  createCipheriv,
  createDecipheriv,
  timingSafeEqual,
} from "node:crypto";

/**
 * Thin wrappers over Node's vetted `crypto` library (adjustment 2).
 * MediKey implements the ENVELOPE / KMS protocol (see kms/), NOT primitives.
 * Nothing here invents a cipher or hash.
 */

/** ≥128-bit URL-safe opaque identifier (QR credential). */
export function randomIdentifier(): string {
  return randomBytes(16).toString("base64url");
}

/** High-entropy URL-safe token (access/session tokens). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** 256-bit key material. */
export function randomKey(): Buffer {
  return randomBytes(32);
}

/** HMAC-SHA256 hex digest (identifier/token hashing with a server pepper). */
export function hmacHex(pepper: string, value: string): string {
  return createHmac("sha256", pepper).update(value).digest("hex");
}

/** Constant-time comparison of two hex strings. */
export function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ab.length !== bb.length || ab.length === 0) return false;
  return timingSafeEqual(ab, bb);
}

export interface Ciphertext {
  readonly iv: string; // base64
  readonly tag: string; // base64
  readonly data: string; // base64
}

/** AES-256-GCM authenticated encryption with a 32-byte key. */
export function encryptWithKey(key: Buffer, plaintext: string): Ciphertext {
  if (key.length !== 32) throw new Error("key must be 32 bytes");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: data.toString("base64"),
  };
}

export function decryptWithKey(key: Buffer, ct: Ciphertext): string {
  if (key.length !== 32) throw new Error("key must be 32 bytes");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ct.iv, "base64"));
  decipher.setAuthTag(Buffer.from(ct.tag, "base64"));
  const out = Buffer.concat([
    decipher.update(Buffer.from(ct.data, "base64")),
    decipher.final(),
  ]);
  return out.toString("utf8");
}
