-- Create approval_gates table for workflow gate configuration
CREATE TABLE IF NOT EXISTS public.approval_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  workflow_type TEXT NOT NULL CHECK (workflow_type IN ('Loan', 'Investment', 'Both')),
  gatekeepers TEXT[] NOT NULL DEFAULT '{}',
  "order" INTEGER NOT NULL,
  stage TEXT NOT NULL,
  required_actions TEXT[] NOT NULL DEFAULT '{}',
  special_conditions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_approval_gates_order ON public.approval_gates("order");
CREATE INDEX IF NOT EXISTS idx_approval_gates_workflow_type ON public.approval_gates(workflow_type);

-- Enable RLS
ALTER TABLE public.approval_gates ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow authenticated users to read all gates
CREATE POLICY "approval_gates_select_policy" ON public.approval_gates
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert gates
CREATE POLICY "approval_gates_insert_policy" ON public.approval_gates
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update gates
CREATE POLICY "approval_gates_update_policy" ON public.approval_gates
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to delete gates
CREATE POLICY "approval_gates_delete_policy" ON public.approval_gates
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON public.approval_gates TO authenticated;
GRANT ALL ON public.approval_gates TO service_role;

-- Seed default approval gates
INSERT INTO public.approval_gates (name, description, workflow_type, gatekeepers, "order", stage, required_actions, special_conditions)
VALUES
  -- Gate 1: Sales Manager Approval (Both Workflows)
  (
    'Gate 1: Submission Approval',
    'Initial review and approval of submitted applications',
    'Both',
    ARRAY['Sales Manager', 'Super Admin'],
    1,
    'Submission → Customer Validation',
    ARRAY['Verify applicant information', 'Approve to proceed', 'Decline if invalid'],
    NULL
  ),
  
  -- Gate 2: Customer Experience Approval (Both Workflows)
  (
    'Gate 2: Customer Validation',
    'Document verification and customer due diligence',
    'Both',
    ARRAY['Customer Experience', 'Super Admin'],
    2,
    'Customer Validation → Next Stage',
    ARRAY['Verify identity documents', 'Check customer information accuracy', 'Approve or return to sales'],
    NULL
  ),
  
  -- Gate 3a: Credit Check (Loans Only)
  (
    'Gate 3: Credit Check',
    'Credit assessment and eligibility determination',
    'Loan',
    ARRAY['Credit', 'Super Admin'],
    3,
    'Credit Check → Request For Payment',
    ARRAY['Assess creditworthiness', 'Determine eligible loan amount', 'Set repayment terms', 'Approve or decline'],
    '⚠️ Must specify eligible amount before approval'
  ),
  
  -- Gate 3b: Payment Verification (Investments Only)
  (
    'Gate 3: Payment Verification',
    'Compliance audit and payment confirmation',
    'Investment',
    ARRAY['Internal Control', 'Super Admin'],
    3,
    'Payment Verification → Certificate Issued',
    ARRAY['Verify payment receipt', 'Conduct compliance checks', 'Review documentation completeness', 'Approve for certificate issuance'],
    NULL
  ),
  
  -- Gate 4: Compliance Audit (Loans Only)
  (
    'Gate 4: Compliance Audit',
    'Final compliance verification before disbursement',
    'Loan',
    ARRAY['Internal Control', 'Super Admin'],
    4,
    'Request For Payment → Pending Disbursement',
    ARRAY['Verify all documentation', 'Check compliance with policies', 'Validate credit decision', 'Approve for disbursement'],
    NULL
  ),
  
  -- Gate 5: Fund Disbursement (Loans Only)
  (
    'Gate 5: Fund Disbursement',
    'Final payment execution and loan disbursement',
    'Loan',
    ARRAY['Finance', 'Super Admin'],
    5,
    'Pending Disbursement → Disbursed',
    ARRAY['Process payment to applicant', 'Confirm fund transfer', 'Update disbursement status', 'Complete loan record'],
    NULL
  ),
  
  -- Gate 4: Certificate Issuance (Investments Only)
  (
    'Gate 4: Certificate Issuance',
    'Final certificate generation and issuance',
    'Investment',
    ARRAY['Finance', 'Super Admin'],
    4,
    'Certificate Processing → Certificate Issued',
    ARRAY['Generate investment certificate', 'Record investment details', 'Send certificate to investor', 'Complete investment record'],
    NULL
  )
ON CONFLICT DO NOTHING;
