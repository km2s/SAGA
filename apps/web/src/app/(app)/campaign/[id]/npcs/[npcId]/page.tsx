import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { NPCHPEditor } from '@/components/gm/NPCHPEditor'
import { NPCInfoEditor } from '@/components/gm/NPCInfoEditor'
import { CharacterSheetView, type SheetCategory } from '@/components/character/CharacterSheetView'
import { safeImageUrl } from '@/lib/safe-url'
import { coverFor } from '@/lib/campaign-cover'
import {
  ShieldAlert, UserCheck, Heart, Wind, User,
  ChevronLeft, ClipboardList, Pencil,
} from 'lucide-react'

const NPC_TYPE_LABELS: Record<string, string> = {
  VILLAIN: 'Vilão', ALLY: 'Aliado', MERCHANT: 'Mercador',
  FAMILIAR: 'Familiar', MOUNT: 'Montaria', SERVANT: 'Servo',
  NEUTRAL: 'Neutro', OTHER: 'Outro',
}
const NPC_TYPE_ICONS: Record<string, React.ElementType> = {
  VILLAIN: ShieldAlert, ALLY: UserCheck, FAMILIAR: Heart, MOUNT: Wind,
}
const NPC_TYPE_BADGE: Record<string, 'gold' | 'success' | 'purple' | 'muted'> = {
  VILLAIN: 'gold', ALLY: 'success', MERCHANT: 'purple',
  FAMILIAR: 'purple', MOUNT: 'muted', SERVANT: 'muted', NEUTRAL: 'muted', OTHER: 'muted',
}

const SYSTEM_CATEGORIES: Record<string, SheetCategory> = {
  'D&D 5e': 'fantasy', 'D&D 3.5e': 'fantasy', 'Pathfinder 2e': 'fantasy',
  'Pathfinder 1e': 'fantasy', 'Tormenta20': 'fantasy', 'Old Dragon 2': 'fantasy',
  'Dungeon World': 'fantasy', '13th Age': 'fantasy',
  'Vampire: The Masquerade V5': 'world-of-darkness',
  'Vampire: The Masquerade V20': 'world-of-darkness',
  'Vampire: The Masquerade': 'world-of-darkness',
  'Werewolf: The Apocalypse': 'world-of-darkness',
  'Mage: The Ascension': 'world-of-darkness',
  'Mage: The Awakening': 'world-of-darkness',
  'Hunter: The Reckoning': 'world-of-darkness',
  'Changeling: The Lost': 'world-of-darkness',
  'Demon: The Descent': 'world-of-darkness',
  'Geist: The Sin-Eaters': 'world-of-darkness',
  'Call of Cthulhu 7e': 'horror', 'Delta Green': 'horror', 'Mothership': 'horror',
  'Cyberpunk Red': 'scifi', 'Starfinder': 'scifi', 'Shadowrun 6e': 'scifi',
  'Star Wars: Edge of the Empire': 'scifi',
  'GURPS 4e': 'generic', 'Fate Core': 'generic', 'Savage Worlds': 'generic',
  'Blades in the Dark': 'generic', 'Ironsworn': 'generic',
}

function detectCategory(name: string | null | undefined): SheetCategory {
  if (!name) return 'custom'
  const exact = SYSTEM_CATEGORIES[name]
  if (exact) return exact
  const n = name.toLowerCase()
  if (n.includes('vampire') || n.includes('werewolf') || n.includes('mage') ||
      n.includes('hunter') || n.includes('changeling') || n.includes('demon') ||
      n.includes('geist') || n.includes('masquerade') || n.includes('darkness'))
    return 'world-of-darkness'
  if (n.includes('cthulhu') || n.includes('horror') || n.includes('mothership') || n.includes('delta green'))
    return 'horror'
  if (n.includes('cyberpunk') || n.includes('starfinder') || n.includes('shadowrun') || n.includes('star wars'))
    return 'scifi'
  if (n.includes('d&d') || n.includes('pathfinder') || n.includes('tormenta') || n.includes('dungeon'))
    return 'fantasy'
  return 'custom'
}

const SYSTEM_COLOR: Record<string, string> = {
  fantasy:             'text-[#c9a22a]',
  'world-of-darkness': 'text-[#9d5af5]',
  horror:              'text-[#5a9e8f]',
  scifi:               'text-[#5b8dd9]',
  generic:             'text-ink-soft',
  custom:              'text-ink-soft',
}

