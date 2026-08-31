-- 1. Patients Delete Policy
CREATE POLICY "Staff can delete patients in their clinic" ON patients
  FOR DELETE USING (
    clinic_id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid())
  );

-- 2. Services Delete Policy
CREATE POLICY "Staff can delete services" ON services
  FOR DELETE USING (
    clinic_id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid())
  );

-- 3. Appointments Delete Policy
CREATE POLICY "Staff can delete appointments" ON appointments
  FOR DELETE USING (
    clinic_id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid())
  );

-- 4. Payments Delete Policy
CREATE POLICY "Staff can delete payments" ON payments
  FOR DELETE USING (
    clinic_id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid())
  );

-- 5. Treatment Plans Delete Policy
CREATE POLICY "Staff can delete treatment_plans" ON treatment_plans
  FOR DELETE USING (
    clinic_id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid())
  );

-- 6. Treatment Items Delete Policy
CREATE POLICY "Staff can delete treatment_items" ON treatment_items
  FOR DELETE USING (
    clinic_id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid())
  );

-- 7. Medical History Delete Policy
CREATE POLICY "Staff can delete medical_history" ON medical_history
  FOR DELETE USING (
    clinic_id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid())
  );
