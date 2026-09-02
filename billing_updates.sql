-- billing_updates.sql

-- 1. Add total_debt to patients
ALTER TABLE patients ADD COLUMN IF NOT EXISTS total_debt BIGINT DEFAULT 0;

-- 2. Add billing fields to appointments
-- Since payment_status checks might need to be relaxed during migration, we'll just use TEXT without constraint, 
-- or we can add a check.
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'partially_paid', 'unpaid')) DEFAULT 'pending';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS total_cost BIGINT DEFAULT 0;

-- 3. Update payments table to link directly to appointments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;
