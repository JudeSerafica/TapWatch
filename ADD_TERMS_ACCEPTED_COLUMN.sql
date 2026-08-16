-- ============================================
-- Migration: Add terms_accepted_at and verification_modal_seen_at to profiles
-- Run this in Supabase SQL Editor
-- ============================================

-- Terms of Use acceptance timestamp (NULL = not yet accepted)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ DEFAULT NULL;

-- Verification modal seen timestamp (NULL = not yet seen)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS verification_modal_seen_at TIMESTAMPTZ DEFAULT NULL;

-- ============================================
-- Verification
-- ============================================
SELECT
  column_name,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ Column exists'
    ELSE '❌ Column missing'
  END AS result
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('terms_accepted_at', 'verification_modal_seen_at')
GROUP BY column_name;
