-- ============================================
-- Emergency Contacts Table Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create emergency_contacts table
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  photo_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS (Row Level Security)
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

-- 3. Create policies for emergency_contacts
-- Allow all authenticated users to read emergency contacts
CREATE POLICY "Anyone can view active emergency contacts" ON emergency_contacts
  FOR SELECT USING (is_active = TRUE);

-- Allow all authenticated users to view all contacts (for admin purposes)
CREATE POLICY "Authenticated users can view all emergency contacts" ON emergency_contacts
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow all authenticated users to insert emergency contacts
-- ⚠️ SECURITY FIX: Only admins can manage emergency contacts
CREATE POLICY "Admins can manage emergency contacts" ON emergency_contacts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_position ON emergency_contacts(position);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_active ON emergency_contacts(is_active);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_name ON emergency_contacts(name);

-- 5. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_emergency_contacts_updated_at 
    BEFORE UPDATE ON emergency_contacts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Insert sample data (optional)
INSERT INTO emergency_contacts (name, position, phone, email, is_active) VALUES
  ('Sample Punong Barangay', 'Punong Barangay', '09171234567', 'captain@easttapinac.gov.ph', true),
  ('Sample Kagawad 1', 'Barangay Kagawad 1', '09178881111', 'kagawad1@easttapinac.gov.ph', true),
  ('Sample Secretary', 'Barangay Secretary', '09179999999', 'secretary@easttapinac.gov.ph', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- Verification Query - Run this to check if everything worked
-- ============================================

-- Check if table was created successfully
SELECT 
  'Table Check' as test,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'emergency_contacts')
    THEN '✅ PASS - emergency_contacts table created'
    ELSE '❌ FAIL - Table not created'
  END as result;

-- Check if RLS is enabled
SELECT 
  'RLS Check' as test,
  CASE 
    WHEN rowsecurity THEN '✅ PASS - RLS enabled'
    ELSE '❌ FAIL - RLS not enabled'
  END as result
FROM pg_tables 
WHERE tablename = 'emergency_contacts';

-- Check policies
SELECT 
  'Policies Check' as test,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ PASS - Has policies'
    ELSE '❌ FAIL - Missing policies'
  END as result
FROM pg_policies 
WHERE tablename = 'emergency_contacts';

-- Check sample data
SELECT 
  'Sample Data Check' as test,
  COUNT(*) as record_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ PASS - Has sample data'
    ELSE 'ℹ️ No sample data (that''s OK)'
  END as result
FROM emergency_contacts;

-- Show current records
SELECT 'Current Records:' as info, * FROM emergency_contacts ORDER BY created_at DESC;

-- ============================================
-- SECURITY: Protect profiles.role from self-elevation
-- Run this in Supabase SQL Editor to ensure residents
-- cannot UPDATE their own role to 'admin'.
-- ============================================

-- Drop any overly permissive existing UPDATE policy on profiles
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Recreate: users can update their own row but NOT change the role column
CREATE POLICY "Users update own profile but not role" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );