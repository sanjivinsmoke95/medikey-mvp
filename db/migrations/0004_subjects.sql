-- M04 — subject_profiles + blood_info (doc 03). 🔒 columns are bytea ciphertext.

CREATE TABLE subject_profiles (
  id                       uuid PRIMARY KEY,
  account_id               uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  relationship             text NOT NULL CHECK (relationship IN ('self','child','parent','dependent','other')),
  full_name_enc            bytea NOT NULL,   -- 🔒
  dob_enc                  bytea,            -- 🔒 (age derived; DOB itself is L2)
  age_years                int,              -- derived, non-identifying (safe for L1)
  preferred_language       text,
  emergency_instructions_enc bytea,          -- 🔒 user-authored
  guardian_consent_id      uuid,             -- required before a minor dependent goes live [LEGAL]
  last_reviewed_at         timestamptz,
  last_confirmed_at        timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX subject_profiles_account_idx ON subject_profiles(account_id);

-- Blood group is modelled as a medical item (type='blood_group') in M05 so it flows
-- through the same disclosure engine and provenance rules. Its L1 rendering carries
-- the mandatory "user-provided — confirm before transfusion" caveat (clinical safety).
