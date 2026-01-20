-- =====================================================
-- NOLT Finance - Forms and Submissions Seed Data
-- =====================================================
-- This file seeds the database with sample forms and submissions
-- Run this after the main seed.sql
-- =====================================================

-- Clear existing data (optional - comment out if you want to keep existing data)
-- DELETE FROM form_submissions;
-- DELETE FROM form_fields;
-- DELETE FROM forms;

-- Insert Investment Form
INSERT INTO forms (
  id,
  name,
  type,
  category_type,
  status,
  visibility,
  description,
  created_by,
  administrators,
  created_at,
  updated_at,
  published_at,
  version
) VALUES (
  gen_random_uuid(),
  'Investment Application',
  'Investment',
  'Financial Product',
  'Published',
  'Public',
  'Apply for investment products with NOLT Finance',
  (SELECT id FROM auth.users WHERE email = 'admin@nolt.finance' LIMIT 1),
  ARRAY[(SELECT id FROM auth.users WHERE email = 'admin@nolt.finance' LIMIT 1)]::UUID[],
  NOW(),
  NOW(),
  NOW(),
  1
)
ON CONFLICT DO NOTHING;

-- Insert Loan Form
INSERT INTO forms (
  id,
  name,
  type,
  category_type,
  status,
  visibility,
  description,
  created_by,
  administrators,
  created_at,
  updated_at,
  published_at,
  version
) VALUES (
  gen_random_uuid(),
  'Loan Application',
  'Loan',
  'Financial Product',
  'Published',
  'Public',
  'Apply for loan products with NOLT Finance',
  (SELECT id FROM auth.users WHERE email = 'admin@nolt.finance' LIMIT 1),
  ARRAY[(SELECT id FROM auth.users WHERE email = 'admin@nolt.finance' LIMIT 1)]::UUID[],
  NOW(),
  NOW(),
  NOW(),
  1
)
ON CONFLICT DO NOTHING;

-- Add form fields for Investment Form
DO $$
DECLARE
  investment_form_id UUID;
BEGIN
  SELECT id INTO investment_form_id FROM forms WHERE type = 'Investment' LIMIT 1;
  
  IF investment_form_id IS NOT NULL THEN
    -- Personal Information Fields
    INSERT INTO form_fields (form_id, field_type, label, placeholder, required, order_index, created_at, updated_at)
    VALUES 
      (investment_form_id, 'text', 'Full Name', 'Enter your full name', true, 1, NOW(), NOW()),
      (investment_form_id, 'email', 'Email Address', 'your.email@example.com', true, 2, NOW(), NOW()),
      (investment_form_id, 'tel', 'Phone Number', '+234 XXX XXX XXXX', true, 3, NOW(), NOW()),
      (investment_form_id, 'text', 'BVN', 'Bank Verification Number', true, 4, NOW(), NOW()),
      (investment_form_id, 'text', 'NIN', 'National Identity Number', false, 5, NOW(), NOW()),
      
      -- Investment Details
      (investment_form_id, 'number', 'Investment Amount', 'Enter amount to invest', true, 6, NOW(), NOW()),
      (investment_form_id, 'select', 'Investment Plan', 'Select a plan', true, 7, NOW(), NOW()),
      (investment_form_id, 'select', 'Tenure', 'Select duration', true, 8, NOW(), NOW()),
      (investment_form_id, 'text', 'Target Amount', 'Expected returns', false, 9, NOW(), NOW()),
      
      -- Documents
      (investment_form_id, 'file', 'Government ID', 'Upload ID document', true, 10, NOW(), NOW()),
      (investment_form_id, 'file', 'Proof of Address', 'Upload utility bill', false, 11, NOW(), NOW()),
      (investment_form_id, 'file', 'Transfer Receipt', 'Upload payment proof', false, 12, NOW(), NOW())
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Add form fields for Loan Form
DO $$
DECLARE
  loan_form_id UUID;
BEGIN
  SELECT id INTO loan_form_id FROM forms WHERE type = 'Loan' LIMIT 1;
  
  IF loan_form_id IS NOT NULL THEN
    -- Personal Information Fields
    INSERT INTO form_fields (form_id, field_type, label, placeholder, required, order_index, created_at, updated_at)
    VALUES 
      (loan_form_id, 'text', 'Full Name', 'Enter your full name', true, 1, NOW(), NOW()),
      (loan_form_id, 'email', 'Email Address', 'your.email@example.com', true, 2, NOW(), NOW()),
      (loan_form_id, 'tel', 'Phone Number', '+234 XXX XXX XXXX', true, 3, NOW(), NOW()),
      (loan_form_id, 'text', 'BVN', 'Bank Verification Number', true, 4, NOW(), NOW()),
      (loan_form_id, 'text', 'NIN', 'National Identity Number', false, 5, NOW(), NOW()),
      
      -- Loan Details
      (loan_form_id, 'number', 'Loan Amount', 'Enter amount needed', true, 6, NOW(), NOW()),
      (loan_form_id, 'select', 'Loan Category', 'Select category', true, 7, NOW(), NOW()),
      (loan_form_id, 'select', 'Loan Product', 'Select product', true, 8, NOW(), NOW()),
      (loan_form_id, 'select', 'Repayment Period', 'Select duration', true, 9, NOW(), NOW()),
      (loan_form_id, 'number', 'Monthly Income', 'Your monthly income', true, 10, NOW(), NOW()),
      
      -- Documents
      (loan_form_id, 'file', 'Government ID', 'Upload ID document', true, 11, NOW(), NOW()),
      (loan_form_id, 'file', 'Bank Statement', 'Upload 6 months statement', true, 12, NOW(), NOW()),
      (loan_form_id, 'file', 'Proof of Address', 'Upload utility bill', false, 13, NOW(), NOW()),
      (loan_form_id, 'file', 'Selfie', 'Upload a selfie', false, 14, NOW(), NOW())
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Insert sample Investment submissions
DO $$
DECLARE
  investment_form_id UUID;
  admin_id UUID;
