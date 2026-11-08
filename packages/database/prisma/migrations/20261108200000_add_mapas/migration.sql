-- Mapas configuráveis da campanha (SAGA Mapas). Só acrescenta.
-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "mapaNaMesaId" TEXT;

-- CreateTable
CREATE TABLE "Mapa" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "colunas" INTEGER NOT NULL DEFAULT 30,
    "linhas" INTEGER NOT NULL DEFAULT 20,
    "escala" INTEGER NOT NULL DEFAULT 0,
    "arte" INTEGER NOT NULL DEFAULT 0,
    "imagemUrl" TEXT,
    "tokensJson" TEXT,
    "nevoaJson" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mapa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Mapa_campaignId_idx" ON "Mapa"("campaignId");

-- AddForeignKey
ALTER TABLE "Mapa" ADD CONSTRAINT "Mapa_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

