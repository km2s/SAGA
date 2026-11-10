-- Add liveMembersJson column to Session for GM live-sync permission control
ALTER TABLE "Session" ADD COLUMN "liveMembersJson" TEXT;
