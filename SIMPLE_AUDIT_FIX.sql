-- 🔧 SIMPLE FIX: Add missing audit_logs columns
-- Run ONLY Steps 1-3 in Supabase SQL Editor

-- 1. CHECK CURRENT COLUMNS (optional)
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'audit_logs' 
-- ORDER BY ordinal_position;

-- 2. ADD MISSING COLUMNS (REQUIRED)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_values TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_values TEXT;

-- 3. VERIFY COLUMNS WERE ADDED (optional)
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'audit_logs' 
-- ORDER BY ordinal_position;

-- 4. CHECK TRIGGERS ON INCIDENTS TABLE (optional)
-- SELECT 
--   tgname as trigger_name,
--   tgrelid::regclass as table_name,
--   proname as function_name
-- FROM pg_trigger t
-- JOIN pg_proc p ON t.tgfoid = p.oid
-- WHERE tgrelid = 'incidents'::regclass;

-- ✅ AFTER RUNNING THIS:
-- 1. Status updates should work without rollback
-- 2. No more "column old_values does not exist" errors
-- 3. Audit trail will log properly
-- 4. Status changes will save to database permanently

-- 🎯 IMPORTANT: Only run Steps 1-3. The rest are optional diagnostics.