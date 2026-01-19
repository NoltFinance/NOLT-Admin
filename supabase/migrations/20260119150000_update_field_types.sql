-- Update form_fields CHECK constraint to include all new field types
ALTER TABLE form_fields
DROP CONSTRAINT IF EXISTS form_fields_field_type_check;

ALTER TABLE form_fields
ADD CONSTRAINT form_fields_field_type_check
CHECK (field_type IN (
  'text',
  'number',
  'select',
  'multiselect',
  'date',
  'datetime',
  'time',
  'file',
  'textarea',
  'email',
  'phone',
  'url',
  'checkbox',
  'checkbox_group',
  'radio',
  'toggle',
  'rating',
  'slider',
  'color',
  'signature',
  'location'
));
