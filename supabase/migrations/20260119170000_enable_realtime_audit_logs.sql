-- Enable Realtime for audit_logs table
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;

-- Update the RLS policy to allow Super Admins and Internal Control to view audit logs
DROP POLICY IF EXISTS "Super Admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Super Admins and Internal Control can view audit logs" ON audit_logs;

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
