-- Add open campaigns fields to Campaign
ALTER TABLE "Campaign" ADD COLUMN "campaignType" TEXT NOT NULL DEFAULT 'campaign';
ALTER TABLE "Campaign" ADD COLUMN "isOpen" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Campaign" ADD COLUMN "maxSlots" INTEGER;

-- Create CampaignApplication table
CREATE TABLE "CampaignApplication" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterDesc" TEXT NOT NULL DEFAULT '',
    "experienceLevel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignApplication_campaignId_userId_key" ON "CampaignApplication"("campaignId", "userId");
CREATE INDEX "CampaignApplication_campaignId_idx" ON "CampaignApplication"("campaignId");

ALTER TABLE "CampaignApplication" ADD CONSTRAINT "CampaignApplication_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CampaignApplication" ADD CONSTRAINT "CampaignApplication_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
