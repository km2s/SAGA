-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('GM', 'PLAYER');

-- CreateEnum
CREATE TYPE "NoteVisibility" AS ENUM ('PRIVATE', 'CAMPAIGN', 'GM_ONLY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "theme" TEXT,
    "systemId" TEXT,
    "guildId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignMember" (
    "id" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,

    CONSTRAINT "CampaignMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RPGSystem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isPreset" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RPGSystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemAttribute" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultDie" TEXT NOT NULL,
    "description" TEXT,
    "systemId" TEXT NOT NULL,

    CONSTRAINT "SystemAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterSheet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "race" TEXT,
    "class" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "imageUrl" TEXT,
    "hp" INTEGER NOT NULL DEFAULT 0,
    "maxHp" INTEGER NOT NULL DEFAULT 0,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterAttribute" (
    "id" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "customDie" TEXT,
    "sheetId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,

    CONSTRAINT "CharacterAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NPC" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "type" TEXT NOT NULL DEFAULT 'neutro',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "campaignId" TEXT NOT NULL,
    "linkedMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NPC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NPCAttribute" (
    "id" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "customDie" TEXT,
    "npcId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,

    CONSTRAINT "NPCAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NPCVisibility" (
    "id" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT false,
    "npcId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "NPCVisibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "campaignId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RollLog" (
    "id" TEXT NOT NULL,
    "expression" TEXT NOT NULL,
    "rolls" JSONB NOT NULL,
    "modifier" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "attribute" TEXT,
    "rolledBy" TEXT NOT NULL,
    "rolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "RollLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionSummary" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "SessionSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "visibility" "NoteVisibility" NOT NULL DEFAULT 'PRIVATE',
    "authorId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignMember_userId_campaignId_key" ON "CampaignMember"("userId", "campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterSheet_memberId_key" ON "CharacterSheet"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterAttribute_sheetId_attributeId_key" ON "CharacterAttribute"("sheetId", "attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "NPCAttribute_npcId_attributeId_key" ON "NPCAttribute"("npcId", "attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "NPCVisibility_npcId_memberId_key" ON "NPCVisibility"("npcId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionSummary_sessionId_key" ON "SessionSummary"("sessionId");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "RPGSystem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMember" ADD CONSTRAINT "CampaignMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMember" ADD CONSTRAINT "CampaignMember_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemAttribute" ADD CONSTRAINT "SystemAttribute_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "RPGSystem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSheet" ADD CONSTRAINT "CharacterSheet_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "CampaignMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterAttribute" ADD CONSTRAINT "CharacterAttribute_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "CharacterSheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterAttribute" ADD CONSTRAINT "CharacterAttribute_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "SystemAttribute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NPC" ADD CONSTRAINT "NPC_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NPC" ADD CONSTRAINT "NPC_linkedMemberId_fkey" FOREIGN KEY ("linkedMemberId") REFERENCES "CampaignMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NPCAttribute" ADD CONSTRAINT "NPCAttribute_npcId_fkey" FOREIGN KEY ("npcId") REFERENCES "NPC"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NPCAttribute" ADD CONSTRAINT "NPCAttribute_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "SystemAttribute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NPCVisibility" ADD CONSTRAINT "NPCVisibility_npcId_fkey" FOREIGN KEY ("npcId") REFERENCES "NPC"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NPCVisibility" ADD CONSTRAINT "NPCVisibility_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "CampaignMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RollLog" ADD CONSTRAINT "RollLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSummary" ADD CONSTRAINT "SessionSummary_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
