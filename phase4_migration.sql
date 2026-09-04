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
