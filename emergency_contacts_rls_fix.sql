-- Check if RLS is enabled on emergency_contacts table
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'emergency_contacts';

-- If RLS is enabled, we need to add policies for DELETE operations
-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to delete emergency contacts" ON emergency_contacts;
DROP POLICY IF EXISTS "Allow admins to delete emergency contacts" ON emergency_contacts;

-- Create policy to allow authenticated users (admins) to delete
CREATE POLICY "Allow authenticated users to delete emergency contacts"
ON emergency_contacts
FOR DELETE
USING (auth.role() = 'authenticated');

-- Alternative: If you want only admins to delete, use this instead:
-- CREATE POLICY "Allow admins to delete emergency contacts"
-- ON emergency_contacts
-- FOR DELETE
-- USING (
--   auth.uid() IN (
--     SELECT id FROM profiles WHERE role = 'admin'
--   )
-- );

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'emergency_contacts';
