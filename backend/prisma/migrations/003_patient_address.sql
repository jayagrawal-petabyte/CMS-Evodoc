-- Add address field to Patient table
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "address" TEXT;
