# RBAC Implementation Guide

## Overview
This admin dashboard implements Role-Based Access Control (RBAC) to secure access based on user roles.

## Setup Instructions

### 1. Environment Variables
Create a `.env` file in the root directory:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_key
```

### 2. Database Schema
Create the following table in your Supabase database:

```sql
-- Create users table
CREATE TABLE users (
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

-- Create index for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read their own data
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Create policy for Super Admins to manage users
CREATE POLICY "Super Admins can manage all users" ON users
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'Super Admin'
    )
  );
```

### 3. Supabase Authentication Setup

1. Enable Email authentication in Supabase Dashboard:
   - Go to Authentication > Providers
   - Enable Email provider

2. Configure email templates (optional):
   - Go to Authentication > Email Templates
   - Customize login emails

### 4. Create Admin Users

Use Supabase SQL Editor to create admin users:

```sql
-- Insert a Super Admin user
INSERT INTO users (id, email, name, role, status, avatar)
VALUES (
  'user_uuid_here', -- Use the UUID from Supabase Auth
  'admin@nolt.finance',
  'Admin User',
  'Super Admin',
  'Active',
  'https://picsum.photos/seed/admin/100/100'
);
```

Or use the Supabase Auth UI to create a user, then update their role:

```sql
UPDATE users 
SET role = 'Super Admin', status = 'Active'
WHERE email = 'admin@nolt.finance';
```

## Role Hierarchy

### Admin Roles (Can access admin dashboard)
1. **Super Admin** (Level 100)
   - Full system access
   - User management
   - Security logs
   - Settings configuration
   - Form builder

2. **Credit** (Level 80)
   - Loan application review
   - Approve/decline loans
   - Form builder access
   - Export data

3. **Internal Control** (Level 75)
   - View all requests
   - Security logs access
   - Audit capabilities
   - Export data

4. **Finance** (Level 70)
   - Payment disbursement
   - Approved requests visibility
   - Export data

5. **Sales Manager** (Level 60)
   - View all sales team requests
   - Team oversight

6. **Sales Team Lead** (Level 50)
   - View subordinate requests
   - Team management

### Non-Admin Roles (Cannot access admin dashboard)
- **Customer Experience** (Level 40)
- **Sales Officer** (Level 30)

## Permissions Matrix

| Permission | Super Admin | Credit | Internal Control | Finance | Sales Manager | Sales Team Lead |
|------------|-------------|--------|------------------|---------|---------------|-----------------|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Approve Requests | ✓ | ✓ | - | ✓ | - | - |
| View Queue | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Manage Users | ✓ | - | - | - | - | - |
| Security Logs | ✓ | - | ✓ | - | - | - |
| Settings | ✓ | - | - | - | - | - |
| Form Builder | ✓ | ✓ | - | - | - | - |
| Export Data | ✓ | ✓ | ✓ | ✓ | - | - |

## Authentication Flow

1. **Login** → User enters email and password
2. **Validation** → System checks credentials with Supabase
3. **Profile Check** → Fetches user profile from database
4. **Role Verification** → Ensures user has admin role
5. **Status Check** → Verifies account is active
6. **2FA** (Optional) → Verify OTP if enabled
7. **Session Creation** → User is authenticated

## Security Features

- **Role-Based Access**: Only admin roles can login
- **Status Verification**: Suspended/Pending users cannot login
- **Session Management**: Automatic session validation
- **Permission Checks**: Views are filtered by role permissions
- **Audit Trail**: Last active timestamp tracking

## Usage Examples

### Check if user has permission
```typescript
import { hasPermission } from './utils/rbac';

if (hasPermission(user.role, 'APPROVE_REQUESTS')) {
  // Show approve button
}
```

### Check if user can access view
```typescript
import { canAccessView } from './utils/rbac';

if (canAccessView(user.role, 'security')) {
  // Allow access to security logs
}
```

### Get allowed views for user
```typescript
import { getAllowedViews } from './utils/rbac';

const allowedViews = getAllowedViews(user.role);
// Returns array of view names user can access
```

## Development

To test RBAC locally:

1. Set up Supabase project
2. Create test users with different roles
3. Login with each role to test permissions
4. Verify view restrictions and data filtering

## Troubleshooting

### "Access denied. Admin privileges required"
- User role is not in the ADMIN_ROLES list
- Update user role in database to an admin role

### "Account is pending/suspended"
- User status is not 'Active'
- Update user status in database: `UPDATE users SET status = 'Active' WHERE email = 'user@example.com'`

### "User profile not found"
- User exists in Supabase Auth but not in users table
- Create user profile in database with matching UUID

### Authentication keeps failing
- Check Supabase credentials in .env file
- Verify email/password are correct
- Check browser console for detailed errors
