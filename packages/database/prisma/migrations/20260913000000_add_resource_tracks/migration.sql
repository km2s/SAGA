-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN "resourceTracksJson" TEXT;

-- AlterTable
ALTER TABLE "CharacterSheet" ADD COLUMN "resourcesJson" TEXT;

-- AlterTable
ALTER TABLE "NPC" ADD COLUMN "resourcesJson" TEXT;
