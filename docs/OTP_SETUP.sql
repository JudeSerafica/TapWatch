-- OTP System Database Setup
-- Run this SQL in Supabase to create the otp_codes table

CREATE TABLE IF NOT EXISTS otp_codes (
  id BIGSERIAL PRIMARY KEY,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX idx_otp_phone ON otp_codes(phone);
CREATE INDEX idx_otp_code ON otp_codes(code);
CREATE INDEX idx_otp_expires_at ON otp_codes(expires_at);
CREATE INDEX idx_otp_is_used ON otp_codes(is_used);

-- Enable RLS (Row Level Security) if needed
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- Optional: Create a policy to allow inserts for OTP generation
CREATE POLICY "Allow insert OTP codes" ON otp_codes
  FOR INSERT
  WITH CHECK (true);

-- Optional: Create a policy to allow selects for OTP verification
CREATE POLICY "Allow select OTP codes" ON otp_codes
  FOR SELECT
  USING (true);

-- Optional: Create a policy to allow updates for marking OTP as used
CREATE POLICY "Allow update OTP codes" ON otp_codes
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
