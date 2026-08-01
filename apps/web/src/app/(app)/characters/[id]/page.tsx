import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { notFound, redirect } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { HPEditor } from '@/components/character/HPEditor'
import { CharacterShareToggle } from '@/components/character/CharacterShareToggle'
import { CharacterSheetView, type SheetCategory } from '@/components/character/CharacterSheetView'
import { DeleteCharacterButton } from '@/components/character/DeleteCharacterButton'
import { CharacterPortrait } from '@/components/character/CharacterPortrait'
import { ClipboardList, Pencil } from 'lucide-react'

const SYSTEM_CATEGORIES: Record<string, SheetCategory> = {
  // Fantasy
  'D&D 5e': 'fantasy', 'D&D 3.5e': 'fantasy', 'Pathfinder 2e': 'fantasy',
  'Pathfinder 1e': 'fantasy', 'Tormenta20': 'fantasy', 'Old Dragon 2': 'fantasy',
  'Dungeon World': 'fantasy', '13th Age': 'fantasy',
  // World of Darkness
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
  // Horror
  'Call of Cthulhu 7e': 'horror', 'Delta Green': 'horror', 'Mothership': 'horror',
  // Sci-Fi
  'Cyberpunk Red': 'scifi', 'Starfinder': 'scifi', 'Shadowrun 6e': 'scifi',
  'Star Wars: Edge of the Empire': 'scifi',
  // Generic
  'GURPS 4e': 'generic', 'Fate Core': 'generic', 'Savage Worlds': 'generic',
  'Blades in the Dark': 'generic', 'Ironsworn': 'generic',
  // Custom
  'Personalizado': 'custom',
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
  fantasy:            'text-[#c9a22a]',
  'world-of-darkness':'text-[#9d5af5]',
  horror:             'text-[#5a9e8f]',
  scifi:              'text-[#5b8dd9]',
  generic:            'text-ink-soft',
  custom:             'text-ink-soft',
}

function profBonus(level: number) {
  return `+${Math.ceil(level / 4) + 1}`
}

