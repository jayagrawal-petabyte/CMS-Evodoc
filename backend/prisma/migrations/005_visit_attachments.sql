-- VisitAttachment table for file uploads during consultations
CREATE TABLE IF NOT EXISTS "VisitAttachment" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "clinicId"    TEXT NOT NULL,
  "visitId"     TEXT NOT NULL,
  "patientId"   TEXT,
  "filename"    TEXT NOT NULL,
  "mimeType"    TEXT NOT NULL,
  "size"        INTEGER NOT NULL DEFAULT 0,
  "blobPath"    TEXT NOT NULL,
  "uploadedBy"  TEXT NOT NULL,
  "uploadedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "VisitAttachment_visitId_idx" ON "VisitAttachment"("visitId");
CREATE INDEX IF NOT EXISTS "VisitAttachment_patientId_idx" ON "VisitAttachment"("patientId");
