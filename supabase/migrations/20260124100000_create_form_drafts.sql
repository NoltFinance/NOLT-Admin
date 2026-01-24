-- =====================================================
-- Form Drafts Migration
-- Add support for saving form progress as drafts
-- =====================================================

-- Create form_drafts table for storing in-progress form applications
CREATE TABLE IF NOT EXISTS public.form_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_data JSONB NOT NULL DEFAULT '{}', -- Stores all field responses in progress
  current_step INTEGER DEFAULT 0, -- For multi-step forms
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one draft per user per form
  CONSTRAINT form_drafts_user_form_unique UNIQUE (form_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_form_drafts_form_id ON public.form_drafts(form_id);
CREATE INDEX IF NOT EXISTS idx_form_drafts_user_id ON public.form_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_form_drafts_updated_at ON public.form_drafts(updated_at DESC);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_form_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_form_drafts_updated_at
  BEFORE UPDATE ON public.form_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_form_drafts_updated_at();

-- Enable RLS
ALTER TABLE public.form_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own drafts
CREATE POLICY "Users can read their own drafts"
  ON public.form_drafts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own drafts"
  ON public.form_drafts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drafts"
  ON public.form_drafts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drafts"
  ON public.form_drafts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin users can view all drafts
CREATE POLICY "Admins can view all drafts"
  ON public.form_drafts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('Super Admin', 'Sales Manager', 'Credit')
    )
  );

-- Add user_id to form_submissions to track who submitted
ALTER TABLE public.form_submissions 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for user submissions
CREATE INDEX IF NOT EXISTS idx_form_submissions_user_id ON public.form_submissions(user_id);

-- Update RLS policy to allow users to view their own submissions
CREATE POLICY "Users can read their own submissions"
  ON public.form_submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Update insert policy to set user_id
DROP POLICY IF EXISTS "Allow anyone to insert form submissions" ON public.form_submissions;

CREATE POLICY "Authenticated users can submit forms"
  ON public.form_submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow anonymous submissions (optional - for public forms)
CREATE POLICY "Anonymous users can submit public forms"
  ON public.form_submissions FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms
      WHERE forms.id = form_submissions.form_id
      AND forms.visibility = 'Public'
      AND forms.status = 'Published'
    )
  );

-- Create a view for user's submitted forms with form details
CREATE OR REPLACE VIEW public.user_form_submissions AS
SELECT 
  fs.id,
  fs.form_id,
  fs.user_id,
  fs.applicant_email,
  fs.applicant_name,
  fs.field_responses,
  fs.status,
  fs.submitted_at,
  fs.reviewed_by,
  fs.reviewed_at,
  fs.review_notes,
  f.name as form_name,
  f.type as form_type,
  f.category_type,
  f.description as form_description
FROM public.form_submissions fs
JOIN public.forms f ON f.id = fs.form_id
WHERE fs.user_id = auth.uid();

-- Grant permissions
GRANT SELECT ON public.user_form_submissions TO authenticated;

-- Create a view for user's draft forms with form details
CREATE OR REPLACE VIEW public.user_form_drafts AS
SELECT 
  fd.id,
  fd.form_id,
  fd.user_id,
  fd.form_data,
  fd.current_step,
  fd.created_at,
  fd.updated_at,
  f.name as form_name,
  f.type as form_type,
  f.category_type,
  f.description as form_description,
  f.enable_steps,
  f.step_labels
FROM public.form_drafts fd
JOIN public.forms f ON f.id = fd.form_id
WHERE fd.user_id = auth.uid();

-- Grant permissions
GRANT SELECT ON public.user_form_drafts TO authenticated;

-- Add comment
COMMENT ON TABLE public.form_drafts IS 'Stores in-progress form applications that users can save and resume later';
COMMENT ON TABLE public.form_submissions IS 'Stores completed form submissions from applicants';
COMMENT ON VIEW public.user_form_submissions IS 'View of user submitted forms with form details';
COMMENT ON VIEW public.user_form_drafts IS 'View of user draft forms with form details';

-- Success message
SELECT 'Form drafts migration completed successfully!' as message;
