# Deletion / Restore Specification (T049a — prerequisite for T049)

Approved-adjustment 5. Defines exactly what deletion touches and proves the **restore-no-resurrect**
property. **The backup reconciliation window is legal-set config, not hard-coded** (G4).

## Scope of a deletion
| Store | On field delete | On subject delete | On account delete |
|-------|-----------------|-------------------|-------------------|
| **Database — medical_items** | physical delete of the row | physical delete all subject rows | all subjects' rows |
| **Database — subject_profiles** | — | physical delete | physical delete all |
| **Database — emergency_selections** | rebuild view | physical delete | physical delete all |
| **Database — emergency_view cache row** | rebuild | delete | delete |
| **Cache (edge/app)** | purge `view:<subject>` | purge | purge |
| **QR credentials** | — | revoke + delete all for subject | revoke + delete all |
| **Access tokens** | — | delete all for subject | delete all |
| **Access logs** | — | delete for subject | delete for subject |
| **Encryption keys (KMS)** | — | **destroy subject key (crypto-shred)** | destroy all subject keys |
| **Audit / security_events** | retained (append-only; no medical content) | retained | retained |
| **Backups** | covered by crypto-shred | covered by crypto-shred | covered by crypto-shred |
| **Search indexes** | n/a (no sensitive index) | n/a | n/a |

## Why crypto-shred covers backups
Every sensitive value is envelope-encrypted with a per-record DEK wrapped by the **subject key** held
in the KMS. Destroying the subject key makes every wrapped DEK un-unwrappable, so the ciphertext —
**wherever it exists, including older backups** — is permanently unrecoverable without rewriting those
backups. The **reconciliation window** (how long a backup could still contain the ciphertext before
rotation) is a **config value set by legal review**, never a hard-coded default.

## Restore-no-resurrect (mandatory test)
1. Create subject + medical item; capture the item's `EncryptedField` (simulating a backup copy).
2. Delete the account (physical delete + **destroy subject key**).
3. "Restore" the captured ciphertext and attempt to decrypt it.
4. **Assert decryption fails** (`KeyDestroyedError`) — the restored backup cannot resurrect the data.

## Order of operations (account delete)
step-up → for each subject: delete items, selections, view, QRs (revoke), tokens, logs → **destroy
subject key** → delete subject → mark account deleted + purge PII → revoke all sessions → append
audit event (no medical content).

## Not deleted (deliberately)
Append-only `security_events` (contain no medical content) are retained for security/audit and any
legal minimum; they reference ids only.
