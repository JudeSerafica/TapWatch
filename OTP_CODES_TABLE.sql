-- Run this in your Supabase SQL Editor
-- Creates a temporary OTP storage table for signup verification

CREATE TABLE IF NOT EXISTS otp_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  code text NOT NULL,
  password text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Only service role can read/write (bypasses RLS)
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- Auto-delete expired OTPs (optional cleanup policy)
-- You can also run this manually or via a cron job:
-- DELETE FROM otp_codes WHERE expires_at < now();
