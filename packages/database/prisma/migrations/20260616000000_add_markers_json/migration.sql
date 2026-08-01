-- Add markersJson column to Session for shared ping/marker sync
ALTER TABLE "Session" ADD COLUMN "markersJson" TEXT;
