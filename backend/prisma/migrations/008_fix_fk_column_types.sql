-- Invoice.patientId / visitId and VisitAttachment.visitId / patientId were created
-- as UUID, but patient and doctor ids in this deployment are TEXT (e.g. 'patient-001').
-- Inserting a non-uuid id into a uuid column fails. Relax these FK columns to TEXT
-- so they match the rest of the schema. (uuid -> text is a safe, lossless cast.)

ALTER TABLE "Invoice"         ALTER COLUMN "patientId" TYPE TEXT USING "patientId"::text;
ALTER TABLE "Invoice"         ALTER COLUMN "visitId"   TYPE TEXT USING "visitId"::text;
ALTER TABLE "VisitAttachment" ALTER COLUMN "visitId"   TYPE TEXT USING "visitId"::text;
ALTER TABLE "VisitAttachment" ALTER COLUMN "patientId" TYPE TEXT USING "patientId"::text;
