-- Migration: Allow public access to published forms
-- Description: Add RLS policies for anonymous users to view published public forms

-- Enable RLS on forms table if not already enabled
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;

-- Enable RLS on form_fields table if not already enabled
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to view published public forms
CREATE POLICY "Allow public read access to published public forms"
ON forms
FOR SELECT
TO anon
USING (
  status = 'Published' AND visibility = 'Public'
);

-- Allow anonymous users to view fields of published public forms
CREATE POLICY "Allow public read access to form fields of public forms"
ON form_fields
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM forms
    WHERE forms.id = form_fields.form_id
    AND forms.status = 'Published'
    AND forms.visibility = 'Public'
  )
);

-- Allow anonymous users to submit forms
CREATE POLICY "Allow public insert to form_submissions"
ON form_submissions
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM forms
    WHERE forms.id = form_submissions.form_id
    AND forms.status = 'Published'
    AND forms.visibility = 'Public'
  )
);

COMMENT ON POLICY "Allow public read access to published public forms" ON forms IS 
'Allows anonymous users to view forms that are published and public';

COMMENT ON POLICY "Allow public read access to form fields of public forms" ON form_fields IS 
'Allows anonymous users to view fields of forms that are published and public';

COMMENT ON POLICY "Allow public insert to form_submissions" ON form_submissions IS 
'Allows anonymous users to submit forms that are published and public';
