-- Migration: Improve audit log metadata capture
-- Description: Add functions to capture IP address and user agent from session context

-- Create a function to set request metadata in session config
CREATE OR REPLACE FUNCTION set_request_metadata(
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Store metadata in session-level custom variables
  -- These can be accessed by triggers during the same session
  IF p_user_agent IS NOT NULL THEN
    PERFORM set_config('app.user_agent', p_user_agent, false);
  END IF;
  
  IF p_ip_address IS NOT NULL THEN
    PERFORM set_config('app.ip_address', p_ip_address, false);
  END IF;
END;
$$;

-- Update audit trigger function to use session metadata
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_user_role TEXT;
  v_user_agent TEXT;
  v_ip_address TEXT;
  v_changed_fields TEXT[];
  v_old_data JSONB;
  v_new_data JSONB;
BEGIN
  -- Get current user info
  SELECT user_id, user_email, user_role
  INTO v_user_id, v_user_email, v_user_role
  FROM get_current_user_info();
  
  -- Try to get metadata from session config (set by client)
  BEGIN
    v_user_agent := current_setting('app.user_agent', true);
  EXCEPTION WHEN OTHERS THEN
    v_user_agent := NULL;
  END;
  
  BEGIN
    v_ip_address := current_setting('app.ip_address', true);
  EXCEPTION WHEN OTHERS THEN
    v_ip_address := NULL;
  END;

  -- Determine action type and changed fields
  IF TG_OP = 'DELETE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
    v_changed_fields := ARRAY(SELECT jsonb_object_keys(v_old_data));
  ELSIF TG_OP = 'INSERT' THEN
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
    v_changed_fields := ARRAY(SELECT jsonb_object_keys(v_new_data));
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    
    -- Detect changed fields by comparing old and new JSONB
    SELECT ARRAY_AGG(key)
    INTO v_changed_fields
    FROM (
      SELECT key
      FROM jsonb_each(v_new_data)
      WHERE v_old_data->>key IS DISTINCT FROM v_new_data->>key
    ) AS changed;
    
    -- Only log if there are actual changes
    IF v_changed_fields IS NULL OR array_length(v_changed_fields, 1) IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Insert audit log
  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_fields,
    user_id,
    user_email,
    user_role,
    user_agent,
    ip_address
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE((NEW.id)::TEXT, (OLD.id)::TEXT),
    TG_OP,
    v_old_data,
    v_new_data,
    v_changed_fields,
    v_user_id,
    v_user_email,
    v_user_role,
    v_user_agent,
    v_ip_address
  );

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Grant execute permission on the new function
GRANT EXECUTE ON FUNCTION set_request_metadata(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_request_metadata(TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION set_request_metadata IS 'Sets request metadata (user agent, IP) in session config for audit logging';
