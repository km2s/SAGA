-- CreateTable
CREATE TABLE "NPCWeapon" (
    "id" TEXT NOT NULL,
    "npcId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "attackBonus" TEXT,
    "damage" TEXT,
    "damageType" TEXT,
    "range" TEXT,
    "properties" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NPCWeapon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NPCSpellSlot" (
    "id" TEXT NOT NULL,
    "npcId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "used" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NPCSpellSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NPCWeapon_npcId_idx" ON "NPCWeapon"("npcId");

-- CreateIndex
CREATE UNIQUE INDEX "NPCSpellSlot_npcId_level_key" ON "NPCSpellSlot"("npcId", "level");

-- CreateIndex
CREATE INDEX "NPCSpellSlot_npcId_idx" ON "NPCSpellSlot"("npcId");

-- AddForeignKey
ALTER TABLE "NPCWeapon" ADD CONSTRAINT "NPCWeapon_npcId_fkey" FOREIGN KEY ("npcId") REFERENCES "NPC"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NPCSpellSlot" ADD CONSTRAINT "NPCSpellSlot_npcId_fkey" FOREIGN KEY ("npcId") REFERENCES "NPC"("id") ON DELETE CASCADE ON UPDATE CASCADE;
