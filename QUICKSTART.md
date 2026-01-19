# Quick Start Guide - RBAC Implementation

## 🚀 Getting Started in 5 Minutes

### Step 1: Set Up Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to be provisioned
3. Go to **Project Settings** > **API** and copy:
   - `Project URL`
   - `anon public` key

### Step 2: Configure Environment

1. Create a `.env` file in the project root:
```bash
cp .env.example .env
```

2. Edit `.env` and add your Supabase credentials:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-key
```

### Step 3: Set Up Database

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the entire contents of `database_migration.sql`
3. Paste and click **Run**
4. You should see: "Migration completed successfully!"

### Step 4: Create Your First Admin User

1. In Supabase, go to **Authentication** > **Users**
2. Click **Add User** and create a user with:
   - Email: `admin@nolt.finance` (or your email)
   - Password: Create a secure password
   - Auto confirm: Yes

3. Copy the User UUID from the users list

4. In **SQL Editor**, run this query (replace the UUID):
```sql
UPDATE users 
SET 
  role = 'Super Admin',
  status = 'Active',
  name = 'Admin User'
WHERE id = 'paste-your-uuid-here';
```

### Step 5: Start the Application

```bash
npm install
npm run dev
```

### Step 6: Test Login

1. Open the app in your browser
2. Login with:
   - Email: `admin@nolt.finance`
   - Password: Your password from Step 4

3. You should now have full access as Super Admin! 🎉

---

## Creating Additional Admin Users

### Method 1: Using Supabase Dashboard (Recommended)

1. **Authentication** > **Users** > **Add User**
2. Enter email and password
3. In **SQL Editor**, update their role:
```sql
UPDATE users 
SET 
  role = 'Credit',  -- or any other role
  status = 'Active',
  name = 'User Name'
WHERE email = 'user@example.com';
```

### Method 2: Using SQL Only

```sql
-- First, create the auth user manually in Supabase Dashboard
-- Then update their profile:

UPDATE users 
SET 
  role = 'Sales Manager',
  status = 'Active',
  name = 'Sales Manager Name',
  avatar = 'https://picsum.photos/seed/manager/100/100'
WHERE email = 'manager@nolt.finance';
```

---

## Available Admin Roles

| Role | Access Level | Can Approve | Can Manage Users |
|------|--------------|-------------|------------------|
| Super Admin | Full Access | ✓ | ✓ |
| Credit | Loans & Forms | ✓ | - |
| Internal Control | Audit & Logs | - | - |
| Finance | Disbursements | ✓ | - |
| Sales Manager | Team Overview | - | - |
| Sales Team Lead | Subordinates | - | - |

---

## Testing Different Roles

1. Create multiple test users with different roles
2. Use the **Preview Role** dropdown in the sidebar to switch between roles
3. Observe how navigation and permissions change

---

## Troubleshooting

### "Access denied. Admin privileges required"
**Solution**: Update the user's role in the database:
```sql
UPDATE users SET role = 'Super Admin', status = 'Active' 
WHERE email = 'your@email.com';
```

### "User profile not found"
**Solution**: The auth user exists but not in the users table. Run:
```sql
INSERT INTO users (id, email, name, role, status)
VALUES (
  'auth-user-uuid-here',
  'user@email.com',
  'User Name',
  'Super Admin',
  'Active'
);
```

### Can't see environment variables
**Solution**: Make sure:
- `.env` file exists in root directory
- File is not named `.env.txt` or `.env.example`
- Restart the dev server after creating `.env`

### Login button does nothing
**Solution**: 
- Open browser console (F12)
- Look for errors
- Verify Supabase credentials in `.env`
- Check if Supabase project is active

---

## Next Steps

Once logged in as Super Admin, you can:

1. **Manage Users** - Go to Users view
2. **View Audit Logs** - Check Security view
3. **Configure Settings** - Access Settings view
4. **Build Forms** - Use Form Builder
5. **Review Requests** - Process loans/investments

---

## Need Help?

- 📖 Full setup guide: [RBAC-SETUP.md](RBAC-SETUP.md)
- 📋 Implementation details: [RBAC-IMPLEMENTATION.md](RBAC-IMPLEMENTATION.md)
- 💾 Database schema: [database_migration.sql](database_migration.sql)

---

## Security Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] Changed default admin password
- [ ] Only necessary users have admin roles
- [ ] Row Level Security is enabled
- [ ] Tested login/logout flow
- [ ] Verified role-based access works

**You're all set! 🎉**
