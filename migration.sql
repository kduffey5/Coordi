-- Migration: Rename Call to Conversation and update schema
-- This migration renames the Call table to Conversation and adds new fields

-- Step 1: Rename Call table to Conversation
ALTER TABLE "Call" RENAME TO "Conversation";

-- Step 2: Add new columns to Conversation
ALTER TABLE "Conversation" 
  ADD COLUMN IF NOT EXISTS "isLead" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- Step 3: Update any existing rows to have appropriate status
-- If there's an outcome column, migrate it to status
UPDATE "Conversation" SET "status" = CASE 
  WHEN "outcome" = 'lead_captured' THEN 'new'
  WHEN "outcome" = 'missed' THEN 'missed'
  WHEN "outcome" = 'transferred' THEN 'escalated'
  ELSE 'new'
END WHERE "outcome" IS NOT NULL;

-- Step 4: Mark conversations with leads as isLead = true
UPDATE "Conversation" SET "isLead" = true 
WHERE "id" IN (SELECT "callId" FROM "Lead" WHERE "callId" IS NOT NULL);

-- Step 5: Drop the outcome column if it exists (no longer needed)
ALTER TABLE "Conversation" DROP COLUMN IF EXISTS "outcome";

-- Step 6: Update Lead table to use conversationId instead of callId
ALTER TABLE "Lead" RENAME COLUMN "callId" TO "conversationId";

-- Step 7: Create indexes on new columns
CREATE INDEX IF NOT EXISTS "Conversation_isLead_idx" ON "Conversation"("isLead");
CREATE INDEX IF NOT EXISTS "Conversation_status_idx" ON "Conversation"("status");

-- Step 8: Update foreign key constraint name if needed
-- (PostgreSQL will handle this automatically, but we ensure it exists)
-- The foreign key should already work since we just renamed the column
