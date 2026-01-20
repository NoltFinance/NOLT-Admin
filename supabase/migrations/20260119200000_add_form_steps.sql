-- Add step_number to form_fields for multi-step forms
ALTER TABLE public.form_fields 
ADD COLUMN IF NOT EXISTS step_number INTEGER DEFAULT 1;

-- Add step configuration to forms table
ALTER TABLE public.forms 
ADD COLUMN IF NOT EXISTS enable_steps BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS step_labels JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.form_fields.step_number IS 'Step number for multi-step forms (default: 1)';
COMMENT ON COLUMN public.forms.enable_steps IS 'Whether this form uses multi-step navigation';
COMMENT ON COLUMN public.forms.step_labels IS 'Array of step labels/titles for multi-step forms';
