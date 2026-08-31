-- 1. Create the payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  treatment_plan_id UUID REFERENCES treatment_plans(id) ON DELETE SET NULL,
  amount BIGINT NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'transfer')) DEFAULT 'cash',
  notes TEXT,
  paid_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_payments_clinic_date ON payments(clinic_id, paid_at);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
CREATE POLICY "Staff can view payments" ON payments
  FOR SELECT USING (clinic_id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid()));

CREATE POLICY "Staff can insert payments" ON payments
  FOR INSERT WITH CHECK (clinic_id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid()));

-- 2. Update appointments status constraint for Queue statuses
-- Postgres auto-generates names like 'table_column_check'
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check 
  CHECK (status IN ('scheduled', 'confirmed', 'arrived', 'in_chair', 'in_progress', 'billing', 'completed', 'cancelled', 'no_show'));
