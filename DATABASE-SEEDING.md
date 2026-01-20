# Database Seeding Guide

## Overview
This guide explains how to seed your NOLT Finance database with initial data including forms and sample submissions.

## Prerequisites
- Supabase project set up
- Database migrations applied
- Supabase CLI installed (optional but recommended)

## Seed Files

### 1. Main Seed (`supabase/seed.sql`)
Creates the Super Admin user with default credentials:
- **Email:** admin@nolt.finance
- **Password:** Admin@123456 (⚠️ CHANGE THIS AFTER FIRST LOGIN!)

### 2. Forms Seed (`supabase/seed_forms.sql`)
Creates:
- **Investment Application Form** with all required fields
- **Loan Application Form** with all required fields
- **Sample Investment Submissions** (2 submissions at different workflow stages)
- **Sample Loan Submissions** (3 submissions at different workflow stages)

## How to Run Seed Files

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the content of `supabase/seed.sql`
5. Click **Run** to execute
6. Repeat steps 3-5 with `supabase/seed_forms.sql`

### Option 2: Using Supabase CLI
```bash
# Navigate to your project directory
cd /path/to/Nolt-Admin

# Run main seed (creates Super Admin)
supabase db push seed.sql

# Run forms seed (creates forms and submissions)
supabase db push seed_forms.sql
```

### Option 3: Using psql (Direct Database Connection)
```bash
# Connect to your database
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run the seed files
\i supabase/seed.sql
\i supabase/seed_forms.sql
```

## What Gets Created

### Forms
1. **Investment Application**
   - Type: Investment
   - Status: Published
   - Visibility: Public
   - Fields: 12 fields including personal info, investment details, and document uploads

2. **Loan Application**
   - Type: Loan
   - Status: Published
   - Visibility: Public
   - Fields: 14 fields including personal info, loan details, and document uploads

### Sample Submissions

#### Investment Submissions
1. **John Doe** - Status: Pending Review (Submission stage)
   - Amount: ₦500,000
   - Plan: Fixed Deposit
   - Tenure: 6 months

2. **Sarah Johnson** - Status: Under Review (Customer Validation stage)
   - Amount: ₦1,000,000
   - Plan: Treasury Bills
   - Tenure: 12 months

#### Loan Submissions
1. **Michael Brown** - Status: Pending Review (Submission stage)
   - Amount: ₦300,000
   - Product: Salary Advance
   - Period: 6 months

2. **Emily Davis** - Status: Under Review (Customer Validation stage)
   - Amount: ₦500,000
   - Product: SME Loan
   - Period: 12 months

3. **David Wilson** - Status: In Review (Credit Check stage)
   - Amount: ₦750,000
   - Product: IPPIS Loan
   - Period: 18 months

## Verification

After running the seed files, verify the data was created:

### Check Forms
```sql
SELECT id, name, type, status, visibility 
FROM forms 
ORDER BY created_at DESC;
```

Expected output: 2 forms (Investment and Loan)

### Check Form Fields
```sql
SELECT f.name as form_name, COUNT(ff.id) as field_count
FROM forms f
LEFT JOIN form_fields ff ON ff.form_id = f.id
GROUP BY f.id, f.name;
```

Expected output:
- Investment Application: 12 fields
- Loan Application: 14 fields

### Check Submissions
```sql
SELECT 
  f.type,
  fs.applicant_name,
  fs.status,
  fs.submitted_at
FROM form_submissions fs
JOIN forms f ON f.id = fs.form_id
ORDER BY fs.submitted_at DESC;
```

Expected output: 5 submissions (2 Investment, 3 Loan)

## Troubleshooting

### Issue: "Super Admin already exists"
This is normal if you've run `seed.sql` before. The script uses `ON CONFLICT DO NOTHING` to prevent duplicates.

### Issue: "Forms already exist"
The forms seed also uses `ON CONFLICT DO NOTHING`. If you want fresh data, uncomment the DELETE statements at the top of `seed_forms.sql`.

### Issue: Submissions not showing in UI
1. Check that forms were created:
   ```sql
   SELECT COUNT(*) FROM forms;
   ```

2. Check that submissions are linked to forms:
   ```sql
   SELECT COUNT(*) FROM form_submissions;
   ```

3. Check your RLS (Row Level Security) policies - ensure your user can read the data

4. Open browser console and check for API errors

### Issue: "Cannot insert into auth.users"
This means you're using the wrong database connection. The auth schema is only accessible through Supabase's internal functions. Use the Supabase Dashboard SQL Editor instead.

## Adding More Sample Data

To add more submissions, use this template:

```sql
DO $$
DECLARE
  form_id_var UUID;
  admin_id UUID;
BEGIN
  -- Get form ID
  SELECT id INTO form_id_var FROM forms WHERE type = 'Investment' LIMIT 1;
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@nolt.finance' LIMIT 1;
  
  IF form_id_var IS NOT NULL THEN
    INSERT INTO form_submissions (
      id,
      form_id,
      applicant_name,
      applicant_email,
      status,
      field_responses,
      submitted_at,
      reviewed_by,
      reviewed_at
    ) VALUES (
      gen_random_uuid(),
      form_id_var,
      'Your Name',
      'your.email@example.com',
      'pending',
      jsonb_build_object(
        'full_name', 'Your Name',
        'email', 'your.email@example.com',
        -- Add more fields as needed
      ),
      NOW(),
      NULL,
      NULL
    );
  END IF;
END $$;
```

## Status Mapping

When creating submissions, use these status values:

| UI Display | Database Status | Workflow Stage |
|-----------|----------------|----------------|
| Pending Review | pending | Submission |
| Docs Verification | under_review | Customer Validation |
| Internal Audit | in_review | Credit Check / Payment Verification |
| Pending Disbursement | pending_disbursement | Request For Payment |
| Approved | approved | Disbursed / Certificate Issued |
| Declined | declined | Rejected |
| Returned | returned | Sent back for corrections |

## Next Steps

After seeding:
1. Login with Super Admin credentials
2. Navigate to Investments or Loans page
3. You should see the sample submissions
4. Test the approval workflow by approving/declining submissions
5. Check the Approval Gates page to see the workflow configuration

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check Supabase logs in the dashboard
3. Verify your database schema matches the latest migrations
4. Review the RLS policies for the tables

## Clean Up

To remove all seed data:

```sql
-- Remove submissions
DELETE FROM form_submissions;

-- Remove form fields
DELETE FROM form_fields;

-- Remove forms
DELETE FROM forms;

-- Remove Super Admin user (careful!)
DELETE FROM public.users WHERE email = 'admin@nolt.finance';
DELETE FROM auth.users WHERE email = 'admin@nolt.finance';
```

⚠️ **Warning:** Only run cleanup commands if you're sure you want to delete all data!
