/**
 * Structured logging + redaction (doc 11, matrix #13).
 * Medical data, secrets, tokens and identifiers must NEVER reach logs.
 * We redact by KEY (allow-list mindset) and never interpolate raw domain
 * objects into messages.
 */

const SENSITIVE_KEY = new RegExp(
  [
    "pass",
    "secret",
    "token",
    "pepper",
    "\\bkey\\b",
    "dek",
    "ssn",
    "aadhaar",
    "pan",
    "dob",
    "dateofbirth",
    "name",
    "phone",
    "email",
    "address",
    "allerg",
    "medication",
    "condition",
    "diagnos",
    "implant",
    "surger",
    "injur",
    "blood",
    "insurance",
    "value",
    "payload",
    "ciphertext",
    "identifier",
    "attestation",
    "ip",
  ].join("|"),
  "i",
);

const REDACTED = "[redacted]";

export function redact(input: unknown, depth = 0): unknown {
  if (depth > 6) return REDACTED;
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) return input.map((v) => redact(v, depth + 1));
  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k) ? REDACTED : redact(v, depth + 1);
    }
    return out;
  }
  return input;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  msg: string;
  fields: Record<string, unknown>;
  time: string;
}

export interface Logger {
  log(level: LogLevel, msg: string, fields?: Record<string, unknown>): void;
  child(bound: Record<string, unknown>): Logger;
}

/** Create a redacting structured logger. `sink` defaults to console. */
export function createLogger(
  sink: (entry: LogEntry) => void = (e) => console.log(JSON.stringify(e)),
  bound: Record<string, unknown> = {},
): Logger {
  return {
    log(level, msg, fields = {}) {
      sink({
        level,
        msg,
        fields: redact({ ...bound, ...fields }) as Record<string, unknown>,
        time: new Date().toISOString(),
      });
    },
    child(extra) {
      return createLogger(sink, { ...bound, ...extra });
    },
  };
}
