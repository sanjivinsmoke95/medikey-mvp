import {
  type Ciphertext,
  encryptWithKey,
  decryptWithKey,
  randomKey,
} from "../crypto/primitives";

/**
 * KeyProvider port (doc 10). Manages a per-subject key used to wrap per-record
 * data keys (envelope encryption). Destroying a subject key CRYPTO-SHREDS all of
 * that subject's data everywhere it appears, including backups (doc 16).
 *
 * There is deliberately NO bulk-decrypt / export-all operation (matrix #17).
 * Production adapters back this with a managed KMS/HSM; the LocalKeyProvider is
 * for local-first dev/test only.
 */
export interface KeyProvider {
  ensureSubjectKey(subjectId: string): Promise<void>;
  hasSubjectKey(subjectId: string): boolean;
  wrapDek(subjectId: string, dek: Buffer): Promise<Ciphertext>;
  unwrapDek(subjectId: string, wrapped: Ciphertext): Promise<Buffer>;
  /** Crypto-shred: irreversibly destroy the subject key. */
  destroySubjectKey(subjectId: string): Promise<void>;
}

export class KeyDestroyedError extends Error {
  constructor(subjectId: string) {
    super(`subject key unavailable (destroyed or missing): ${subjectId}`);
    this.name = "KeyDestroyedError";
  }
}

/**
 * Local, in-memory KeyProvider for development/test. NOT for production.
 * Holds subject keys in memory only; a real deployment uses a cloud KMS.
 */
export class LocalKeyProvider implements KeyProvider {
  private readonly keys = new Map<string, Buffer>();
  private readonly destroyed = new Set<string>();

  async ensureSubjectKey(subjectId: string): Promise<void> {
    if (this.destroyed.has(subjectId)) throw new KeyDestroyedError(subjectId);
    if (!this.keys.has(subjectId)) this.keys.set(subjectId, randomKey());
  }

  hasSubjectKey(subjectId: string): boolean {
    return this.keys.has(subjectId);
  }

  private key(subjectId: string): Buffer {
    const k = this.keys.get(subjectId);
    if (!k) throw new KeyDestroyedError(subjectId);
    return k;
  }

  async wrapDek(subjectId: string, dek: Buffer): Promise<Ciphertext> {
    return encryptWithKey(this.key(subjectId), dek.toString("base64"));
  }

  async unwrapDek(subjectId: string, wrapped: Ciphertext): Promise<Buffer> {
    const b64 = decryptWithKey(this.key(subjectId), wrapped);
    return Buffer.from(b64, "base64");
  }

  async destroySubjectKey(subjectId: string): Promise<void> {
    this.keys.delete(subjectId);
    this.destroyed.add(subjectId);
  }
}
