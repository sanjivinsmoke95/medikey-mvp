#!/usr/bin/env node
/**
 * Minimal secret + medical-data leak scanner (T002).
 *
 * A defense-in-depth CI gate. It is NOT a substitute for a real secret-scanning
 * service, but it fails the build on obvious mistakes: committed .env files,
 * private keys, hard-coded credentials. Extended by later tasks.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const IGNORE_DIRS = new Set(["node_modules", "dist", ".git", ".turbo", "coverage"]);
const SCAN_EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".yml", ".yaml", ".env"]);

const PATTERNS = [
  { name: "Private key block", re: /-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: "AWS access key id", re: /AKIA[0-9A-Z]{16}/ },
  { name: "Generic hard-coded secret assignment", re: /(secret|password|passwd|api[_-]?key|token)\s*[:=]\s*["'][A-Za-z0-9/+=_-]{16,}["']/i },
];

const FORBIDDEN_FILES = [/^\.env$/, /^\.env\.(?!example$).+/];

let findings = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const rel = p.slice(ROOT.length + 1);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (!IGNORE_DIRS.has(entry)) walk(p);
      continue;
    }
    // committed env files (other than .env.example) are forbidden
    if (FORBIDDEN_FILES.some((re) => re.test(entry))) {
      findings.push(`${rel}: committed env file (secrets must never be committed)`);
      continue;
    }
    if (!SCAN_EXT.has(extname(entry))) continue;
    let text;
    try {
      text = readFileSync(p, "utf8");
    } catch {
      continue;
    }
    for (const { name, re } of PATTERNS) {
      if (re.test(text)) findings.push(`${rel}: ${name}`);
    }
  }
}

walk(ROOT);

if (findings.length > 0) {
  console.error("SECRET SCAN FAILED:\n" + findings.map((f) => "  - " + f).join("\n"));
  process.exit(1);
}
console.log("secret-scan: clean");
