-- CreateTable Handout e HandoutView para sistema de revelação de conteúdo aos jogadores

CREATE TABLE "Handout" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "imageUrl" TEXT,
    "campaignId" TEXT NOT NULL,
    "sharedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Handout_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HandoutView" (
    "id" TEXT NOT NULL,
    "handoutId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HandoutView_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Handout_campaignId_idx" ON "Handout"("campaignId");

CREATE UNIQUE INDEX "HandoutView_handoutId_memberId_key" ON "HandoutView"("handoutId", "memberId");

ALTER TABLE "Handout" ADD CONSTRAINT "Handout_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Handout" ADD CONSTRAINT "Handout_sharedById_fkey" FOREIGN KEY ("sharedById") REFERENCES "CampaignMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HandoutView" ADD CONSTRAINT "HandoutView_handoutId_fkey" FOREIGN KEY ("handoutId") REFERENCES "Handout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HandoutView" ADD CONSTRAINT "HandoutView_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "CampaignMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
