# Multi-Step Form Migration Guide

## Overview
This migration adds multi-step wizard functionality to forms, allowing forms to be split into multiple steps with their own labels and field assignments.

## Database Changes
The migration adds three new columns:
- `forms.enable_steps` (BOOLEAN) - Whether the form uses multi-step navigation
- `forms.step_labels` (JSONB) - Array of step labels/titles
- `form_fields.step_number` (INTEGER) - Which step the field belongs to (default: 1)

## Running the Migration

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the SQL below
5. Click **Run** or press `Ctrl/Cmd + Enter`

```sql
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

-- Verify the columns were added
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name IN ('forms', 'form_fields')
    AND column_name IN ('enable_steps', 'step_labels', 'step_number')
ORDER BY table_name, ordinal_position;
```

### Option 2: Via Supabase CLI (if using local development)
```bash
# Apply the migration
npx supabase db push

# Or apply specific migration file
npx supabase db push supabase/migrations/20260119200000_add_form_steps.sql
```

## Verification

After running the migration, you should see output like:
```
 column_name  | data_type | column_default | is_nullable 
--------------+-----------+----------------+-------------
 enable_steps | boolean   | false          | YES
 step_labels  | jsonb     | '[]'::jsonb    | YES
 step_number  | integer   | 1              | YES
```

## Testing the Multi-Step Feature

1. **Create a New Form**:
   - Open the Form Builder
   - Click "Create New Form"
   - Toggle "Enable Multi-Step" to ON
   - Add custom step labels (e.g., "Personal Info", "Documents", "Review")
   - Click Create

2. **Add Fields to Steps**:
   - You'll see step tabs in the form canvas
   - Click on a step tab to make it active
   - Add fields - they will automatically be assigned to the active step
   - You can reassign fields to different steps using the step dropdown on each field

3. **Test Persistence**:
   - Save the form (click "Sync with Portal")
   - Navigate away or refresh the page
   - Click "Edit Form" on your multi-step form
   - Verify that:
     - The multi-step toggle is still ON
     - All step labels are preserved
     - Fields are in their correct steps

4. **Test Public Form Submission**:
   - Publish the form
   - Open the public form URL
   - You should see step navigation (Previous/Next buttons)
   - Progress indicator showing current step
   - Only fields from current step are visible

## Troubleshooting

### Issue: "Column already exists" error
**Solution**: The columns are already added. You can verify by running:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'forms' AND column_name IN ('enable_steps', 'step_labels');
```

### Issue: Multi-step toggle doesn't persist after creation
**Cause**: Migration not applied or code not updated  
**Solution**: 
1. Verify migration ran successfully (see Verification section)
2. Check browser console for errors
3. Ensure you're on the latest code version

### Issue: Fields don't show in correct steps after refresh
**Cause**: `step_number` not being saved when fields are created  
**Solution**: Verify the `createFormField` function includes `step_number` in the insert statement

### Issue: Changes don't persist to database
**Cause**: Update functions missing step-related fields  
**Solution**: Verify `updateForm` and `updateFormField` include enable_steps, step_labels, and step_number

## Rollback (if needed)

If you need to remove the columns:
```sql
-- WARNING: This will delete the column data!
ALTER TABLE public.forms 
DROP COLUMN IF EXISTS enable_steps,
DROP COLUMN IF EXISTS step_labels;

ALTER TABLE public.form_fields 
DROP COLUMN IF EXISTS step_number;
```

## Support

If you encounter issues:
1. Check browser console for JavaScript errors
2. Check Supabase logs for database errors
3. Verify the migration ran successfully using the verification query
4. Check that your code is up to date with the latest changes
