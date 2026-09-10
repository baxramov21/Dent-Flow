-- 1. Add telegram_chat_id to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- 2. Update notifications type constraint to include telegram and eskiz
-- First, drop the existing constraint. The name might be 'notifications_type_check'
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the new constraint
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('sms', 'whatsapp', 'telegram', 'eskiz'));
