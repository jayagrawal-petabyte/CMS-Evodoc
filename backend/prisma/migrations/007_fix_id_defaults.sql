-- ROOT-CAUSE FIX:
-- Tables created from Prisma DDL have no database-level default on "id".
-- Prisma normally generates uuids in its client layer, but this app uses the
-- Supabase REST API directly, so runtime INSERTs send no id -> NOT NULL violation.
-- This sets a DB-level default (gen_random_uuid()) on the id column of every
-- table that receives runtime inserts. Idempotent: safe to run multiple times.

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'Appointment', 'Token', 'Visit', 'PrescriptionDraft', 'Prescription',
    'Allergy', 'ActiveMedication', 'LabReport', 'Patient', 'Doctor',
    'Specialization', 'DoctorSchedule', 'Receptionist', 'Clinic', 'ClinicTheme'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = t AND column_name = 'id'
    ) THEN
      EXECUTE format('ALTER TABLE %I ALTER COLUMN "id" SET DEFAULT gen_random_uuid()', t);
    END IF;
  END LOOP;
END $$;
