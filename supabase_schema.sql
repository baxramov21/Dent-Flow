-- TENANT TABLE
CREATE TABLE clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  logo_url TEXT,
  timezone TEXT DEFAULT 'Asia/Tashkent',
  currency TEXT DEFAULT 'UZS',
  locale TEXT DEFAULT 'uz',
  working_hours JSONB DEFAULT '{"mon":{"start":"09:00","end":"18:00"},"tue":{"start":"09:00","end":"18:00"},"wed":{"start":"09:00","end":"18:00"},"thu":{"start":"09:00","end":"18:00"},"fri":{"start":"09:00","end":"18:00"},"sat":{"start":"09:00","end":"14:00"},"sun":null}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- STAFF (linked to Supabase Auth users)
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'dentist', 'receptionist')) NOT NULL,
  specialization TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(clinic_id, user_id)
);

-- PATIENTS
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female')),
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- MEDICAL HISTORY
CREATE TABLE medical_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  condition TEXT NOT NULL,
  details TEXT,
  reported_at TIMESTAMPTZ DEFAULT now()
);

-- SERVICE CATALOG
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  name_ru TEXT,
  name_uz TEXT,
  category TEXT,
  price BIGINT NOT NULL,
  duration_minutes INT DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- TREATMENT PLANS
CREATE TABLE treatment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  dentist_id UUID REFERENCES staff(id) NOT NULL,
  title TEXT NOT NULL,
  status TEXT CHECK (status IN ('draft', 'active', 'completed', 'cancelled')) DEFAULT 'draft',
  notes TEXT,
  tooth_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TREATMENT ITEMS
CREATE TABLE treatment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_plan_id UUID REFERENCES treatment_plans(id) ON DELETE CASCADE NOT NULL,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES services(id) NOT NULL,
  tooth_number INT,
  status TEXT CHECK (status IN ('planned', 'in_progress', 'completed')) DEFAULT 'planned',
  price_override BIGINT,
  notes TEXT,
  completed_at TIMESTAMPTZ
);

-- APPOINTMENTS
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  dentist_id UUID REFERENCES staff(id) NOT NULL,
  treatment_plan_id UUID REFERENCES treatment_plans(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')) DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- NOTIFICATION LOG
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('sms', 'whatsapp')) DEFAULT 'sms',
  template TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'sent', 'delivered', 'failed')) DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  provider_response JSONB
);

-- INDEXES
CREATE INDEX idx_patients_clinic ON patients(clinic_id);
CREATE INDEX idx_patients_phone ON patients(clinic_id, phone);
CREATE INDEX idx_appointments_clinic_date ON appointments(clinic_id, start_time);
CREATE INDEX idx_appointments_dentist ON appointments(dentist_id, start_time);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_treatment_plans_patient ON treatment_plans(patient_id);
CREATE INDEX idx_staff_clinic ON staff(clinic_id);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- CLINICS: Users can only view their own clinic (joined via staff)
CREATE POLICY "Staff can view their clinic" ON clinics
  FOR SELECT USING (
    id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid())
  );

-- STAFF: Users can view staff in their clinic
CREATE POLICY "Staff can view colleagues" ON staff
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid())
  );
-- Only admins can insert/update staff (can be refined later)

-- PATIENTS
CREATE POLICY "Staff can view patients in their clinic" ON patients
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid())
  );
CREATE POLICY "Staff can insert patients in their clinic" ON patients
  FOR INSERT WITH CHECK (
    clinic_id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid())
  );
CREATE POLICY "Staff can update patients in their clinic" ON patients
  FOR UPDATE USING (
    clinic_id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid())
  );

-- MEDICAL HISTORY
CREATE POLICY "Staff can manage medical history" ON medical_history
  FOR ALL USING (
    clinic_id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid())
  );

-- SERVICES
CREATE POLICY "Staff can view services" ON services
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid())
  );

-- TREATMENT PLANS & ITEMS
CREATE POLICY "Staff can manage treatment plans" ON treatment_plans
  FOR ALL USING (
    clinic_id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid())
  );
CREATE POLICY "Staff can manage treatment items" ON treatment_items
  FOR ALL USING (
    clinic_id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid())
  );

-- APPOINTMENTS
CREATE POLICY "Staff can manage appointments" ON appointments
  FOR ALL USING (
    clinic_id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid())
  );

-- NOTIFICATIONS
CREATE POLICY "Staff can view notifications" ON notifications
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid())
  );

-- INITIAL SEED (Example to get started)
-- Note: Replace 'your-auth-uid-here' with the actual user ID from auth.users once you sign up
/*
INSERT INTO clinics (id, name) VALUES ('d02b5454-e69c-4876-b928-85c8d0a87a74', 'DentFlow Clinic');
-- INSERT INTO staff (clinic_id, user_id, full_name, role) VALUES ('d02b5454-e69c-4876-b928-85c8d0a87a74', 'your-auth-uid-here', 'Admin User', 'admin');
*/

-- TOOTH STATUS (Interactive Dental Chart)
CREATE TABLE tooth_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  tooth_number INT NOT NULL,
  status TEXT CHECK (status IN ('healthy','caries','filled','crown','bridge','implant','extracted','root_canal','planned')) DEFAULT 'healthy',
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(patient_id, tooth_number)
);

ALTER TABLE tooth_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage tooth status" ON tooth_status
  FOR ALL USING (clinic_id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid()));
