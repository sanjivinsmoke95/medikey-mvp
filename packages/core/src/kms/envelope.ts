import { type KeyProvider } from "./key-provider";
import {
  type Ciphertext,
  encryptWithKey,
  decryptWithKey,
  randomKey,
} from "../crypto/primitives";

/**
 * Envelope-encrypted field: the value is encrypted with a per-record data key
 * (DEK); the DEK is wrapped by the subject key held in the KeyProvider (KMS).
 * A raw dump of EncryptedField yields only ciphertext.
 */
export interface EncryptedField {
  readonly wrappedDek: Ciphertext;
  readonly value: Ciphertext;
}

export class EnvelopeCrypto {
  constructor(private readonly keys: KeyProvider) {}

  async encryptField(subjectId: string, plaintext: string): Promise<EncryptedField> {
    await this.keys.ensureSubjectKey(subjectId);
    const dek = randomKey();
    const value = encryptWithKey(dek, plaintext);
    const wrappedDek = await this.keys.wrapDek(subjectId, dek);
    // dek goes out of scope; never persisted in plaintext
    return { wrappedDek, value };
  }

  async decryptField(subjectId: string, field: EncryptedField): Promise<string> {
    const dek = await this.keys.unwrapDek(subjectId, field.wrappedDek);
    return decryptWithKey(dek, field.value);
  }
}
