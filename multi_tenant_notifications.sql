-- Add multi-tenant notification credentials to clinics table
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS eskiz_email TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS eskiz_password TEXT;
