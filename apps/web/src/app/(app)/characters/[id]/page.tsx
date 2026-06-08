import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { notFound, redirect } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { AttributePanel } from '@/components/character/AttributePanel'
import { PresetAttributeGrid } from '@/components/character/PresetAttributeGrid'
import { HPEditor } from '@/components/character/HPEditor'

const CLASS_ICONS: Record<string, string> = {
  Guerreiro: '⚔️', Mago: '🔮', Paladino: '🛡️', Ladino: '🗡️', Clérigo: '✝️',
  Bárbaro: '🪓', Druida: '🌿', Bardo: '🎵', Ranger: '🏹', Monge: '👊',
  Feiticeiro: '✨', Bruxo: '🌙', Arcanista: '📜',
}

const SYSTEM_BADGE: Record<string, { label: string; color: string }> = {
  'D&D 5e':        { label: 'D&D 5e',        color: 'text-[#c9a22a]' },
  'Tormenta20':    { label: 'Tormenta20',    color: 'text-[#e57348]' },
  'Call of Cthulhu': { label: 'Cthulhu',     color: 'text-[#5a9e8f]' },
  'Personalizado': { label: 'Personalizado', color: 'text-saga-muted' },
}

const PRESET_SYSTEM_NAMES = ['D&D 5e', 'Tormenta20', 'Call of Cthulhu']

export default async function CharacterDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const member = await prisma.campaignMember.findUnique({
    where: { id: params.id },
    include: {
      user: true,
      campaign: { include: { system: true } },
      character: {
        include: {
          attributes: {
            include: { attribute: true },
            orderBy: { attribute: { name: 'asc' } },
          },
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
  const isPresetSystem = system?.isPreset && PRESET_SYSTEM_NAMES.includes(system.name)
  const classIcon = CLASS_ICONS[char.class ?? ''] ?? '🧙'
  const systemBadge = system ? SYSTEM_BADGE[system.name] : null

  return (
    <div className="p-8 pt-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-cinzel text-2xl font-bold">Ficha de Personagem</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-saga-muted">{campaign.name}</p>
            {system && (
              <>
                <span className="text-saga-dim">·</span>
                <span className={`text-sm font-medium ${systemBadge?.color ?? 'text-saga-muted'}`}>
                  {isPresetSystem ? '📋' : '✏️'} {system.name}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: '240px 1fr' }}>
        {/* LEFT — portrait + stats */}
        <div className="space-y-4">
          {/* Portrait */}
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            {char.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={char.imageUrl} alt={char.name} className="w-full h-52 object-cover object-top" />
            ) : (
              <div className="w-full h-52 bg-gradient-to-br from-[#1a0533] via-[#4a1080] to-[#7c3aed] flex items-center justify-center text-7xl">
                {classIcon}
              </div>
            )}
            <div className="p-4">
              <h2 className="font-cinzel text-lg font-bold text-center">{char.name}</h2>
              {char.race && (
                <div className="flex justify-between text-[12px] mt-2">
                  <span className="text-saga-muted">Raça</span>
                  <span>{char.race}</span>
                </div>
              )}
              {char.class && (
                <div className="flex justify-between text-[12px] mt-1">
                  <span className="text-saga-muted">Classe</span>
                  <span>{char.class}</span>
                </div>
              )}
              <div className="flex justify-center mt-3">
                <Badge variant="gold">Nível {char.level}</Badge>
              </div>
            </div>
          </div>

          {/* HP */}
          <HPEditor characterId={char.id} hp={char.hp} maxHp={char.maxHp} canEdit={canEdit} />

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'CA', value: '10' },
              { label: 'Iniciativa', value: '+0' },
              { label: 'Velocidade', value: '9m' },
              { label: 'Proficiência', value: '+2' },
            ].map(s => (
              <div key={s.label} className="bg-surface border border-border rounded-lg p-3 text-center">
                <p className="font-cinzel text-base font-bold">{s.value}</p>
                <p className="text-[10px] text-saga-muted mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* System info card */}
          {system && (
            <div className="bg-surface border border-border rounded-lg p-4">
              <p className="text-[10px] font-bold text-saga-dim uppercase tracking-widest mb-2">Sistema</p>
              <div className="flex items-center gap-2">
                <span className="text-lg">{isPresetSystem ? '📋' : '✏️'}</span>
                <div>
                  <p className={`text-sm font-medium ${systemBadge?.color ?? 'text-saga-muted'}`}>{system.name}</p>
                  <p className="text-[10px] text-saga-dim">
                    {isPresetSystem ? 'Ficha pré-definida' : 'Ficha personalizada'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — attributes */}
        <div>
          {isPresetSystem ? (
            <PresetAttributeGrid
              characterId={char.id}
              attributes={char.attributes}
              canEdit={canEdit}
            />
          ) : (
            <AttributePanel
              characterId={char.id}
              attributes={char.attributes}
              canEdit={canEdit}
            />
          )}
        </div>
      </div>
    </div>
  )
}
