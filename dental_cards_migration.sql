-- Migration: Add dental_cards table for 046 Forma (Stomatologik Tibbiy Karta)

CREATE TABLE dental_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  card_number TEXT,
  chief_complaints TEXT,        -- Asosiy shikoyatlar
  illness_history TEXT,         -- Kasallik anamnezi
  life_history TEXT,            -- Hayot anamnezi
  allergic_reactions TEXT,      -- Allergik reaktsiyalar
  facial_symmetry TEXT,         -- Yuz simmetriyasi
  lymph_nodes TEXT,             -- Limfa tugunlari
  oral_mucosa TEXT,             -- Og'iz shilliq qavati
  dental_formula JSONB,         -- Tish formulasi (per-tooth status JSON)
  diagnosis TEXT,               -- Tashxis
  mkb10_code TEXT,              -- MKB-10 kodi
  treatment_plan_text TEXT,     -- Davolash rejasi
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(patient_id)
);

ALTER TABLE dental_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage dental cards" ON dental_cards
  FOR ALL USING (clinic_id IN (SELECT clinic_id FROM staff WHERE user_id = auth.uid()));

CREATE INDEX idx_dental_cards_patient ON dental_cards(patient_id);
CREATE INDEX idx_dental_cards_clinic ON dental_cards(clinic_id);
