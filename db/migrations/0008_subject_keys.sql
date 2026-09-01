-- M08 — subject_keys (persistent KeyProvider backing for the Postgres deployment).
--
-- In production the per-subject key lives in a managed KMS/HSM (doc 10) and this
-- table would not exist. For a self-contained Postgres deployment it stores each
-- subject key WRAPPED under a master KEK (env MASTER_KEY) — the DB never holds a
-- usable key on its own. Crypto-shred is a tombstone: the wrapped key is nulled
-- and destroyed_at is set, which makes every ciphertext for that subject inert
-- and prevents the key from ever being re-created (no resurrection).
CREATE TABLE subject_keys (
  subject_id   uuid PRIMARY KEY,
  wrapped_key  bytea,                       -- 🔒 subject key, AES-256-GCM wrapped by MASTER_KEY; NULL once shredded
  destroyed_at timestamptz,                 -- tombstone: set on crypto-shred, blocks re-creation
  created_at   timestamptz NOT NULL DEFAULT now()
);
