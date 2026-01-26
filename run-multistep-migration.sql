-- ================================================================
-- MULTI-STEP FORM MIGRATION
-- Run this in Supabase SQL Editor
-- ================================================================

-- Add step_number to form_fields for multi-step forms
ALTER TABLE public.form_fields 
ADD COLUMN IF NOT EXISTS step_number INTEGER DEFAULT 1;

-- Add step configuration to forms table
ALTER TABLE public.forms 
ADD COLUMN IF NOT EXISTS enable_steps BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS step_labels JSONB DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN public.form_fields.step_number IS 'Step number for multi-step forms (default: 1)';
COMMENT ON COLUMN public.forms.enable_steps IS 'Whether this form uses multi-step navigation';
COMMENT ON COLUMN public.forms.step_labels IS 'Array of step labels/titles for multi-step forms';

-- Verify the columns were added successfully
SELECT 
    '✅ Migration completed successfully!' as status,
    COUNT(*) as columns_added
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name IN ('forms', 'form_fields')
    AND column_name IN ('enable_steps', 'step_labels', 'step_number');

-- Show the new columns with their properties
SELECT 
    table_name,
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name IN ('forms', 'form_fields')
    AND column_name IN ('enable_steps', 'step_labels', 'step_number')
ORDER BY table_name, ordinal_position;
