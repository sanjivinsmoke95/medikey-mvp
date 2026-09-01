-- M06 — emergency_selections (the disclosure allow-list) + emergency_view cache.

CREATE TABLE emergency_selections (
  id         uuid PRIMARY KEY,
  subject_id uuid NOT NULL REFERENCES subject_profiles(id) ON DELETE CASCADE,
  field_ref  text NOT NULL,   -- e.g. 'item:<uuid>', 'name', 'age', 'dob', 'instructions'
  tier       text NOT NULL CHECK (tier IN ('l1_critical','l2_additional','l3_sensitive')),
  UNIQUE (subject_id, field_ref)
);
CREATE INDEX emergency_selections_subject_idx ON emergency_selections(subject_id);

-- Materialised L1-only payload. Rebuilt on any relevant change; edge-cacheable.
CREATE TABLE emergency_view (
  subject_id uuid PRIMARY KEY REFERENCES subject_profiles(id) ON DELETE CASCADE,
  payload_enc bytea NOT NULL,   -- 🔒 L1-only projection (built via project(l1))
  built_at    timestamptz NOT NULL DEFAULT now()
);