export default async function NPCDetailPage({ params }: { params: { id: string; npcId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const member = await prisma.campaignMember.findFirst({
    where: { campaignId: params.id, user: { discordId: session.user.discordId } },
  }).catch(() => null)
  if (!member) notFound()

  const isGM = member.role === 'GM'

  let npc = await prisma.nPC.findFirst({
    where: { id: params.npcId, campaignId: params.id },
    include: {
      campaign: {
        include: {
          system: { include: { attributes: true } },
          members: { include: { user: true } },
        },
      },
      attributes: {
        include: { attribute: true },
        orderBy: { attribute: { name: 'asc' } },
      },
      textFields: { orderBy: { order: 'asc' } },
      linkedMember: { include: { user: true } },
      visibilities: true,
    },
  }).catch(() => null)

  if (!npc) notFound()

  const canView = isGM || npc.isPublic ||
    npc.visibilities.some(v => v.memberId === member.id && v.canView)
  if (!canView) notFound()

  // Seed any system attributes that this NPC is missing (handles new attrs added after NPC creation)
  const systemAttrs = npc.campaign.system?.attributes ?? []
  if (systemAttrs.length > 0) {
    const existingAttrIds = new Set(npc.attributes.map(a => a.attributeId))
    const missingAttrs = systemAttrs.filter(a => !existingAttrIds.has(a.id))
    if (missingAttrs.length > 0) {
      function attrDefault(description: string | null): number {
        const d = description?.trim() ?? ''
        if (d.startsWith('Talento') || d.startsWith('Perícia') || d.startsWith('Conhecimento') ||
            d.startsWith('Habilidade') || d.startsWith('Disciplina') || d.startsWith('Antecedente')) return 0
        if (d.startsWith('Virtude')) return 1
        return 1
      }
      await prisma.nPCAttribute.createMany({
        data: missingAttrs.map(a => ({
          npcId: npc!.id,
          attributeId: a.id,
          value: attrDefault(a.description ?? null),
        })),
        skipDuplicates: true,
      }).catch(() => null)
      // Re-fetch with the newly seeded attributes
      npc = await prisma.nPC.findFirst({
        where: { id: params.npcId, campaignId: params.id },
        include: {
          campaign: {
            include: {
              system: { include: { attributes: true } },
              members: { include: { user: true } },
            },
          },
          attributes: {
            include: { attribute: true },
            orderBy: { attribute: { name: 'asc' } },
          },
          textFields: { orderBy: { order: 'asc' } },
          linkedMember: { include: { user: true } },
          visibilities: true,
        },
      }).catch(() => null)
      if (!npc) notFound()
    }
  }

  const players = npc.campaign.members.filter(m => m.role === 'PLAYER')
  const TypeIcon = NPC_TYPE_ICONS[npc.type] ?? User
  const system = npc.campaign.system
  // Sistemas personalizados (não-preset) respeitam a categoria escolhida pelo
  // usuário; presets seguem a detecção por nome. Evita que um sistema custom
  // caia em "fantasy" e aplique o modificador (valor-10)/2 indevidamente.
  const VALID_CATEGORIES: SheetCategory[] = ['fantasy', 'world-of-darkness', 'horror', 'scifi', 'generic', 'custom']
  const category: SheetCategory =
    system && !system.isPreset && system.category && (VALID_CATEGORIES as string[]).includes(system.category)
      ? (system.category as SheetCategory)
      : detectCategory(system?.name)
  const SystemIcon = system?.isPreset ? ClipboardList : Pencil
  const systemColor = SYSTEM_COLOR[category] ?? 'text-ink-soft'

  const sheetAttributes = npc.attributes.map(a => ({
    id: a.id,
    value: a.value,
    customDie: a.customDie,
    attribute: {
      name: a.attribute.name,
      defaultDie: a.attribute.defaultDie,
      description: a.attribute.description ?? null,
    },
  }))

  const systemCard = system && (
    <div className="bg-card border border-ink/20 rounded-lg p-4">
      <p className="font-almendra text-[9px] font-bold text-ink-soft uppercase tracking-widest mb-2">Sistema</p>
      <div className="flex items-center gap-2">
        <SystemIcon size={16} className="text-ink-soft shrink-0" />
        <div>
          <p className={`text-sm font-medium ${systemColor}`}>{system.name}</p>
          <p className="text-[10px] text-ink-soft">
            {system.isPreset ? 'Ficha pré-definida' : 'Ficha personalizada'}
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-4 sm:p-8 sm:pt-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link href={`/campaign/${params.id}/npcs`}
          className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-gold transition-colors">
          <ChevronLeft size={15}/>
          NPCs de {npc.campaign.name}
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-cinzel text-2xl font-bold">Ficha do NPC</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-ink-soft">{npc.campaign.name}</p>
            {system && (
              <>
                <span className="text-ink-soft">·</span>
                <span className={`flex items-center gap-1 text-sm font-medium ${systemColor}`}>
                  <SystemIcon size={13} />
                  {system.name}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={NPC_TYPE_BADGE[npc.type] ?? 'muted'}>{NPC_TYPE_LABELS[npc.type] ?? npc.type}</Badge>
          <Badge variant={npc.isPublic ? 'success' : 'muted'}>{npc.isPublic ? 'Visível aos jogadores' : 'Restrito ao Mestre'}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[230px_1fr] gap-5">
        {/* LEFT column */}
        <div className="space-y-4">
          {isGM ? (
            <>
              <NPCInfoEditor
                campaignId={params.id}
                npc={{
                  id: npc.id,
                  name: npc.name,
                  race: npc.race ?? null,
                  class: npc.class ?? null,
                  level: npc.level,
                  description: npc.description ?? null,
                  imageUrl: npc.imageUrl ?? null,
                  type: npc.type,
                  isPublic: npc.isPublic,
                  linkedMemberId: npc.linkedMemberId ?? null,
                  hp: npc.hp,
                  maxHp: npc.maxHp,
                }}
                players={players}
              />
              {systemCard}
            </>
          ) : (
            <>
              {/* Portrait (read-only for players) */}
              <div className="bg-card border border-ink/20 rounded-lg overflow-hidden">
                {safeImageUrl(npc.imageUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={safeImageUrl(npc.imageUrl)!} alt={npc.name} className="w-full h-52 object-cover object-top" />
                ) : (
                  <div className={`w-full h-52 bg-gradient-to-br ${coverFor(1)} flex items-center justify-center`}>
                    <TypeIcon size={72} className="text-white/30" />
                  </div>
                )}
                <div className="p-4">
                  <h2 className="font-cinzel-deco text-base font-bold text-center leading-snug">{npc.name}</h2>
                  {npc.race && (
                    <div className="flex justify-between text-[12px] mt-2">
                      <span className="text-ink-soft">Raça</span>
                      <span className="font-fell">{npc.race}</span>
                    </div>
                  )}
                  {npc.class && (
                    <div className="flex justify-between text-[12px] mt-1">
                      <span className="text-ink-soft">Classe</span>
                      <span className="font-fell">{npc.class}</span>
                    </div>
                  )}
                  <div className="flex justify-center mt-3">
                    <Badge variant="gold">Nível {npc.level}</Badge>
                  </div>
                  {npc.linkedMember && (
                    <p className="text-[11px] text-ink-soft mt-3 text-center border-t border-ink/20 pt-2">
                      Ligado a <span className="text-ink">{npc.linkedMember.user.username}</span>
                    </p>
                  )}
                </div>
              </div>

              <NPCHPEditor
                campaignId={params.id}
                npcId={npc.id}
                hp={npc.hp}
                maxHp={npc.maxHp}
              />

              <div className="bg-card border border-ink/20 rounded-lg p-3 text-center">
                <p className="font-cinzel text-base font-bold">{NPC_TYPE_LABELS[npc.type] ?? npc.type}</p>
                <p className="font-almendra text-[9px] text-ink-soft mt-0.5 uppercase tracking-widest">Tipo de NPC</p>
              </div>

              {systemCard}

              {npc.description && (
                <div className="bg-card border border-ink/20 rounded-lg p-4">
                  <p className="font-almendra text-[9px] font-bold text-ink-soft uppercase tracking-widest mb-2">Descrição</p>
                  <p className="text-sm text-ink-soft leading-relaxed">{npc.description}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT column */}
        <div className="space-y-4">
          <CharacterSheetView
            characterId={npc.id}
            characterLevel={npc.level}
            attributes={sheetAttributes}
            textFields={npc.textFields}
            weapons={[]}
            spellSlots={[]}
            canEdit={isGM}
            canEditWeapons={false}
            category={category}
            systemName={system?.name ?? null}
          />

        </div>
      </div>
    </div>
  )
}
