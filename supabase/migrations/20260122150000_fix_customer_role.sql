-- =====================================================
-- Fix handle_new_user to use Customer role by default
-- =====================================================

-- Recreate the trigger function with Customer as default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, status, avatar)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Customer'),
    'Pending',
    'https://picsum.photos/seed/' || NEW.id || '/100/100'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

SELECT 'Trigger updated to use Customer role by default' as message;
