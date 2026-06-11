-- CharacterTextField: campos narrativos de texto livre
CREATE TABLE "CharacterTextField" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CharacterTextField_pkey" PRIMARY KEY ("id")
);

-- CharacterWeapon: tracker de armas/ataques
CREATE TABLE "CharacterWeapon" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "attackBonus" TEXT,
    "damage" TEXT,
    "damageType" TEXT,
    "range" TEXT,
    "properties" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CharacterWeapon_pkey" PRIMARY KEY ("id")
);

-- CharacterSpellSlot: slots de magia por nível (0=truques, 1-9)
CREATE TABLE "CharacterSpellSlot" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "used" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CharacterSpellSlot_pkey" PRIMARY KEY ("id")
);

-- Índices
CREATE UNIQUE INDEX "CharacterTextField_sheetId_key_key" ON "CharacterTextField"("sheetId", "key");
CREATE INDEX "CharacterTextField_sheetId_idx" ON "CharacterTextField"("sheetId");

CREATE INDEX "CharacterWeapon_sheetId_idx" ON "CharacterWeapon"("sheetId");

CREATE UNIQUE INDEX "CharacterSpellSlot_sheetId_level_key" ON "CharacterSpellSlot"("sheetId", "level");
CREATE INDEX "CharacterSpellSlot_sheetId_idx" ON "CharacterSpellSlot"("sheetId");

-- Foreign keys com CASCADE delete
ALTER TABLE "CharacterTextField" ADD CONSTRAINT "CharacterTextField_sheetId_fkey"
    FOREIGN KEY ("sheetId") REFERENCES "CharacterSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CharacterWeapon" ADD CONSTRAINT "CharacterWeapon_sheetId_fkey"
    FOREIGN KEY ("sheetId") REFERENCES "CharacterSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CharacterSpellSlot" ADD CONSTRAINT "CharacterSpellSlot_sheetId_fkey"
    FOREIGN KEY ("sheetId") REFERENCES "CharacterSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
