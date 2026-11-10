-- AlterTable
ALTER TABLE "CharacterSheet" ADD COLUMN "sheetSystemId" TEXT;

-- CreateIndex
CREATE INDEX "CharacterSheet_sheetSystemId_idx" ON "CharacterSheet"("sheetSystemId");

-- AddForeignKey
ALTER TABLE "CharacterSheet" ADD CONSTRAINT "CharacterSheet_sheetSystemId_fkey" FOREIGN KEY ("sheetSystemId") REFERENCES "RPGSystem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
