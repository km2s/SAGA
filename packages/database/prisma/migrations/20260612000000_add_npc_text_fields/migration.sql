-- CreateTable
CREATE TABLE "NPCTextField" (
    "id" TEXT NOT NULL,
    "npcId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NPCTextField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NPCTextField_npcId_idx" ON "NPCTextField"("npcId");

-- CreateIndex
CREATE UNIQUE INDEX "NPCTextField_npcId_key_key" ON "NPCTextField"("npcId", "key");

-- AddForeignKey
ALTER TABLE "NPCTextField" ADD CONSTRAINT "NPCTextField_npcId_fkey" FOREIGN KEY ("npcId") REFERENCES "NPC"("id") ON DELETE CASCADE ON UPDATE CASCADE;
