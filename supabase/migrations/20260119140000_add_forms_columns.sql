-- Add missing columns to forms table
ALTER TABLE public.forms 
  ADD COLUMN IF NOT EXISTS category_type TEXT,
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'Public' CHECK (visibility IN ('Public', 'Internal', 'Private')),
  ADD COLUMN IF NOT EXISTS administrators UUID[] DEFAULT '{}';

-- Create index for administrators column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_forms_administrators') THEN
    CREATE INDEX idx_forms_administrators ON public.forms USING GIN(administrators);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_forms_category_type') THEN
    CREATE INDEX idx_forms_category_type ON public.forms(category_type);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_forms_visibility') THEN
    CREATE INDEX idx_forms_visibility ON public.forms(visibility);
  END IF;
END $$;

-- Update RLS policies to include form administrators
DROP POLICY IF EXISTS "Allow Super Admin to update forms" ON public.forms;
CREATE POLICY "Allow Super Admin and administrators to update forms"
  ON public.forms FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND (users.role = 'Super Admin' OR auth.uid() = ANY(forms.administrators))
    )
  );

DROP POLICY IF EXISTS "Allow Super Admin to manage form fields" ON public.form_fields;
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
