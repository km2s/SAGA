-- AlterTable
ALTER TABLE "RPGSystem" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'custom',
ADD COLUMN     "creatorId" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "imageUrl" TEXT;

-- AddForeignKey
ALTER TABLE "RPGSystem" ADD CONSTRAINT "RPGSystem_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
