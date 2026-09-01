-- M03 — consents (doc 03). Backs DPDP consent + opt-ins (location_logging absent
-- ⇒ off). Withdrawal recorded, never deleted.

CREATE TABLE consents (
  id             uuid PRIMARY KEY,
  account_id     uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  subject_id     uuid,
  purpose        text NOT NULL,   -- account | emergency_disclosure | break_glass | location_logging | guardian | ...
  notice_version text NOT NULL,
  granted_at     timestamptz NOT NULL DEFAULT now(),
  withdrawn_at   timestamptz
);
CREATE INDEX consents_account_idx ON consents(account_id);

-- Append-only security/audit events (created early; used across modules).
CREATE TABLE security_events (
  id         uuid PRIMARY KEY,
  account_id uuid,
  subject_id uuid,
  type       text NOT NULL,
  detail     jsonb NOT NULL DEFAULT '{}'::jsonb,  -- redacted; never medical content
  severity   text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warn','critical')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX security_events_created_idx ON security_events(created_at);
-- Application role is granted INSERT/SELECT only (no UPDATE/DELETE) — append-only.
