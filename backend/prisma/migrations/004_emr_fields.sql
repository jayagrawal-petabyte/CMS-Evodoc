-- Add EMR extended fields to PrescriptionDraft
ALTER TABLE "PrescriptionDraft" ADD COLUMN IF NOT EXISTS "emrData" JSONB DEFAULT '{}';

-- Add tokenId to Visit table (for start-visit by token)
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "tokenId" UUID;

-- Add version column to Visit for optimistic locking (if not exists)
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;
