-- =====================================================
-- Fix RLS Infinite Recursion on Users Table
-- =====================================================
-- This migration fixes the infinite recursion error by
-- using simple policies that don't query the users table
-- =====================================================

-- Step 1: Drop ALL existing policies on users table
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Super Admins can view all users" ON users;
DROP POLICY IF EXISTS "Super Admins can insert users" ON users;
DROP POLICY IF EXISTS "Super Admins can update users" ON users;
DROP POLICY IF EXISTS "Users can update their own last_active" ON users;
DROP POLICY IF EXISTS "Super Admins can delete users" ON users;
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON users;
DROP POLICY IF EXISTS "Allow users to update own record" ON users;
DROP POLICY IF EXISTS "authenticated_users_select" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

-- Step 2: Drop the problematic function if it exists
DROP FUNCTION IF EXISTS is_super_admin();

-- Step 3: Create simple, non-recursive policies
-- Policy: Allow all authenticated users to read all users
-- (Application layer enforces role-based restrictions)
CREATE POLICY "authenticated_users_select" ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow users to update their own record
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Note: Admin operations (INSERT, DELETE, admin UPDATE) should use
-- supabase.auth.admin API which bypasses RLS automatically
