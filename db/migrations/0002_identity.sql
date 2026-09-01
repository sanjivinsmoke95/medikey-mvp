-- M02 — accounts, credentials, sessions (doc 03). 🔒 columns are bytea ciphertext
-- (application-layer envelope encryption). Enums enforced in @medikey/core (zod),
-- not as DB enums, because encrypted values can't be DB-enum-checked.

CREATE TABLE accounts (
  id                 uuid PRIMARY KEY,
  email              citext UNIQUE NOT NULL,
  email_verified_at  timestamptz,
  phone_enc          bytea,                    -- 🔒
  phone_verified_at  timestamptz,
  status             text NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','suspended','pending_deletion','deleted')),
  preferred_language text NOT NULL DEFAULT 'en',
  location_logging_opt_in boolean NOT NULL DEFAULT false,   -- G6: default OFF
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz
);

CREATE TABLE credentials (
  id          uuid PRIMARY KEY,
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('dev','passkey','email_otp','totp')),
  secret_hash text,                            -- dev adapter only (scrypt); never plaintext
  public_key  text,                            -- passkeys store public key only
  label       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX credentials_account_idx ON credentials(account_id);

CREATE TABLE sessions (
  id            uuid PRIMARY KEY,
  account_id    uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash    bytea UNIQUE NOT NULL,         -- session token stored hashed
  auth_strength text NOT NULL CHECK (auth_strength IN ('primary','stepped_up')),
  expires_at    timestamptz NOT NULL,
  revoked_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_account_idx ON sessions(account_id);
