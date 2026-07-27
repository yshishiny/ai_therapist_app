-- Migration: FCM push notification support
-- Run after migration_patient_portal.sql

-- Add FCM token column to patient_users
ALTER TABLE patient_users
  ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Index for fast lookup when broadcasting to all patients in an org
CREATE INDEX IF NOT EXISTS idx_patient_users_fcm_token
  ON patient_users (patient_id)
  WHERE fcm_token IS NOT NULL;
