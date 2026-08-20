-- ============================================================
-- RESIDENT ID MIGRATION
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Add resident_id column to profiles (if it doesn't exist)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS resident_id TEXT UNIQUE;

-- 2. Function: generate a new resident ID in format R-YYYY-XXXXXX
--    Uses the count of already-assigned resident IDs to produce the
--    next sequence number — padded to 6 digits.
--    The function is SECURITY DEFINER so it can be called from a
--    trigger that runs in the context of the authenticating user.
CREATE OR REPLACE FUNCTION generate_resident_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year    TEXT;
  v_seq     INT;
  v_new_id  TEXT;
BEGIN
  v_year := TO_CHAR(NOW() AT TIME ZONE 'Asia/Manila', 'YYYY');

  -- Count how many resident IDs have already been assigned this year
  -- to derive the next sequence number.
  SELECT COUNT(*) + 1
    INTO v_seq
    FROM profiles
   WHERE resident_id LIKE 'R-' || v_year || '-%';

  v_new_id := 'R-' || v_year || '-' || LPAD(v_seq::TEXT, 6, '0');

  -- Guard against collisions (unlikely but safe)
  WHILE EXISTS (SELECT 1 FROM profiles WHERE resident_id = v_new_id) LOOP
    v_seq    := v_seq + 1;
    v_new_id := 'R-' || v_year || '-' || LPAD(v_seq::TEXT, 6, '0');
  END LOOP;

  RETURN v_new_id;
END;
$$;

-- 3. Trigger function: assign resident_id the moment verification_status
--    is set to 'verified', but only when no resident_id exists yet.
CREATE OR REPLACE FUNCTION assign_resident_id_on_verify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only act when verification_status transitions to 'verified'
  IF NEW.verification_status = 'verified'
     AND (OLD.verification_status IS DISTINCT FROM 'verified')
     AND (NEW.resident_id IS NULL OR NEW.resident_id = '')
  THEN
    NEW.resident_id := generate_resident_id();
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Drop old trigger if exists, then create fresh
DROP TRIGGER IF EXISTS trg_assign_resident_id ON profiles;

CREATE TRIGGER trg_assign_resident_id
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_resident_id_on_verify();

-- ============================================================
-- BACKFILL: assign IDs to any already-verified residents
-- that do not yet have one.
-- Run this ONCE after applying the migration above.
-- ============================================================
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id
      FROM profiles
     WHERE verification_status = 'verified'
       AND (resident_id IS NULL OR resident_id = '')
     ORDER BY created_at ASC
  LOOP
    UPDATE profiles
       SET resident_id = generate_resident_id()
     WHERE id = rec.id;
  END LOOP;
END;
$$;

-- ============================================================
-- VERIFICATION
-- After running, check results with:
--   SELECT id, full_name, verification_status, resident_id
--     FROM profiles
--    WHERE verification_status = 'verified';
-- ============================================================
