-- ============================================
-- Supabase Storage Setup for Emergency Contacts
-- Run these commands in Supabase SQL Editor
-- ============================================

-- 1. First, create the storage bucket via Supabase Dashboard:
-- Go to Storage > Create Bucket > Name: "emergency-contacts" > Public: true

-- 2. Create storage policies for the emergency-contacts bucket
-- (Run these AFTER creating the bucket)

-- Allow authenticated users to upload files
INSERT INTO storage.policies (id, bucket_id, name, definition, check_definition, command, roles)
VALUES (
  'emergency-contacts-upload-policy',
  'emergency-contacts',
  'Allow authenticated users to upload emergency contact photos',
  '(auth.role() = ''authenticated'')',
  '(auth.role() = ''authenticated'')',
  'INSERT',
  '{authenticated}'
) ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view files (since they're public)
INSERT INTO storage.policies (id, bucket_id, name, definition, check_definition, command, roles)
VALUES (
  'emergency-contacts-view-policy',
  'emergency-contacts', 
  'Allow anyone to view emergency contact photos',
  'true',
  'true',
  'SELECT',
  '{public, authenticated}'
) ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to update files
INSERT INTO storage.policies (id, bucket_id, name, definition, check_definition, command, roles)
VALUES (
  'emergency-contacts-update-policy',
  'emergency-contacts',
  'Allow authenticated users to update emergency contact photos', 
  '(auth.role() = ''authenticated'')',
  '(auth.role() = ''authenticated'')',
  'UPDATE',
  '{authenticated}'
) ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to delete files
INSERT INTO storage.policies (id, bucket_id, name, definition, check_definition, command, roles)
VALUES (
  'emergency-contacts-delete-policy',
  'emergency-contacts',
  'Allow authenticated users to delete emergency contact photos',
  '(auth.role() = ''authenticated'')',
  '(auth.role() = ''authenticated'')',
  'DELETE', 
  '{authenticated}'
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Verification Queries
-- ============================================

-- Check if policies were created
SELECT 
  'Storage Policies Check' as test,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ PASS - All storage policies created'
    ELSE '❌ FAIL - Missing storage policies'
  END as result
FROM storage.policies 
WHERE bucket_id = 'emergency-contacts';

-- List all policies for emergency-contacts bucket
SELECT 
  'Policy Details' as info,
  name,
  command,
  definition
FROM storage.policies 
WHERE bucket_id = 'emergency-contacts'
ORDER BY command;