BEGIN
  SELECT id INTO investment_form_id FROM forms WHERE type = 'Investment' LIMIT 1;
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@nolt.finance' LIMIT 1;
  
  IF investment_form_id IS NOT NULL THEN
    -- Submission 1: Pending Review
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
      investment_form_id,
      'John Doe',
      'john.doe@example.com',
      'pending',
      jsonb_build_object(
        'full_name', 'John Doe',
        'email', 'john.doe@example.com',
        'phone', '+2348012345678',
        'bvn', '12345678901',
        'nin', '12345678901234',
        'investment_amount', '500000',
        'investment_plan', 'Fixed Deposit',
        'tenure', '6 months',
        'target_amount', '550000'
      ),
      NOW() - INTERVAL '2 days',
      NULL,
      NULL
    );
    
    -- Submission 2: Under Review (Docs Verification)
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
      investment_form_id,
      'Sarah Johnson',
      'sarah.j@example.com',
      'under_review',
      jsonb_build_object(
        'full_name', 'Sarah Johnson',
        'email', 'sarah.j@example.com',
        'phone', '+2348087654321',
        'bvn', '98765432109',
        'investment_amount', '1000000',
        'investment_plan', 'Treasury Bills',
        'tenure', '12 months',
        'target_amount', '1150000'
      ),
      NOW() - INTERVAL '1 day',
      admin_id,
      NOW() - INTERVAL '12 hours'
    );
  END IF;
END $$;

-- Insert sample Loan submissions
DO $$
DECLARE
  loan_form_id UUID;
  admin_id UUID;
BEGIN
  SELECT id INTO loan_form_id FROM forms WHERE type = 'Loan' LIMIT 1;
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@nolt.finance' LIMIT 1;
  
  IF loan_form_id IS NOT NULL THEN
    -- Submission 1: Pending Review
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
      loan_form_id,
      'Michael Brown',
      'michael.b@example.com',
      'pending',
      jsonb_build_object(
        'full_name', 'Michael Brown',
        'email', 'michael.b@example.com',
        'phone', '+2348011122233',
        'bvn', '11122233344',
        'amount', '300000',
        'loan_category', 'Personal',
        'loan_product', 'Salary Advance',
        'repayment_period', '6 months',
        'monthly_income', '150000',
        'has_active_loans', 'No'
      ),
      NOW() - INTERVAL '3 days',
      NULL,
      NULL
    );
    
    -- Submission 2: Under Review (Docs Verification)
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
      loan_form_id,
      'Emily Davis',
      'emily.d@example.com',
      'under_review',
      jsonb_build_object(
        'full_name', 'Emily Davis',
        'email', 'emily.d@example.com',
        'phone', '+2348099887766',
        'bvn', '44455566677',
        'amount', '500000',
        'loan_category', 'Business',
        'loan_product', 'SME Loan',
        'repayment_period', '12 months',
        'monthly_income', '250000',
        'has_active_loans', 'No'
      ),
      NOW() - INTERVAL '2 days',
      admin_id,
      NOW() - INTERVAL '18 hours'
    );
    
    -- Submission 3: In Credit Check
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
      loan_form_id,
      'David Wilson',
      'david.w@example.com',
      'in_review',
      jsonb_build_object(
        'full_name', 'David Wilson',
        'email', 'david.w@example.com',
        'phone', '+2348055544433',
        'bvn', '77788899900',
        'amount', '750000',
        'loan_category', 'Personal',
        'loan_product', 'IPPIS Loan',
        'repayment_period', '18 months',
        'monthly_income', '400000',
        'has_active_loans', 'Yes'
      ),
      NOW() - INTERVAL '5 days',
      admin_id,
      NOW() - INTERVAL '2 days'
    );
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Forms and submissions seed data created successfully!';
  RAISE NOTICE '📋 Created 2 forms (Investment & Loan)';
  RAISE NOTICE '📝 Created sample submissions with various statuses';
END $$;
