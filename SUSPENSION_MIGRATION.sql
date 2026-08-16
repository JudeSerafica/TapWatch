-- ============================================
-- Migration: Add suspension columns to profiles
-- Run this in Supabase SQL Editor
-- ============================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suspension_started_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS suspension_expires_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS suspended_by UUID DEFAULT NULL;

-- Create suspension_history table for audit trail
CREATE TABLE IF NOT EXISTS suspension_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  suspended_by UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('suspend', 'unsuspend', 'expire')),
  duration_label TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE suspension_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage suspension history"
  ON suspension_history FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('is_suspended','suspension_started_at','suspension_expires_at','suspension_reason','suspended_by');
