-- M01 — extensions + helpers (doc 03). Postgres (staging/prod). Local dev may use
-- the in-memory adapter; this schema backs the Postgres adapter.

-- UUIDv7 generation is provided in the application layer (uuid npm). pgcrypto is
-- available for gen_random_uuid() as a fallback only.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
