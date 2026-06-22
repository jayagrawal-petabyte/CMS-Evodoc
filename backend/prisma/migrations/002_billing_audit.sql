-- Invoice table for billing & invoicing
CREATE TABLE IF NOT EXISTS "Invoice" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "clinicId"       TEXT NOT NULL,
  "patientId"      TEXT,
  "visitId"        TEXT,
  "invoiceNumber"  TEXT NOT NULL,
  "items"          JSONB NOT NULL DEFAULT '[]',
  "subtotal"       NUMERIC(10,2) NOT NULL DEFAULT 0,
  "discount"       NUMERIC(5,2) NOT NULL DEFAULT 0,
  "discountAmount" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "total"          NUMERIC(10,2) NOT NULL DEFAULT 0,
  "status"         TEXT NOT NULL DEFAULT 'Unpaid', -- Unpaid, Paid, Cancelled
  "paymentMethod"  TEXT,
  "paidAt"         TIMESTAMPTZ,
  "notes"          TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "Invoice_clinicId_idx" ON "Invoice"("clinicId");
CREATE INDEX IF NOT EXISTS "Invoice_patientId_idx" ON "Invoice"("patientId");
CREATE INDEX IF NOT EXISTS "Invoice_status_idx" ON "Invoice"("status");

-- AuditLog table for tracking all actions
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "clinicId"     TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "userRole"     TEXT NOT NULL,
  "userFullName" TEXT NOT NULL,
  "action"       TEXT NOT NULL,
  "entityType"   TEXT NOT NULL,
  "entityId"     TEXT,
  "metadata"     JSONB NOT NULL DEFAULT '{}',
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "AuditLog_clinicId_idx" ON "AuditLog"("clinicId");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt" DESC);
