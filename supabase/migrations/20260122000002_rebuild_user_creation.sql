-- =====================================================
-- Completely rebuild user creation system
-- =====================================================
-- Remove trigger approach and use a different method
-- =====================================================

-- Step 1: Drop the problematic trigger entirely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Clear all RLS policies
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "Allow trigger to insert users" ON public.users;
DROP POLICY IF EXISTS "authenticated_users_select" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;

-- Step 3: Temporarily disable RLS for testing
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 4: Create a simple stored procedure for user creation
-- This will be called from the application after signup
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  user_role TEXT DEFAULT 'Sales Officer'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM public.users WHERE id = user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User already exists');
  END IF;

  -- Insert the user
  INSERT INTO public.users (id, email, name, role, status, avatar)
  VALUES (
    user_id,
    user_email,
    user_name,
    user_role,
    'Pending',
    'https://picsum.photos/seed/' || user_id || '/100/100'
  );

  result := jsonb_build_object('success', true, 'user_id', user_id);
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.create_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile TO anon;

-- Step 5: Re-enable RLS with simple policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (we'll control this via the function)
CREATE POLICY "users_insert_via_function" ON public.users
  FOR INSERT
  WITH CHECK (true);

-- Allow authenticated users to read
CREATE POLICY "users_select_authenticated" ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to update their own record
CREATE POLICY "users_update_own_record" ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

SELECT 'User creation system rebuilt - use create_user_profile function' as message;
