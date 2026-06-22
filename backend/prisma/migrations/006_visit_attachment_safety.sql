-- Safety guard: guarantee VisitAttachment has the blobPath column the backend expects.
-- Covers the case where an older table version with "storagePath" already existed.
ALTER TABLE "VisitAttachment" ADD COLUMN IF NOT EXISTS "blobPath" TEXT;

-- If a legacy storagePath column exists with data, copy it into blobPath where blobPath is null.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'VisitAttachment' AND column_name = 'storagePath'
  ) THEN
    UPDATE "VisitAttachment" SET "blobPath" = "storagePath" WHERE "blobPath" IS NULL;
  END IF;
END $$;
