-- ============================================
-- Quick Database Verification Script
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Check if calling tables exist
SELECT 
  '1. Tables Check' as test,
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ PASS - All 3 tables exist'
    ELSE '❌ FAIL - Tables missing! Run migration first.'
  END as result
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('calls', 'call_signals', 'call_history');

-- 2. Check if RLS is enabled
SELECT 
  '2. RLS Check' as test,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ PASS - RLS enabled'
    ELSE '❌ FAIL - RLS not enabled'
  END as result
FROM pg_tables 
WHERE tablename IN ('calls', 'call_signals', 'call_history')
ORDER BY tablename;

-- 3. Check RLS policies
SELECT 
  '3. Policies Check' as test,
  tablename,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 2 THEN '✅ PASS - Has policies'
    ELSE '❌ FAIL - Missing policies'
  END as result
FROM pg_policies 
WHERE tablename IN ('calls', 'call_signals', 'call_history')
GROUP BY tablename
ORDER BY tablename;

-- 4. Check if user can insert (test permission)
SELECT 
  '4. Permission Check' as test,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN '✅ PASS - User authenticated'
    ELSE '❌ FAIL - Not authenticated'
  END as result;

-- 5. List recent calls (if any)
SELECT 
  '5. Recent Calls' as test,
  COUNT(*) as call_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Has calls in database'
    ELSE 'ℹ️ No calls yet (expected if first time)'
  END as result
FROM calls;

-- ============================================
-- If ALL checks PASS, your database is ready!
-- If ANY checks FAIL, follow the fix below
-- ============================================

-- FIX: If tables don't exist, uncomment and run:
/*
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  callee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL CHECK (call_type IN ('phone', 'app')),
  is_video BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'ringing',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,
  signal_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  other_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,
  call_type TEXT NOT NULL,
  is_video BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL,
  duration INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;

-- Basic policies
CREATE POLICY "Users can view their own calls" ON calls
  FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "Users can create calls" ON calls
  FOR INSERT WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can update their own calls" ON calls
  FOR UPDATE USING (auth.uid() = caller_id OR auth.uid() = callee_id);
*/
