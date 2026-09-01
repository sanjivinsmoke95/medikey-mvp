import type { ProjectionResult, DisclosureField, EmergencySection } from "@medikey/core";

/**
 * Server-rendered emergency page (doc 08). Comprehension-first, minimal, no JS on
 * the critical path, no trackers. Faithful to the frozen "SSR, minimal-JS" scanner.
 *
 * Invariants enforced here:
 *   - provenance-or-fail: a field with no provenance is NOT rendered.
 *   - display-not-instruct: facts only; blood group carries the "confirm before
 *     transfusion" caveat; no "give/withhold" directives.
 *   - absence != negation: only stated-negatives render "No known X".
 *   - renders ONLY the projection it is given (L1 for the scanner).
 */

export type PageState =
  | "ok"
  | "revoked"
  | "not_found"
  | "incomplete"
  | "rate_limited"
  | "unavailable";

export interface RenderOptions {
  state: PageState;
  projection?: ProjectionResult;
  lang?: string;
  stale?: boolean;
  lastConfirmed?: string;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const SECTION_ORDER: EmergencySection[] = [
  "name", "age", "allergy", "condition", "medication", "medication_avoidance",
  "implant", "contact", "blood_group", "instruction", "surgery", "injury", "dob",
];

const FOOTER =
  "Shows user-provided information. Not a substitute for clinical judgement. Call emergency services.";

function shell(lang: string, bodyInner: string): string {
  // Strict, tracker-free page. Inline minimal CSS; no external requests.
  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Emergency Medical Information</title>
<style>
:root{color-scheme:light dark}
body{margin:0;font:18px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#fff;color:#111}
main{max-width:640px;margin:0 auto;padding:16px}
h1{font-size:22px;margin:.2em 0}
.crit{border-left:6px solid #b00020;padding:8px 12px;margin:10px 0;background:#fff3f3;color:#111}
.sec{margin:10px 0;padding:8px 12px;border:1px solid #ccc;border-radius:8px}
.label{font-weight:700}
.chip{display:inline-block;font-size:12px;border:1px solid #888;border-radius:10px;padding:1px 8px;margin-left:6px;vertical-align:middle}
.caveat{color:#7a0012;font-size:14px}
a.call{display:inline-block;margin-top:6px;font-size:20px;font-weight:700;text-decoration:none;border:2px solid #0645ad;border-radius:8px;padding:8px 14px}
.banner{background:#fff8e1;border:1px solid #e0c200;padding:8px 12px;border-radius:8px}
footer{margin-top:18px;color:#555;font-size:14px;border-top:1px solid #ddd;padding-top:10px}
@media (prefers-color-scheme:dark){body{background:#111;color:#eee}.sec{border-color:#444}.crit{background:#2a1416;color:#f6d5d8}.caveat{color:#f3a3ab}}
</style>
</head>
<body><main>${bodyInner}</main></body></html>`;
}

function neutral(lang: string, title: string, message: string): string {
  return shell(lang, `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>`);
}

function renderField(f: DisclosureField): string {
  // provenance-or-fail: skip fields without provenance
  if (!f.provenance || f.provenance === "not_provided") return "";
  const chip = `<span class="chip">${escapeHtml(provenanceLabel(f.provenance))}</span>`;
  const critical = f.critical || f.severity === "life_threatening";
  const value = escapeHtml(f.value);

  if (f.section === "contact" && f.tel) {
    return `<div class="sec"><span class="label">${escapeHtml(f.label)}:</span> ${value}${chip}
      <div><a class="call" href="tel:${escapeHtml(f.tel)}">Call emergency contact</a></div></div>`;
  }

  let extra = "";
  if (f.section === "blood_group") {
    // display-not-instruct: caveat, never an order
    extra = `<div class="caveat">user-provided — confirm before transfusion</div>`;
  }
  const cls = critical ? "crit" : "sec";
  const sev = f.severity ? ` <span class="chip">${escapeHtml(f.severity)}</span>` : "";
  return `<div class="${cls}"><span class="label">${escapeHtml(f.label)}:</span> ${value}${sev}${chip}${extra}</div>`;
}

function provenanceLabel(p: string): string {
  switch (p) {
    case "verified": return "verified";
    case "user_confirmed": return "user-confirmed";
    default: return "user-provided";
  }
}

export function renderEmergencyPage(opts: RenderOptions): string {
  const lang = opts.lang ?? "en";

  // Uniform neutral page for revoked AND not_found (no oracle).
  if (opts.state === "revoked" || opts.state === "not_found") {
    return neutral(lang, "MediKey", "This MediKey code is no longer active.");
  }
  if (opts.state === "rate_limited") {
    return neutral(lang, "MediKey", "Too many requests — please wait a moment and try again.");
  }
  if (opts.state === "unavailable") {
    return neutral(
      lang,
      "MediKey temporarily unavailable",
      "Please call your local emergency services. If the person is carrying a printed MediKey card, use it.",
    );
  }

  const fields = opts.projection?.fields ?? [];
  if (opts.state === "incomplete" || fields.length === 0) {
    return shell(
      lang,
      `<h1>Emergency Medical Information</h1><p>Limited information has been provided.</p>
       <footer>${escapeHtml(FOOTER)}</footer>`,
    );
  }

  const byOrder = [...fields].sort(
    (a, b) => SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section),
  );
  const rows = byOrder.map(renderField).filter(Boolean).join("\n");
  const staleBanner = opts.stale
    ? `<div class="banner">Information may be out of date${
        opts.lastConfirmed ? ` (last confirmed ${escapeHtml(opts.lastConfirmed)})` : ""
      }.</div>`
    : "";
  const lastConfirmed = opts.lastConfirmed
    ? `<p>Last confirmed: ${escapeHtml(opts.lastConfirmed)}</p>`
    : "";
  const moreInfo = `<p><a href="?more=1">More information</a> (logged; the owner is notified)</p>`;

  return shell(
    lang,
    `<h1>Emergency Medical Information</h1>
     ${staleBanner}
     ${rows}
     ${moreInfo}
     ${lastConfirmed}
     <footer>${escapeHtml(FOOTER)}</footer>`,
  );
}
