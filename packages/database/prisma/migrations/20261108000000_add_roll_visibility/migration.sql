-- Rolagens privadas (redesign: SAGA Mesa e SAGA Sessao).
-- Só acrescenta: rolagens existentes e as que o bot grava hoje ficam PUBLIC.

-- CreateEnum
CREATE TYPE "RollVisibility" AS ENUM ('PUBLIC', 'SELF', 'GM', 'BLIND', 'GM_SECRET');

-- AlterTable
ALTER TABLE "RollLog" ADD COLUMN "visibility" "RollVisibility" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN "revealedAt" TIMESTAMP(3),
ADD COLUMN "memberId" TEXT;

-- CreateIndex
CREATE INDEX "RollLog_memberId_idx" ON "RollLog"("memberId");
