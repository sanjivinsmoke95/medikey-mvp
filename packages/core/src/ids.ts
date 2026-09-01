import { v7 as uuidv7 } from "uuid";

/** Time-ordered, non-sequential id (UUIDv7) — avoids IDOR-friendly integer ids. */
export function newId(): string {
  return uuidv7();
}
