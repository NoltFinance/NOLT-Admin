-- Allow authenticated clients to insert audit logs when user_id matches
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON audit_logs;

CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
