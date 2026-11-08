-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "botEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "coverUrl" TEXT,
ADD COLUMN     "inviteCode" TEXT,
ADD COLUMN     "rollVisibility" TEXT NOT NULL DEFAULT 'escolha';

-- CreateTable
CREATE TABLE "Fio" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "sessao" TEXT,
    "feito" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessaoAgendada" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "horario" TEXT NOT NULL,
    "quando" TIMESTAMP(3) NOT NULL,
    "lembrete" BOOLEAN NOT NULL DEFAULT true,
    "lembradoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessaoAgendada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Fio_campaignId_idx" ON "Fio"("campaignId");

-- CreateIndex
CREATE INDEX "SessaoAgendada_campaignId_quando_idx" ON "SessaoAgendada"("campaignId", "quando");

-- CreateIndex
CREATE INDEX "SessaoAgendada_quando_idx" ON "SessaoAgendada"("quando");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_inviteCode_key" ON "Campaign"("inviteCode");

-- AddForeignKey
ALTER TABLE "Fio" ADD CONSTRAINT "Fio_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessaoAgendada" ADD CONSTRAINT "SessaoAgendada_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

