import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { notFound, redirect } from 'next/navigation'
import { VirtualTable } from '@/components/mesa/VirtualTable'

export default async function VirtualTablePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const membership = await prisma.campaignMember.findFirst({
    where: {
      campaignId: params.id,
      user: { discordId: session.user.discordId },
    },
  }).catch(() => null)

  if (!membership) notFound()

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      system: { select: { name: true } },
    },
  }).catch(() => null)

  if (!campaign) notFound()

  const members = await prisma.campaignMember.findMany({
    where: { campaignId: params.id },
    include: {
      user: { select: { username: true } },
      character: {
        select: {
          id: true,
          name: true,
          race: true,
          class: true,
          level: true,
          hp: true,
          maxHp: true,
          attributes: {
            include: {
              attribute: { select: { name: true, defaultDie: true } },
            },
            orderBy: { attribute: { name: 'asc' } },
          },
        },
      },
    },
    orderBy: { role: 'asc' },
  }).catch(() => [])

  const activeSession = await prisma.session.findFirst({
    where: { campaignId: params.id, isActive: true },
    orderBy: { startedAt: 'desc' },
    select: { id: true, name: true, isActive: true, tokensJson: true, musicYoutubeId: true, musicVolume: true, mapImageUrl: true },
  }).catch(() => null)

  const initialRolls = activeSession
    ? await prisma.rollLog.findMany({
        where: { sessionId: activeSession.id },
        orderBy: { rolledAt: 'desc' },
        take: 30,
      }).catch(() => [])
    : []

  const isGM = membership.role === 'GM'

  const npcs = isGM
    ? await prisma.nPC.findMany({
        where: { campaignId: params.id },
        select: {
          id: true,
          name: true,
          type: true,
          race: true,
          class: true,
          level: true,
          hp: true,
          maxHp: true,
          attributes: {
            include: { attribute: { select: { name: true, defaultDie: true } } },
            orderBy: { attribute: { name: 'asc' } },
          },
        },
        orderBy: { name: 'asc' },
      }).catch(() => [])
    : []

  const serializedNpcs = npcs.map(n => ({
    id: n.id,
    name: n.name,
    type: n.type,
    race: n.race,
    class: n.class,
    level: n.level,
    hp: n.hp,
    maxHp: n.maxHp,
    attributes: n.attributes.map(a => ({
      id: a.id,
      value: a.value,
      name: a.attribute.name,
      defaultDie: a.attribute.defaultDie,
    })),
  }))

  const serializedRolls = initialRolls.map(r => ({
    id: r.id,
    expression: r.expression,
    rolls: r.rolls as number[],
    modifier: r.modifier,
    total: r.total,
    attribute: r.attribute,
    rolledBy: r.rolledBy,
    rolledAt: r.rolledAt.toISOString(),
  }))

  const serializedMembers = members.map(m => ({
    id: m.id,
    role: m.role as string,
    user: { username: m.user.username },
    character: m.character
      ? {
          id: m.character.id,
          name: m.character.name,
          race: m.character.race,
          class: m.character.class,
          level: m.character.level,
          hp: m.character.hp,
          maxHp: m.character.maxHp,
          attributes: m.character.attributes.map(a => ({
            id: a.id,
            value: a.value,
            name: a.attribute.name,
            defaultDie: a.attribute.defaultDie,
          })),
        }
      : null,
  }))

  return (
    <VirtualTable
      campaign={{ id: campaign.id, name: campaign.name }}
      activeSession={activeSession}
      members={serializedMembers}
      npcs={serializedNpcs}
      initialRolls={serializedRolls}
      isGM={isGM}
      currentMemberId={membership.id}
      systemName={campaign.system?.name ?? null}
    />
  )
}
