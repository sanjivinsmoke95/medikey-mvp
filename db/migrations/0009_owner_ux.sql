-- M09 — owner-UX additions (kept behind the same encryption/disclosure guarantees).
--
-- 1) Extended personal details as ONE encrypted JSON blob on the subject
--    ({gender, phone, address, photo}) — same 🔒 pattern as full_name_enc, so the
--    DB only ever holds ciphertext. Kept off the medical tables (it's identity).
-- 2) A 'document' medical item type for X-rays / reports. The image itself lives
--    inside the item's already-encrypted data_enc payload (base64 data URL), so no
--    new storage surface and no plaintext at rest. Documents are L3-class in the
--    disclosure engine (never reachable from a scan).
ALTER TABLE subject_profiles ADD COLUMN extras_enc bytea;   -- 🔒 {gender,phone,address,photo}

ALTER TABLE medical_items DROP CONSTRAINT medical_items_type_check;
ALTER TABLE medical_items ADD CONSTRAINT medical_items_type_check CHECK (type IN
  ('blood_group','allergy','condition','medication','medication_avoidance',
   'implant','surgery','injury','emergency_contact','document'));
