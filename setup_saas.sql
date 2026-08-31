-- 1. Modify Clinics for SaaS billing
ALTER TABLE clinics
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;

-- By default give existing clinics 1 year of subscription
UPDATE clinics SET subscription_end_date = NOW() + INTERVAL '1 year' WHERE subscription_end_date IS NULL;

-- 2. Create Super Admins table
CREATE TABLE IF NOT EXISTS super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on super_admins
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

-- Only super admins can read super admins table
CREATE POLICY "Super admins can view super admins" ON super_admins
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- Function to check if a user is a super admin (for RLS on other tables if needed)
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Super admins should have access to ALL clinics
DROP POLICY IF EXISTS "Staff can view their clinic" ON clinics;
CREATE POLICY "Staff can view their clinic" ON clinics
  FOR SELECT USING (
    id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid()) OR is_super_admin()
  );

-- Super admins can update clinics
DROP POLICY IF EXISTS "Super admins can update clinics" ON clinics;
CREATE POLICY "Super admins can update clinics" ON clinics
  FOR UPDATE USING (
    is_super_admin()
  );
