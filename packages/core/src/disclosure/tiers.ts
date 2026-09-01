/** Provenance states (doc 16 / clinical-safety §21). Absence is NOT negation. */
export const PROVENANCE = [
  "not_provided",
  "user_provided",
  "user_confirmed",
  "verified",
] as const;
export type Provenance = (typeof PROVENANCE)[number];

/** The tier a field is assigned to in the disclosure allow-list. */
export const DISCLOSURE_TIER = [
  "l1_critical",
  "l2_additional",
  "l3_sensitive",
] as const;
export type DisclosureTier = (typeof DISCLOSURE_TIER)[number];

/** The level a caller is authorised for. Scanner paths use only l1/l2. */
export const DISCLOSURE_LEVEL = ["l1", "l2", "l3"] as const;
export type DisclosureLevel = (typeof DISCLOSURE_LEVEL)[number];

export const TIER_RANK: Record<DisclosureTier, number> = {
  l1_critical: 1,
  l2_additional: 2,
  l3_sensitive: 3,
};

export const LEVEL_RANK: Record<DisclosureLevel, number> = {
  l1: 1,
  l2: 2,
  l3: 3,
};

/** A scanner-reachable level (never permitted to see l3). */
export function isScannerLevel(level: DisclosureLevel): boolean {
  return level === "l1" || level === "l2";
}