export default async function CharacterDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const member = await prisma.campaignMember.findUnique({
    where: { id: params.id },
    include: {
      user: true,
      campaign: { include: { system: true } },
      // Ficha com template próprio renderiza como o sistema-modelo
      // (ex.: personagem "só V20" numa campanha homebrew).
      character: {
        include: {
          sheetSystem: true,
          attributes: {
            include: { attribute: true },
            orderBy: { attribute: { name: 'asc' } },
          },
          textFields: { orderBy: { order: 'asc' } },
          weapons:    { orderBy: { order: 'asc' } },
          spellSlots: { orderBy: { level: 'asc' } },
        },
      },
    },
  }).catch(() => null)

  if (!member || !member.character) notFound()

  const isMine = member.user.discordId === session.user.discordId
  const gmMembership = await prisma.campaignMember.findFirst({
    where: { campaignId: member.campaignId, user: { discordId: session.user.discordId }, role: 'GM' },
  }).catch(() => null)

  if (!isMine && !gmMembership) notFound()

  const canEdit = isMine || !!gmMembership
  const char = member.character
  const campaign = member.campaign
  const system = campaign.system
  // A ficha renderiza pelo template escolhido na criação, quando houver.
  const sheetSource = char.sheetSystem ?? system

  // Sistemas personalizados (não-preset) respeitam a categoria escolhida pelo
  // usuário na criação; presets continuam pela detecção por nome (precisa).
  // Sem isso, um sistema custom com nome parecido com D&D caía em "fantasy" e
  // aplicava o modificador (valor-10)/2 (ex.: valor 5 virava -3 em vez de 5).
  const VALID_CATEGORIES: SheetCategory[] = ['fantasy', 'world-of-darkness', 'horror', 'scifi', 'generic', 'custom']
  const category: SheetCategory =
    sheetSource && !sheetSource.isPreset && sheetSource.category && (VALID_CATEGORIES as string[]).includes(sheetSource.category)
      ? (sheetSource.category as SheetCategory)
      : detectCategory(sheetSource?.name)
  const SystemIcon = system?.isPreset ? ClipboardList : Pencil
  const systemColor = SYSTEM_COLOR[category] ?? 'text-ink-soft'

  // Compute quick stats for fantasy systems
  const dexAttr = char.attributes.find(a => a.attribute.name === 'Destreza')
  const dexMod = dexAttr ? Math.floor((dexAttr.value - 10) / 2) : null
  const iniciativa = dexMod !== null ? (dexMod >= 0 ? `+${dexMod}` : `${dexMod}`) : null

  const quickStats =
    category === 'fantasy'
      ? [
          { label: 'Iniciativa', value: iniciativa ?? '—' },
          { label: 'Proficiência', value: profBonus(char.level) },
        ]
      : []

  return (
    <div className="p-4 sm:p-8 sm:pt-6">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-cinzel text-2xl font-bold">Ficha de Personagem</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-ink-soft">{campaign.name}</p>
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
        {canEdit && (
          <DeleteCharacterButton characterId={char.id} characterName={char.name} />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[230px_1fr] gap-5">
        {/* LEFT — portrait + stats */}
        <div className="space-y-4">
          {/* Portrait card */}
          <div className="bg-card border border-ink/20 rounded-lg overflow-hidden">
            <CharacterPortrait
              characterId={char.id}
              imageUrl={char.imageUrl}
              name={char.name}
              charClass={char.class}
              canEdit={canEdit}
            />
            <div className="p-4">
              <h2 className="font-cinzel-deco text-base font-bold text-center leading-snug">{char.name}</h2>
              {char.race && (
                <div className="flex justify-between text-[12px] mt-2">
                  <span className="text-ink-soft">Raça</span>
                  <span className="font-fell">{char.race}</span>
                </div>
              )}
              {char.class && (
                <div className="flex justify-between text-[12px] mt-1">
                  <span className="text-ink-soft">Classe</span>
                  <span className="font-fell">{char.class}</span>
                </div>
              )}
              <div className="flex justify-center mt-3">
                <Badge variant="gold">Nível {char.level}</Badge>
              </div>
            </div>
          </div>

          {/* HP */}
          <HPEditor characterId={char.id} hp={char.hp} maxHp={char.maxHp} canEdit={canEdit} />

          {/* Share */}
          {isMine && (
            <CharacterShareToggle characterId={char.id} isPublic={char.isPublic} />
          )}

          {/* Quick stats (fantasy only, computed from actual data) */}
          {quickStats.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {quickStats.map(s => (
                <div key={s.label} className="bg-card border border-ink/20 rounded-lg p-3 text-center">
                  <p className="font-cinzel text-lg font-bold">{s.value}</p>
                  <p className="font-almendra text-[9px] text-ink-soft mt-0.5 uppercase tracking-widest">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* System info */}
          {system && (
            <div className="bg-card border border-ink/20 rounded-lg p-4">
              <p className="font-almendra text-[9px] font-bold text-ink-soft uppercase tracking-widest mb-2">Sistema</p>
              <div className="flex items-center gap-2">
                <SystemIcon size={16} className="text-ink-soft shrink-0" />
                <div>
                  <p className={`text-sm font-medium ${systemColor}`}>{system.name}</p>
                  <p className="text-[10px] text-ink-soft">
                    {sheetSource?.isPreset ? 'Ficha pré-definida' : 'Ficha personalizada'}
                  </p>
                  {char.sheetSystem && char.sheetSystem.id !== system.id && (
                    <p className="text-[10px] text-ink-soft mt-0.5">
                      Template: <span className="text-ink">{char.sheetSystem.name}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — tabbed sheet */}
        <CharacterSheetView
          characterId={char.id}
          characterLevel={char.level}
          attributes={char.attributes}
          textFields={char.textFields}
          weapons={char.weapons}
          spellSlots={char.spellSlots}
          canEdit={canEdit}
          category={category}
          systemName={sheetSource?.name ?? null}
        />
      </div>
    </div>
  )
}
