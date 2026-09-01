import {
  type DisclosureLevel,
  type DisclosureTier,
  type Provenance,
  TIER_RANK,
  LEVEL_RANK,
  isScannerLevel,
} from "./tiers";

/**
 * CRITICAL SECURITY BOUNDARY (adjustment 6 / doc 07 / doc 04 over-disclosure proof).
 *
 * `project()` is the SINGLE disclosure engine. Every scanner, preview and
 * break-glass response MUST be produced by it. No other module may implement
 * medical-field disclosure logic.
 *
 * Guarantees (tested exhaustively in project.test.ts):
 *   - Output contains only fields whose tier rank <= the requested level rank.
 *   - For any scanner level (l1, l2) an l3_sensitive field is NEVER included,
 *     enforced by an explicit hard guard in addition to the rank comparison.
 *   - The function is PURE: no I/O, no DB, no network, no mutation of input.
 */

export type EmergencySection =
  | "name"
  | "age"
  | "blood_group"
  | "allergy"
  | "condition"
  | "medication"
  | "medication_avoidance"
  | "implant"
  | "surgery"
  | "injury"
  | "contact"
  | "instruction"
  | "dob"
  | "document"
  | "insurance"
  | "address";

export interface DisclosureField {
  readonly fieldRef: string;
  readonly tier: DisclosureTier;
  readonly section: EmergencySection;
  readonly label: string;
  /** Already-decrypted display string. The engine never decrypts. */
  readonly value: string;
  readonly provenance: Provenance;
  readonly critical?: boolean;
  readonly severity?: string;
  /** Optional tap-to-call target (emergency contacts only). Digits minimised in UI. */
  readonly tel?: string;
  /** Marks a stated-negative ("no known X"), so the UI shows an explicit negative. */
  readonly noneKnown?: boolean;
}

export interface ProjectionResult {
  readonly level: DisclosureLevel;
  readonly fields: readonly DisclosureField[];
}

export function project(
  fields: readonly DisclosureField[],
  level: DisclosureLevel,
): ProjectionResult {
  const maxRank = LEVEL_RANK[level];
  const scanner = isScannerLevel(level);

  const included = fields.filter((f) => {
    // Hard guard: scanner levels can NEVER receive l3, independent of ranks.
    if (scanner && f.tier === "l3_sensitive") return false;
    return TIER_RANK[f.tier] <= maxRank;
  });

  return { level, fields: included };
}

/** True if a field of `tier` may ever be exposed at `level`. */
export function tierAllowedAtLevel(
  tier: DisclosureTier,
  level: DisclosureLevel,
): boolean {
  if (isScannerLevel(level) && tier === "l3_sensitive") return false;
  return TIER_RANK[tier] <= LEVEL_RANK[level];
}
