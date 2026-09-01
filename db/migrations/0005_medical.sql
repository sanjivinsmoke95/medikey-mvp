-- M05 — medical items (doc 03 / implementation note in phase report).
-- Sensitive fields are stored as ONE envelope-encrypted payload (data_enc) plus
-- non-sensitive metadata columns. Because the sensitive fields are ciphertext they
-- are not independently queryable regardless, so a single typed table is used
-- instead of per-type tables (same encryption + provenance + disclosure guarantees).

CREATE TABLE medical_items (
  id                       uuid PRIMARY KEY,
  subject_id               uuid NOT NULL REFERENCES subject_profiles(id) ON DELETE CASCADE,
  type                     text NOT NULL CHECK (type IN
                             ('blood_group','allergy','condition','medication','medication_avoidance',
                              'implant','surgery','injury','emergency_contact')),
  data_enc                 bytea NOT NULL,   -- 🔒 encrypted JSON of the item's fields
  provenance               text NOT NULL DEFAULT 'user_provided'
                             CHECK (provenance IN ('not_provided','user_provided','user_confirmed','verified')),
  is_critical              boolean NOT NULL DEFAULT false,
  severity                 text,
  none_known               boolean NOT NULL DEFAULT false,   -- stated-negative (positive assertion)
  none_known_confirmed_at  timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  last_confirmed_at        timestamptz
);
CREATE INDEX medical_items_subject_idx ON medical_items(subject_id);
