-- Enable Row Level Security on tables that were left unrestricted.
-- Prisma connects via the postgres/service_role which bypasses RLS automatically,
-- so the app continues to work. Direct REST API access via anon key is blocked.

ALTER TABLE "CharacterSpellSlot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CharacterTextField"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CharacterWeapon"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Handout"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HandoutView"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NPCTextField"        ENABLE ROW LEVEL SECURITY;
