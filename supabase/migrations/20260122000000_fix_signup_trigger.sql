-- =====================================================
-- Fix handle_new_user trigger to bypass RLS
-- =====================================================
-- This migration fixes the "Database error saving new user" error
-- by ensuring the trigger function can insert users properly
-- =====================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function with proper security context
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert new user into public.users table
  -- This function runs with elevated privileges and bypasses RLS
  INSERT INTO public.users (id, email, name, role, status, avatar)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Sales Officer'),
    'Pending', -- Default status, needs admin approval
    COALESCE(NEW.raw_user_meta_data->>'avatar', 'https://picsum.photos/seed/' || NEW.id || '/100/100')
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error for debugging
    RAISE LOG 'Error in handle_new_user: % %', SQLERRM, SQLSTATE;
    -- Re-raise the error so signup fails with a clear message
    RAISE;
END;
$$;

-- Grant execute permission to authenticated users (though function is SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Ensure the service role has full access to users table
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.users TO postgres;

-- Add a policy specifically for the trigger function to insert
-- This ensures the SECURITY DEFINER function can always insert
DROP POLICY IF EXISTS "Allow trigger to insert users" ON public.users;

CREATE POLICY "Allow trigger to insert users" ON public.users
  FOR INSERT
  WITH CHECK (true);

-- Also ensure INSERT is allowed for service_role
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

COMMENT ON FUNCTION public.handle_new_user() IS 
'Automatically creates a user record when a new auth user signs up. Runs with SECURITY DEFINER to bypass RLS.';

SELECT 'Signup trigger fixed successfully!' as message;
