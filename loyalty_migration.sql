-- 1. Add Loyalty columns to patients and clinics
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS loyalty_point_value INT DEFAULT 100; -- 1 point = 100 UZS
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS loyalty_earn_rate INT DEFAULT 10000; -- Earn 1 point per 10,000 UZS spent

ALTER TABLE patients ADD COLUMN IF NOT EXISTS family_id UUID;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES patients(id) ON DELETE SET NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS loyalty_points INT DEFAULT 0;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS loyalty_tier TEXT CHECK (loyalty_tier IN ('bronze', 'silver', 'gold')) DEFAULT 'bronze';

-- 2. Create Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  discount_percentage INT, -- e.g., 10 for 10%
  discount_amount BIGINT, -- e.g., 50000 for 50,000 UZS
  start_date TIMESTAMPTZ DEFAULT now(),
  end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_clinic ON campaigns(clinic_id, is_active);
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage campaigns" ON campaigns
  FOR ALL USING (clinic_id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid()));


-- 3. Create Loyalty Transactions (Audit Log)
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  points INT NOT NULL, -- Positive for earned, negative for spent
  reason TEXT NOT NULL, -- e.g. 'Checkout Earned', 'Checkout Spent', 'Referral Bonus'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_patient ON loyalty_transactions(patient_id);
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view loyalty_transactions" ON loyalty_transactions
  FOR SELECT USING (clinic_id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid()));
CREATE POLICY "Staff can insert loyalty_transactions" ON loyalty_transactions
  FOR INSERT WITH CHECK (clinic_id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid()));
