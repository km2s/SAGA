-- AlterTable
ALTER TABLE "NPC" ADD COLUMN "sheetSystemId" TEXT;

-- CreateIndex
CREATE INDEX "NPC_sheetSystemId_idx" ON "NPC"("sheetSystemId");

-- AddForeignKey
ALTER TABLE "NPC" ADD CONSTRAINT "NPC_sheetSystemId_fkey" FOREIGN KEY ("sheetSystemId") REFERENCES "RPGSystem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
