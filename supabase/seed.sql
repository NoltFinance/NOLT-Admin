-- =====================================================
-- NOLT Finance Admin Dashboard - Seed Data
-- =====================================================
-- This file seeds the database with a Super Admin user
-- =====================================================

-- Create Super Admin user
-- Email: admin@nolt.finance
-- Password: Admin@123456 (CHANGE THIS AFTER FIRST LOGIN!)

DO $$
DECLARE
  admin_id UUID;
  admin_email TEXT := 'admin@nolt.finance';
  admin_password TEXT := 'Admin@123456';
BEGIN
  -- Create auth user using Supabase auth.users table
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    admin_email,
    crypt(admin_password, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Super Admin"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO admin_id;

  -- If user already exists, get their id
  IF admin_id IS NULL THEN
    SELECT id INTO admin_id FROM auth.users WHERE email = admin_email;
  END IF;

  -- Create user profile
  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    status,
    avatar,
    referral_code,
    last_active
  ) VALUES (
    admin_id,
    admin_email,
    'Super Admin',
    'Super Admin',
    'Active',
    'https://picsum.photos/seed/admin/100/100',
    'ADMIN-001',
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    name = EXCLUDED.name;

  RAISE NOTICE 'Super Admin user created successfully!';
  RAISE NOTICE 'Email: %', admin_email;
  RAISE NOTICE 'Password: % (PLEASE CHANGE THIS!)', admin_password;
END $$;
