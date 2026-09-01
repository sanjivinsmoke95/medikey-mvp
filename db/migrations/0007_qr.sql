-- M07 — qr_identifiers + access_tokens + access_logs (doc 03).

CREATE TABLE qr_identifiers (
  id               uuid PRIMARY KEY,
  subject_id       uuid NOT NULL REFERENCES subject_profiles(id) ON DELETE CASCADE,
  identifier_hash  bytea UNIQUE NOT NULL,   -- HMAC(pepper, opaque-id); plaintext NEVER stored
  label            text NOT NULL,
  status           text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','compromised')),
  activation_state text NOT NULL DEFAULT 'active' CHECK (activation_state IN ('preprovisioned','active','superseded')),
  replaced_by      uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  revoked_at       timestamptz
);
CREATE INDEX qr_identifiers_subject_idx ON qr_identifiers(subject_id);

CREATE TABLE access_tokens (
  id               uuid PRIMARY KEY,
  subject_id       uuid NOT NULL REFERENCES subject_profiles(id) ON DELETE CASCADE,
  token_hash       bytea UNIQUE NOT NULL,
  grant_type       text NOT NULL CHECK (grant_type IN ('owner_approval','one_time_code','preissued','break_glass')),
  disclosure_level text NOT NULL DEFAULT 'l2' CHECK (disclosure_level = 'l2'),  -- L2 ONLY; no l3 mint path
  scope            text,
  attestation_enc  bytea,
  expires_at       timestamptz NOT NULL,
  used_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX access_tokens_subject_idx ON access_tokens(subject_id);

CREATE TABLE access_logs (
  id               uuid PRIMARY KEY,
  subject_id       uuid,
  qr_identifier_id uuid,
  access_type      text NOT NULL CHECK (access_type IN ('anonymous','break_glass','contact_approved','professional','owner')),
  level            text NOT NULL CHECK (level IN ('l1','l2')),
  status           text NOT NULL CHECK (status IN ('shown','revoked','not_found','rate_limited','denied')),
  ua_family        text,
  city             text,              -- only if owner opted in (G6); coarse, IP-truncated
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX access_logs_subject_created_idx ON access_logs(subject_id, created_at DESC);
