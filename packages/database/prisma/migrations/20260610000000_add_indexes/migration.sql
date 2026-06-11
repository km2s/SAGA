-- Índices para acelerar as queries mais frequentes do Saga

-- CampaignMember: buscas por campanha e por usuário
CREATE INDEX IF NOT EXISTS "CampaignMember_campaignId_idx" ON "CampaignMember"("campaignId");
CREATE INDEX IF NOT EXISTS "CampaignMember_userId_idx"     ON "CampaignMember"("userId");

-- Session: busca por campanha + sessão ativa (query crítica da mesa)
CREATE INDEX IF NOT EXISTS "Session_campaignId_isActive_idx" ON "Session"("campaignId", "isActive");

-- RollLog: busca por sessão + data (polling do chat)
CREATE INDEX IF NOT EXISTS "RollLog_sessionId_rolledAt_idx" ON "RollLog"("sessionId", "rolledAt" DESC);

-- NPC: busca por campanha
CREATE INDEX IF NOT EXISTS "NPC_campaignId_idx" ON "NPC"("campaignId");

-- Note: busca por campanha + visibilidade
CREATE INDEX IF NOT EXISTS "Note_campaignId_visibility_idx" ON "Note"("campaignId", "visibility");
