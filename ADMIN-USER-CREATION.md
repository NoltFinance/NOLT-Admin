# Admin User Creation Guide

## Overview
This guide explains how to create admin users in the Nolt Finance Admin Dashboard.

## Features Implemented

### 1. Backend Function: `createAdminUser`
Located in `/utils/authService.ts`, this function handles the creation of new admin users with the following features:

- **Authentication Required**: Only Super Admin users can create new admin users
- **Role Validation**: Ensures the assigned role is a valid admin role
- **Supabase Auth Integration**: Creates user in Supabase Auth system
- **Database Profile**: Creates corresponding user profile in the database
- **Auto-generation**: Automatically generates referral codes if not provided
- **Email Confirmation**: Auto-confirms email for admin users
- **Error Handling**: Rollback if profile creation fails

#### Function Signature
```typescript
createAdminUser(params: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  referralCode?: string;
}): Promise<{
  user: AuthUser | null;
  error: string | null;
}>
```

### 2. UI Integration: UsersView Component
The user interface has been updated with:

- **Create User Form**: Modal dialog with all required fields
- **Form Validation**: Real-time validation of required fields
- **Loading States**: Visual feedback during user creation
- **Error Display**: Clear error messages if creation fails
- **Success Confirmation**: Success message with auto-close
- **Password Field**: Secure password input for initial credentials

## How to Create an Admin User

### Step 1: Access the Users View
1. Log in as a Super Admin
2. Navigate to the "Users" section from the sidebar

### Step 2: Open the Create User Modal
1. Click the "Invite New User" button
2. The modal will appear with a form

### Step 3: Fill in User Details
Required fields:
- **Full Name**: The administrator's full name
- **Work Email Address**: Must be a valid email address
- **Initial Password**: Minimum 8 characters (user can change after first login)
- **Assign Role**: Select from admin roles (Super Admin, Credit, Finance, etc.)

Optional fields:
- **Referral Code**: Custom code or leave blank for auto-generation

### Step 4: Create the User
1. Click "Create User" button
2. Wait for the creation process (loading indicator will appear)
3. On success, you'll see a success message and the user will appear in the list
4. On error, you'll see an error message explaining what went wrong

## Admin Roles Available
- **Super Admin**: Full system access
- **Credit**: Credit approval and management
- **Internal Control**: Audit and security oversight
- **Finance**: Financial operations
- **Sales Manager**: Sales team management
- **Sales Team Lead**: Team lead operations

## Security Features

1. **Authorization Check**: Only Super Admins can create users
2. **Role Validation**: Only valid admin roles can be assigned
3. **Email Confirmation**: Admin users are auto-confirmed
4. **Status**: New users are created with "Active" status
5. **Audit Trail**: All user creations are logged in the database

## Database Schema

Users are stored in the `users` table with the following structure:
```sql
- id: UUID (primary key, references auth.users)
- email: TEXT (unique)
- name: TEXT
- role: TEXT (constrained to valid roles)
- status: TEXT ('Active', 'Pending', 'Suspended')
- avatar: TEXT
- referral_code: TEXT
- last_active: TIMESTAMPTZ
- team_lead_id: UUID (optional, references users)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

## Row Level Security (RLS)

The system implements RLS policies:
- Super Admins can insert, update, view, and delete all users
- Users can view and update their own data
- Specific policies for managing last_active timestamps

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| "Unauthorized. Only Super Admins..." | Non-Super Admin attempting to create user | Log in as Super Admin |
| "Invalid role. Must be an admin role." | Non-admin role selected | Select a valid admin role |
| "Failed to create auth user" | Supabase auth error | Check email uniqueness and password requirements |
| "Failed to create user profile" | Database constraint violation | Check for duplicate email or invalid data |

## Next Steps

After creating a user:
1. Share the login credentials securely with the new user
2. Advise them to change their password on first login
3. Monitor the user's activity in the Security Logs
4. Assign additional permissions or team leads as needed

## Technical Notes

- Uses Supabase Admin API for user creation
- Requires proper Supabase service role key configuration
- Transaction-like behavior: Auth user is deleted if profile creation fails
- Referral codes are auto-generated using format: `{ROLE}-{RANDOM}`
