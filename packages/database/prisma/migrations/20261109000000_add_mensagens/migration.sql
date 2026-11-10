-- CreateTable
CREATE TABLE "Mensagem" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT,
    "deId" TEXT NOT NULL,
    "paraId" TEXT,
    "texto" TEXT NOT NULL,
    "personagem" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mensagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leitura" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversa" TEXT NOT NULL,
    "lidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Leitura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Mensagem_campaignId_createdAt_idx" ON "Mensagem"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "Mensagem_deId_paraId_createdAt_idx" ON "Mensagem"("deId", "paraId", "createdAt");

-- CreateIndex
CREATE INDEX "Mensagem_paraId_createdAt_idx" ON "Mensagem"("paraId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Leitura_userId_conversa_key" ON "Leitura"("userId", "conversa");

-- AddForeignKey
ALTER TABLE "Mensagem" ADD CONSTRAINT "Mensagem_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensagem" ADD CONSTRAINT "Mensagem_deId_fkey" FOREIGN KEY ("deId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensagem" ADD CONSTRAINT "Mensagem_paraId_fkey" FOREIGN KEY ("paraId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leitura" ADD CONSTRAINT "Leitura_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

