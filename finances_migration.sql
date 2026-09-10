-- Add commission rates to staff and services
ALTER TABLE staff ADD COLUMN IF NOT EXISTS default_commission_rate INT DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS commission_rate INT;

-- Create doctor_commissions table
CREATE TABLE IF NOT EXISTS doctor_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  dentist_id UUID REFERENCES staff(id) ON DELETE CASCADE NOT NULL,
  treatment_item_id UUID REFERENCES treatment_items(id) ON DELETE CASCADE NOT NULL,
  amount BIGINT NOT NULL,
  status TEXT CHECK (status IN ('unpaid', 'paid')) DEFAULT 'unpaid',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(treatment_item_id) -- A treatment item can only generate one commission record
);

-- Create payouts table
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  dentist_id UUID REFERENCES staff(id) ON DELETE CASCADE NOT NULL,
  amount BIGINT NOT NULL,
  notes TEXT,
  paid_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_doctor_commissions_clinic_status ON doctor_commissions(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_doctor_commissions_dentist ON doctor_commissions(dentist_id);
CREATE INDEX IF NOT EXISTS idx_payouts_clinic ON payouts(clinic_id);
CREATE INDEX IF NOT EXISTS idx_payouts_dentist ON payouts(dentist_id);

-- Enable RLS
ALTER TABLE doctor_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Policies for doctor_commissions
CREATE POLICY "Staff can manage doctor_commissions" ON doctor_commissions
  FOR ALL USING (clinic_id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid()));

-- Policies for payouts
CREATE POLICY "Staff can manage payouts" ON payouts
  FOR ALL USING (clinic_id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid()));
