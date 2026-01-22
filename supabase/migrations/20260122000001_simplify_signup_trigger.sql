-- =====================================================
-- Simplify signup trigger to prevent timeouts
-- =====================================================
-- Remove complex RLS checks and make the trigger lightweight
-- =====================================================

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Allow trigger to insert users" ON public.users;
DROP POLICY IF EXISTS "authenticated_users_select" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;

-- Drop and recreate the trigger function with minimal logic
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create a simpler function that just inserts without extra checks
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, status, avatar)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Sales Officer'),
    'Pending',
    COALESCE(NEW.raw_user_meta_data->>'avatar', 'https://picsum.photos/seed/' || NEW.id || '/100/100')
  );
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create simple, non-conflicting RLS policies
-- Allow all inserts (trigger will handle this)
CREATE POLICY "users_insert_policy" ON public.users
  FOR INSERT
  WITH CHECK (true);

-- Allow authenticated users to read all users
CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to update their own record
CREATE POLICY "users_update_policy" ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

SELECT 'Simplified signup trigger applied!' as message;
