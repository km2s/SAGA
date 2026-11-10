-- AlterTable
ALTER TABLE "User" ADD COLUMN     "recuperacaoJson" TEXT,
ADD COLUMN     "totpAtivoEm" TIMESTAMP(3),
ADD COLUMN     "totpSecret" TEXT;

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "recado" TEXT,
ADD COLUMN     "recadoEm" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RPGSystem" ADD COLUMN     "configJson" TEXT,
ADD COLUMN     "dadoBase" TEXT,
ADD COLUMN     "mecanica" TEXT,
ADD COLUMN     "recursosJson" TEXT;

-- AlterTable
ALTER TABLE "SystemAttribute" ADD COLUMN     "base" TEXT,
ADD COLUMN     "maximo" INTEGER,
ADD COLUMN     "minimo" INTEGER,
ADD COLUMN     "sigla" TEXT,
ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT 'atributo';

-- AlterTable
ALTER TABLE "CharacterSheet" ADD COLUMN     "inventarioJson" TEXT,
ADD COLUMN     "moedasJson" TEXT,
ADD COLUMN     "xp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "xpHistoricoJson" TEXT;

-- AlterTable
ALTER TABLE "Mensagem" ADD COLUMN     "abertoEm" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Dispositivo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "local" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vistoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encerradoEm" TIMESTAMP(3),

    CONSTRAINT "Dispositivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Digitando" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversa" TEXT NOT NULL,
    "em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Digitando_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Dispositivo_userId_encerradoEm_idx" ON "Dispositivo"("userId", "encerradoEm");

-- CreateIndex
CREATE INDEX "Digitando_conversa_em_idx" ON "Digitando"("conversa", "em");

-- CreateIndex
CREATE UNIQUE INDEX "Digitando_userId_conversa_key" ON "Digitando"("userId", "conversa");

-- AddForeignKey
ALTER TABLE "Dispositivo" ADD CONSTRAINT "Dispositivo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

