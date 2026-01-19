-- Create forms table for storing dynamic form configurations
CREATE TABLE IF NOT EXISTS public.forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Loan', 'Investment')),
  category_type TEXT, -- e.g., 'Business', 'Employees', 'Niche', 'NOLT Rise', 'NOLT Vault'
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Published', 'Archived')),
  visibility TEXT NOT NULL DEFAULT 'Public' CHECK (visibility IN ('Public', 'Internal', 'Private')),
  description TEXT,
  administrators UUID[] DEFAULT '{}', -- Array of user IDs who can manage this form
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1
);

-- Create form_fields table for storing individual fields within forms
CREATE TABLE IF NOT EXISTS public.form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'select', 'date', 'file', 'textarea', 'email', 'phone', 'checkbox')),
  label TEXT NOT NULL,
  placeholder TEXT,
  required BOOLEAN NOT NULL DEFAULT false,
  options JSONB, -- For select/checkbox options
  validation_rules JSONB, -- For custom validation rules
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT form_fields_order_unique UNIQUE (form_id, order_index)
);

-- Create form_submissions table for storing applicant form responses
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE RESTRICT,
  applicant_email TEXT NOT NULL,
  applicant_name TEXT NOT NULL,
  field_responses JSONB NOT NULL, -- Stores all field responses
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Under Review', 'Approved', 'Rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_forms_type ON public.forms(type);
CREATE INDEX IF NOT EXISTS idx_forms_category_type ON public.forms(category_type);
CREATE INDEX IF NOT EXISTS idx_forms_status ON public.forms(status);
CREATE INDEX IF NOT EXISTS idx_forms_visibility ON public.forms(visibility);
CREATE INDEX IF NOT EXISTS idx_forms_created_by ON public.forms(created_by);
CREATE INDEX IF NOT EXISTS idx_forms_administrators ON public.forms USING GIN(administrators);
CREATE INDEX IF NOT EXISTS idx_form_fields_form_id ON public.form_fields(form_id);
CREATE INDEX IF NOT EXISTS idx_form_fields_order ON public.form_fields(form_id, order_index);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON public.form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_email ON public.form_submissions(applicant_email);
CREATE INDEX IF NOT EXISTS idx_form_submissions_status ON public.form_submissions(status);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_forms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_forms_updated_at
  BEFORE UPDATE ON public.forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_forms_updated_at();

CREATE TRIGGER trigger_update_form_fields_updated_at
  BEFORE UPDATE ON public.form_fields
  FOR EACH ROW
  EXECUTE FUNCTION public.update_forms_updated_at();

-- Enable RLS on all tables
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for forms table
CREATE POLICY "Allow authenticated users to read all forms"
  ON public.forms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow Super Admin to insert forms"
  ON public.forms FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'Super Admin'
    )
  );

CREATE POLICY "Allow Super Admin to update forms"
  ON public.forms FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND (users.role = 'Super Admin' OR auth.uid() = ANY(forms.administrators))
    )
  );

CREATE POLICY "Allow Super Admin to delete forms"
  ON public.forms FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'Super Admin'
    )
  );

-- RLS Policies for form_fields table
CREATE POLICY "Allow authenticated users to read all form fields"
  ON public.form_fields FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow Super Admin and form administrators to manage form fields"
  ON public.form_fields FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'Super Admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.forms
      WHERE forms.id = form_fields.form_id
      AND auth.uid() = ANY(forms.administrators)
    )
  );

-- RLS Policies for form_submissions table
CREATE POLICY "Allow authenticated users to read all submissions"
  ON public.form_submissions FOR SELECT
  TO authenticated
  USING (true);

-- Public users can submit forms (no auth required)
CREATE POLICY "Allow anyone to insert form submissions"
  ON public.form_submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow staff to update submissions"
  ON public.form_submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('Super Admin', 'Credit', 'Sales Manager')
    )
  );

-- Insert default form templates
INSERT INTO public.forms (name, type, category_type, status, visibility, description, version)
VALUES 
  ('Retail Loan Application', 'Loan', 'Business', 'Published', 'Public', 'Standard loan application form for retail customers', 1),
  ('Investment Registration', 'Investment', 'NOLT Rise', 'Published', 'Public', 'Investment account registration and plan selection', 1)
ON CONFLICT DO NOTHING;
