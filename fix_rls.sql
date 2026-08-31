-- 1. Drop the recursive policy
DROP POLICY IF EXISTS "Staff can view colleagues" ON staff;

-- 2. Create a secure function to get the current user's clinic ID without triggering RLS recursively
CREATE OR REPLACE FUNCTION public.get_auth_clinic_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clinic_id FROM staff WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 3. Add the fixed policy back to staff
CREATE POLICY "Staff can view colleagues" ON staff
  FOR SELECT USING (
    clinic_id = public.get_auth_clinic_id() OR user_id = auth.uid()
  );

-- 4. Update the other policies to use this faster function instead of subqueries (optional but recommended for performance)
DROP POLICY IF EXISTS "Staff can view their clinic" ON clinics;
CREATE POLICY "Staff can view their clinic" ON clinics
  FOR SELECT USING (id = public.get_auth_clinic_id());
