-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'AUTH_FAILED', 'PASSWORD_RESET')),
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_role TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Super Admins and Internal Control can view audit logs
CREATE POLICY "Super Admins and Internal Control can view audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('Super Admin', 'Internal Control')
    )
  );

-- Function to get current user info
CREATE OR REPLACE FUNCTION get_current_user_info()
RETURNS TABLE (
  user_id UUID,
  user_email TEXT,
  user_role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.role
  FROM users u
  WHERE u.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  user_info RECORD;
  changed_fields TEXT[];
  old_json JSONB;
  new_json JSONB;
BEGIN
  -- Get current user info
  SELECT * INTO user_info FROM get_current_user_info() LIMIT 1;
  
  -- Determine action and prepare data
  IF (TG_OP = 'DELETE') THEN
    old_json := to_jsonb(OLD);
    new_json := NULL;
    
    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      old_data,
      new_data,
      user_id,
      user_email,
      user_role
    ) VALUES (
      TG_TABLE_NAME,
      OLD.id::TEXT,
      'DELETE',
      old_json,
      NULL,
      user_info.user_id,
      user_info.user_email,
      user_info.user_role
    );
    
    RETURN OLD;
    
  ELSIF (TG_OP = 'UPDATE') THEN
    old_json := to_jsonb(OLD);
    new_json := to_jsonb(NEW);
    
    -- Determine which fields changed
    SELECT array_agg(key)
    INTO changed_fields
    FROM jsonb_each(old_json)
    WHERE old_json->key IS DISTINCT FROM new_json->key;
    
    -- Only log if there are actual changes
    IF changed_fields IS NOT NULL AND array_length(changed_fields, 1) > 0 THEN
      INSERT INTO audit_logs (
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        changed_fields,
        user_id,
        user_email,
        user_role
      ) VALUES (
        TG_TABLE_NAME,
        NEW.id::TEXT,
        'UPDATE',
        old_json,
        new_json,
        changed_fields,
        user_info.user_id,
        user_info.user_email,
        user_info.user_role
      );
    END IF;
    
    RETURN NEW;
    
  ELSIF (TG_OP = 'INSERT') THEN
    new_json := to_jsonb(NEW);
    
    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      old_data,
      new_data,
      user_id,
      user_email,
      user_role
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id::TEXT,
      'INSERT',
      NULL,
      new_json,
      user_info.user_id,
      user_info.user_email,
      user_info.user_role
    );
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for users table
DROP TRIGGER IF EXISTS audit_users_trigger ON users;
CREATE TRIGGER audit_users_trigger
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create triggers for forms table
DROP TRIGGER IF EXISTS audit_forms_trigger ON forms;
CREATE TRIGGER audit_forms_trigger
  AFTER INSERT OR UPDATE OR DELETE ON forms
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create triggers for form_fields table
DROP TRIGGER IF EXISTS audit_form_fields_trigger ON form_fields;
CREATE TRIGGER audit_form_fields_trigger
  AFTER INSERT OR UPDATE OR DELETE ON form_fields
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create triggers for form_submissions table
DROP TRIGGER IF EXISTS audit_form_submissions_trigger ON form_submissions;
CREATE TRIGGER audit_form_submissions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON form_submissions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create triggers for loan_applications table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loan_applications') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS audit_loan_applications_trigger ON loan_applications';
    EXECUTE 'CREATE TRIGGER audit_loan_applications_trigger AFTER INSERT OR UPDATE OR DELETE ON loan_applications FOR EACH ROW EXECUTE FUNCTION audit_trigger_function()';
  END IF;
END $$;

-- Create triggers for investment_applications table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investment_applications') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS audit_investment_applications_trigger ON investment_applications';
    EXECUTE 'CREATE TRIGGER audit_investment_applications_trigger AFTER INSERT OR UPDATE OR DELETE ON investment_applications FOR EACH ROW EXECUTE FUNCTION audit_trigger_function()';
  END IF;
END $$;

-- Function to log authentication events
CREATE OR REPLACE FUNCTION log_auth_event(
  p_action TEXT,
  p_user_id UUID DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  user_info RECORD;
BEGIN
  -- If user_id provided, get additional info
  IF p_user_id IS NOT NULL THEN
    SELECT * INTO user_info FROM get_current_user_info() LIMIT 1;
  END IF;
  
  INSERT INTO audit_logs (
    table_name,
    action,
    user_id,
    user_email,
    user_role,
    ip_address,
    user_agent
  ) VALUES (
    'auth',
    p_action,
    COALESCE(p_user_id, user_info.user_id),
    COALESCE(p_user_email, user_info.user_email),
    user_info.user_role,
    p_ip_address,
    p_user_agent
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION log_auth_event TO authenticated;

COMMENT ON TABLE audit_logs IS 'Comprehensive audit log for all data changes and authentication events';
COMMENT ON FUNCTION audit_trigger_function() IS 'Generic trigger function that logs INSERT, UPDATE, DELETE operations';
COMMENT ON FUNCTION log_auth_event IS 'Logs authentication events like login, logout, failed attempts, password resets';
