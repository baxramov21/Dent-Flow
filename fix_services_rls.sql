-- Allow staff to insert services for their clinic
CREATE POLICY "Staff can insert services" ON services
  FOR INSERT WITH CHECK (
    clinic_id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid())
  );

-- Allow staff to update services for their clinic
CREATE POLICY "Staff can update services" ON services
  FOR UPDATE USING (
    clinic_id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid())
  );
