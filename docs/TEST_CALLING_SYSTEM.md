# 🧪 Test Calling System - Step by Step

## ❌ Problem: Walang incoming call sa resident dashboard

## 🔍 Debug Checklist

### Step 1: Check if Database Tables Exist

**Run in Supabase SQL Editor:**

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('calls', 'call_signals', 'call_history');
```

**Expected Result:**
```
table_name
-----------
calls
call_signals
call_history
```

**❌ If empty**: Tables don't exist! Run the migration first.

---

### Step 2: Run Database Migration

**In Supabase SQL Editor, run THIS:**

```sql
-- ============================================
-- TapWatch Calling System Database Schema
-- ============================================

-- Table: calls
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  callee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL CHECK (call_type IN ('phone', 'app')),
  is_video BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'active', 'ended', 'missed', 'declined', 'failed')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN answered_at IS NOT NULL AND ended_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (ended_at - answered_at))::INTEGER
      ELSE 0
    END
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: call_signals
CREATE TABLE IF NOT EXISTS call_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate')),
  signal_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: call_history
CREATE TABLE IF NOT EXISTS call_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  other_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  call_type TEXT NOT NULL,
  is_video BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL,
  duration INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calls
DROP POLICY IF EXISTS "Users can view their own calls" ON calls;
CREATE POLICY "Users can view their own calls"
  ON calls FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

DROP POLICY IF EXISTS "Users can create calls" ON calls;
CREATE POLICY "Users can create calls"
  ON calls FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

DROP POLICY IF EXISTS "Users can update their own calls" ON calls;
CREATE POLICY "Users can update their own calls"
  ON calls FOR UPDATE
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- RLS Policies for call_signals
DROP POLICY IF EXISTS "Users can view signals for their calls" ON call_signals;
CREATE POLICY "Users can view signals for their calls"
  ON call_signals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calls
      WHERE calls.id = call_signals.call_id
      AND (calls.caller_id = auth.uid() OR calls.callee_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create signals for their calls" ON call_signals;
CREATE POLICY "Users can create signals for their calls"
  ON call_signals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM calls
      WHERE calls.id = call_signals.call_id
      AND (calls.caller_id = auth.uid() OR calls.callee_id = auth.uid())
    )
  );

-- Grant permissions
GRANT ALL ON calls TO authenticated;
GRANT ALL ON call_signals TO authenticated;
GRANT ALL ON call_history TO authenticated;
```

**Click "Run"** ✅

---

### Step 3: Enable Realtime on Tables

1. **Go to Database** → **Replication** in Supabase
2. **Find `calls` table** → Toggle **ON** ✅
3. **Find `call_signals` table** → Toggle **ON** ✅
4. Click **Save**

---

### Step 4: Test with Manual Call Insert

**Get your user IDs first:**

```sql
-- Get user IDs (you need 2 users)
SELECT id, email, raw_user_meta_data->>'full_name' as name
FROM auth.users
LIMIT 10;
```

**Copy 2 user IDs, then:**

```sql
-- Replace with YOUR actual user IDs!
-- caller_id = Admin user ID
-- callee_id = Resident user ID

INSERT INTO calls (caller_id, callee_id, call_type, status, is_video)
VALUES (
  'ADMIN-USER-ID-HERE',    -- Replace!
  'RESIDENT-USER-ID-HERE',  -- Replace!
  'app',
  'ringing',
  false
);
```

**What should happen:**
- Resident dashboard should show incoming call modal immediately! 📞

---

### Step 5: Check Browser Console

**On Resident Dashboard, open Console (F12):**

**Expected logs:**
```
📡 Listening for incoming calls...
📞 Incoming call: {id: "...", callerId: "...", ...}
🔔 Playing ringtone...
```

**❌ If you see NOTHING:**
- Database not created
- Realtime not enabled
- Wrong user ID in callee_id

**❌ If you see errors:**
- RLS policy blocking
- Missing permissions

---

## 🎯 Quick Test Script

**Use this to test everything at once:**

```sql
-- 1. Check tables exist
SELECT COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('calls', 'call_signals', 'call_history');
-- Should return: 3

-- 2. Check RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('calls', 'call_signals', 'call_history');
-- Should show: true for all

-- 3. Check policies exist
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename IN ('calls', 'call_signals', 'call_history')
GROUP BY tablename;
-- Should show at least 2-3 policies per table

-- 4. Test insert permission
INSERT INTO calls (
  caller_id, 
  callee_id, 
  call_type, 
  status
) VALUES (
  auth.uid(),  -- Your current user
  auth.uid(),  -- Same user (just for test)
  'app',
  'ringing'
) RETURNING id;
-- Should return a UUID (success!)
```

---

## 🔥 Most Common Issues

### Issue #1: Tables Don't Exist
**Fix**: Run the full migration SQL above

### Issue #2: Realtime Not Enabled
**Fix**: Database → Replication → Enable for `calls` table

### Issue #3: Wrong User IDs
**Fix**: Use actual user IDs from `auth.users` table

### Issue #4: Dashboard Not Listening
**Fix**: Make sure Dashboard component has `useCallManager` hook

### Issue #5: RLS Blocking
**Fix**: Run RLS policies from migration

---

## ✅ Success Indicators

When everything works:

1. ✅ SQL query returns 3 tables
2. ✅ Realtime toggle ON for `calls`
3. ✅ Manual INSERT shows incoming call modal
4. ✅ Console shows "📡 Listening for incoming calls..."
5. ✅ Console shows "📞 Incoming call:" when call inserted

---

## 🚀 Final Test

**Two Browser Windows Test:**

```bash
# Window 1: Admin
http://localhost:5173/admin
Login as admin

# Window 2: Resident  
http://localhost:5173/dashboard
Login as resident

# In Admin window:
1. Open browser console (F12)
2. Go to Emergency Contacts
3. Click "Call Now"
4. Select "In-App Voice Call"
5. Watch console for: "📞 Call initiated"

# In Resident window:
1. Open browser console (F12)
2. Watch for: "📞 Incoming call:"
3. Modal should appear!
```

---

## 🐛 If Still Not Working

**Get these logs and share:**

```javascript
// In Resident Dashboard console, type:
localStorage.getItem('sb-access-token')  // Check if logged in
```

```sql
-- In Supabase SQL, run:
SELECT * FROM calls ORDER BY created_at DESC LIMIT 5;
SELECT * FROM auth.users WHERE email LIKE '%@%';
```

---

## 📞 Emergency Bypass (Testing Only)

If you just want to see if the modal works:

```javascript
// In Resident Dashboard console, paste this:
window.dispatchEvent(new CustomEvent('test-incoming-call', {
  detail: {
    id: 'test-123',
    callerId: 'test-caller',
    callerName: 'Test Admin',
    callerPhone: '09171234567',
    callType: 'app',
    isVideo: false
  }
}));
```

**This will fake an incoming call to test the UI!**

---

Run through these steps and tell me where it fails! 🔍
