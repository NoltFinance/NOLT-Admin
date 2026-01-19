-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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


CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_team_lead ON users(team_lead_id);


ALTER TABLE users ENABLE ROW LEVEL SECURITY;

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


DROP TRIGGER IF EXISTS update_users_updated_at ON users;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


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


DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


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


-- Grant access to authenticated users
GRANT SELECT ON users TO authenticated;
GRANT SELECT ON admin_users TO authenticated;

-- Grant full access to service role (for backend operations)
GRANT ALL ON users TO service_role;


SELECT 'Migration completed successfully!' as message;
