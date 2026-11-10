import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'

/** Membro da campanha da sessão atual (ou null). `gm` exige o papel de mestre. */
export async function membroAtual(campaignId: string, gm = false) {
  const session = await getServerSession(authOptions)
  if (!session) return { session: null, member: null }
  const member = await prisma.campaignMember.findFirst({
    where: { campaignId, user: { discordId: session.user.discordId }, ...(gm ? { role: 'GM' as const } : {}) },
    select: { id: true, role: true, userId: true },
  }).catch(() => null)
  return { session, member }
}
