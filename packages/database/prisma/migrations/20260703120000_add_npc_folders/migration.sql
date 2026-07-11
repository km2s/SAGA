-- CreateTable
CREATE TABLE "NpcFolder" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NpcFolder_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "NPC" ADD COLUMN "folderId" TEXT;

-- CreateIndex
CREATE INDEX "NpcFolder_campaignId_idx" ON "NpcFolder"("campaignId");

-- CreateIndex
CREATE INDEX "NPC_folderId_idx" ON "NPC"("folderId");

-- AddForeignKey
ALTER TABLE "NpcFolder" ADD CONSTRAINT "NpcFolder_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NPC" ADD CONSTRAINT "NPC_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "NpcFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enable RLS (Prisma usa service_role que bypassa RLS; bloqueia REST anônimo)
ALTER TABLE "NpcFolder" ENABLE ROW LEVEL SECURITY;
