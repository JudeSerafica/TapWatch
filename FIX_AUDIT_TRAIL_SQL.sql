-- 🔧 URGENT: Fix Audit Trail Database Schema
-- Run these SQL commands in your Supabase SQL Editor

-- 1. FIRST, CHECK CURRENT COLUMNS
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'audit_logs' 
ORDER BY ordinal_position;

-- 2. IF MISSING, ADD THE REQUIRED COLUMNS
DO $$ 
BEGIN
  -- Add old_values column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' 
    AND column_name = 'old_values'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN old_values TEXT;
    RAISE NOTICE 'Added old_values column';
  ELSE
    RAISE NOTICE 'old_values column already exists';
  END IF;
  
  -- Add new_values column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' 
    AND column_name = 'new_values'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN new_values TEXT;
    RAISE NOTICE 'Added new_values column';
  ELSE
    RAISE NOTICE 'new_values column already exists';
  END IF;
END $$;

-- 3. OPTIONAL: RENAME 'changes' COLUMN IF IT EXISTS AND YOU WANT TO USE IT
DO $$
BEGIN
  -- Check if 'changes' column exists and you want to rename it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' 
    AND column_name = 'changes'
  ) THEN
    -- Option A: Rename changes to old_values
    -- ALTER TABLE audit_logs RENAME COLUMN changes TO old_values;
    
    -- Option B: Keep both columns and copy data
    -- UPDATE audit_logs SET old_values = changes WHERE old_values IS NULL;
    
    RAISE NOTICE 'Found "changes" column. Decide whether to rename or keep both.';
  END IF;
END $$;

-- 4. CHECK DATABASE TRIGGERS THAT MIGHT BE FAILING
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'audit_logs'::regclass;

-- 5. TEMPORARY FIX: DISABLE TRIGGERS (if emergency)
-- DISABLE TRIGGER ALL ON audit_logs;
-- DISABLE TRIGGER ALL ON incidents;

-- 6. CHECK INCIDENTS TABLE FOR ANY TRIGGERS
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'incidents'::regclass;

-- 7. FIX THE TRIGGER FUNCTION (if you know which one is failing)
-- Find the trigger function first, then fix its SQL

-- 8. VERIFY THE FIX
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'audit_logs' 
ORDER BY ordinal_position;

-- 9. TEST AUDIT LOGGING (using existing user if available)
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Try to get an existing user ID for testing
  SELECT id INTO test_user_id FROM profiles LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    INSERT INTO audit_logs (
      event_type,
      user_id,
      action,
      old_values,
      new_values,
      created_at
    ) VALUES (
      'test_event',
      test_user_id,
      'Test action',
      'old value',
      'new value',
      NOW()
    );
    
    RAISE NOTICE 'Test audit log inserted with user_id: %', test_user_id;
    
    -- Clean up test
    DELETE FROM audit_logs WHERE event_type = 'test_event';
    
    RAISE NOTICE 'Test audit log cleaned up';
  ELSE
    -- Skip test if no users exist
    RAISE NOTICE 'No users found, skipping audit log test';
  END IF;
END $$;

-- 10. TEST WITHOUT FOREIGN KEY (if absolutely necessary)
-- WARNING: This disables foreign key checks temporarily
-- SET session_replication_role = 'replica';
-- INSERT INTO audit_logs (
--   event_type,
--   user_id,
--   action,
--   old_values,
--   new_values,
--   created_at
-- ) VALUES (
--   'test_event_2',
--   '00000000-0000-0000-0000-000000000000',
--   'Test action 2',
--   'old',
--   'new',
--   NOW()
-- );
-- SET session_replication_role = 'origin';
-- DELETE FROM audit_logs WHERE event_type = 'test_event_2';

-- ✅ AFTER FIXING THE DATABASE:
-- 1. Status updates should save properly
-- 2. No more "column old_values does not exist" errors
-- 3. Audit trail will work correctly
-- 4. No transaction rollbacks

-- 🚨 IMPORTANT: Backup your database before running any schema changes!