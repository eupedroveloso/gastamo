-- AlterTable (IF NOT EXISTS: compatível com BD já sincronizada via `db push` ou migração parcial)
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "billingYm" TEXT NOT NULL DEFAULT '2000-01';

CREATE INDEX IF NOT EXISTS "Expense_familyId_billingYm_idx" ON "Expense"("familyId", "billingYm");
