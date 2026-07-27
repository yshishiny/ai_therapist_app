-- Clinicians had no display name (only email) -- Practice Admin's Clinicians
-- view and any "Assigned to" label needs something better than an email
-- address to show.
ALTER TABLE clinicians ADD COLUMN IF NOT EXISTS full_name TEXT;
