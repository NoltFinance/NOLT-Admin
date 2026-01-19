-- Fix handle_new_user function to read role from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, status, avatar)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Sales Officer'), -- Use role from metadata, default to Sales Officer
    'Pending', -- Default status, needs admin approval
    COALESCE(NEW.raw_user_meta_data->>'avatar', 'https://picsum.photos/seed/' || NEW.id || '/100/100')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
