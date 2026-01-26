-- =====================================================
-- Add Customer role to the users table role constraint
-- =====================================================

-- Drop the existing constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the new constraint with Customer role included
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
CHECK (role IN (
  'Super Admin',
  'Credit',
  'Sales Manager',
  'Sales Team Lead',
  'Sales Officer',
  'Customer Experience',
  'Internal Control',
  'Finance',
  'Customer'
));

SELECT 'Customer role added to allowed roles' as message;
