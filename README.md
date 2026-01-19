<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# NOLT Finance - Admin Dashboard

A secure, role-based admin dashboard for managing loans and investments with built-in RBAC (Role-Based Access Control).

## 🔐 Security Features

- **Role-Based Access Control (RBAC)** - 6 admin role levels with granular permissions
- **Supabase Authentication** - Secure email/password authentication
- **Row Level Security** - Database-level access control
- **Session Management** - Persistent and secure sessions
- **Audit Trail** - Activity logging and security monitoring

## 🚀 Quick Start

**Prerequisites:** Node.js, Supabase Account

1. **Clone and Install**
   ```bash
   npm install
   ```

2. **Set up Environment Variables**
   ```bash
   cp .env.example .env
   ```
   Add your Supabase credentials to `.env`:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_key
   ```

3. **Set up Database**
   - Create a Supabase project
   - Run the SQL script from `database_migration.sql` in Supabase SQL Editor

4. **Create Admin User**
   - Create a user in Supabase Authentication
   - Update their role to 'Super Admin' (see [QUICKSTART.md](QUICKSTART.md))

5. **Run the App**
   ```bash
   npm run dev
   ```

📖 **Detailed Setup Guide**: See [QUICKSTART.md](QUICKSTART.md) for step-by-step instructions

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get up and running in 5 minutes
- **[RBAC-SETUP.md](RBAC-SETUP.md)** - Complete RBAC implementation guide
- **[RBAC-IMPLEMENTATION.md](RBAC-IMPLEMENTATION.md)** - Technical implementation details
- **[database_migration.sql](database_migration.sql)** - Database schema and setup

## 👥 Admin Roles

| Role | Access Level | Key Permissions |
|------|--------------|-----------------|
| Super Admin | Full Access | Everything including user management |
| Credit | Loan Processing | Review and approve loan applications |
| Internal Control | Audit & Compliance | Security logs and system auditing |
| Finance | Payments | Disbursement and payment processing |
| Sales Manager | Team Oversight | View all sales team activities |
| Sales Team Lead | Team Management | Manage subordinate requests |

## 🎯 Features

- ✅ Role-based dashboard access
- ✅ Investment & Loan request management
- ✅ Dynamic form builder (Super Admin & Credit)
- ✅ User management (Super Admin only)
- ✅ Security audit logs
- ✅ Export functionality
- ✅ Dark mode support
- ✅ Real-time notifications
- ✅ AI-powered insights (Gemini integration)

## 🛠 Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: TailwindCSS
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL (via Supabase)
- **AI**: Google Gemini API
