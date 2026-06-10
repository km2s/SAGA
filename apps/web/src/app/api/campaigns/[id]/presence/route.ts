import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'

// In-memory presence store: `${campaignId}:${memberId}` → lastSeen timestamp
const presenceStore = new Map<string, number>()
const ONLINE_THRESHOLD_MS = 45_000

function cleanStale() {
  const cutoff = Date.now() - ONLINE_THRESHOLD_MS
  for (const [key, ts] of presenceStore) {
    if (ts < cutoff) presenceStore.delete(key)
  }
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await prisma.campaignMember.findFirst({
    where: { campaignId: params.id, user: { discordId: session.user.discordId } },
    select: { id: true },
  }).catch(() => null)

  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  presenceStore.set(`${params.id}:${member.id}`, Date.now())
  return NextResponse.json({ ok: true })
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  cleanStale()
  const prefix = `${params.id}:`
  const onlineIds = [...presenceStore.keys()]
    .filter(k => k.startsWith(prefix))
    .map(k => k.slice(prefix.length))

  return NextResponse.json({ onlineIds })
}
