-- =====================================================
-- NOLT Finance Admin Dashboard - Database Migration
-- =====================================================
-- This script sets up the database schema for RBAC
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CREATE USERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN (
    'Super Admin',
    'Credit',
    'Sales Manager',
    'Sales Team Lead',
    'Sales Officer',
    'Customer Experience',
    'Internal Control',
    'Finance'
  )),
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Pending', 'Suspended')),
  avatar TEXT,
  referral_code TEXT,
  last_active TIMESTAMPTZ,
  team_lead_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_team_lead ON users(team_lead_id);

-- =====================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. CREATE RLS POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Super Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Super Admins can view all users" ON users;
DROP POLICY IF EXISTS "Super Admins can insert users" ON users;
DROP POLICY IF EXISTS "Super Admins can update users" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own last_active" ON users;
DROP POLICY IF EXISTS "Super Admins can delete users" ON users;
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON users;
DROP POLICY IF EXISTS "Allow users to update own record" ON users;

-- Simplified approach: Allow authenticated users to read
-- We'll enforce role-based restrictions in the application layer
CREATE POLICY "Allow read access to authenticated users" ON users
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow users to update their own last_active and limited fields
CREATE POLICY "Allow users to update own record" ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Super Admin operations will use service_role key in the application
-- This avoids RLS infinite recursion completely

-- =====================================================
-- 5. CREATE FUNCTION TO UPDATE TIMESTAMP
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- 6. CREATE TRIGGER FOR AUTO-UPDATING TIMESTAMP
-- =====================================================

DROP TRIGGER IF EXISTS update_users_updated_at ON users;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. CREATE FUNCTION TO SYNC AUTH USER WITH USERS TABLE
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, status, avatar)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'Sales Officer', -- Default role
    'Pending', -- Default status, needs admin approval
    COALESCE(NEW.raw_user_meta_data->>'avatar', 'https://picsum.photos/seed/' || NEW.id || '/100/100')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. CREATE TRIGGER FOR NEW AUTH USERS
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 9. INSERT SAMPLE DATA (OPTIONAL - FOR TESTING)
-- =====================================================

-- Note: You need to create these users in Supabase Auth first,
-- then update this script with their actual UUIDs

-- Example: Insert a Super Admin user
-- Replace 'YOUR_AUTH_USER_UUID' with the actual UUID from Supabase Auth

-- INSERT INTO users (id, email, name, role, status, avatar, referral_code)
-- VALUES (
--   'YOUR_AUTH_USER_UUID',
--   'admin@nolt.finance',
--   'Super Admin',
--   'Super Admin',
--   'Active',
--   'https://picsum.photos/seed/admin/100/100',
--   'ADMIN-001'
-- )
-- ON CONFLICT (id) DO UPDATE SET
--   role = EXCLUDED.role,
--   status = EXCLUDED.status;

-- =====================================================
-- 10. CREATE VIEW FOR ADMIN USERS
-- =====================================================

CREATE OR REPLACE VIEW admin_users AS
SELECT 
  id,
  email,
  name,
  role,
  status,
  avatar,
  referral_code,
  last_active,
  created_at,
  updated_at
FROM users
WHERE role IN (
  'Super Admin',
  'Credit',
  'Internal Control',
  'Finance',
  'Sales Manager',
  'Sales Team Lead'
)
AND status = 'Active';

-- =====================================================
-- 11. GRANT PERMISSIONS
-- =====================================================

-- Grant access to authenticated users
GRANT SELECT ON users TO authenticated;
GRANT SELECT ON admin_users TO authenticated;

-- Grant full access to service role (for backend operations)
GRANT ALL ON users TO service_role;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Run these queries to verify the setup:

-- 1. Check if table was created
-- SELECT * FROM users LIMIT 1;

-- 2. Check indexes
-- SELECT indexname FROM pg_indexes WHERE tablename = 'users';

-- 3. Check RLS is enabled
-- SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'users';

-- 4. Check policies
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'users';

-- 5. Count users by role
-- SELECT role, status, COUNT(*) as count FROM users GROUP BY role, status;

-- =====================================================
-- ROLLBACK (IF NEEDED)
-- =====================================================

-- Uncomment to rollback changes:
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP TRIGGER IF EXISTS update_users_updated_at ON users;
-- DROP FUNCTION IF EXISTS public.handle_new_user();
-- DROP FUNCTION IF EXISTS update_updated_at_column();
-- DROP VIEW IF EXISTS admin_users;
-- DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- END OF MIGRATION
-- =====================================================

SELECT 'Migration completed successfully!' as message;
