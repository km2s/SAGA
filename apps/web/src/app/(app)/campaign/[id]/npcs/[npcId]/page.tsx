import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { NPCHPEditor } from '@/components/gm/NPCHPEditor'
import { NPCAttributePanel } from '@/components/gm/NPCAttributePanel'
import {
  ShieldAlert, UserCheck, Heart, Wind, User,
  ChevronLeft, Shield,
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

export default async function NPCDetailPage({ params }: { params: { id: string; npcId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const member = await prisma.campaignMember.findFirst({
    where: { campaignId: params.id, user: { discordId: session.user.discordId } },
  }).catch(() => null)
  if (!member) notFound()

  const isGM = member.role === 'GM'

  const npc = await prisma.nPC.findFirst({
    where: { id: params.npcId, campaignId: params.id },
    include: {
      campaign: true,
      attributes: {
        include: { attribute: true },
        orderBy: { attribute: { name: 'asc' } },
      },
      linkedMember: { include: { user: true } },
      visibilities: true,
    },
  }).catch(() => null)

  if (!npc) notFound()

  const canView = isGM || npc.isPublic ||
    npc.visibilities.some(v => v.memberId === member.id && v.canView)
  if (!canView) notFound()

  const TypeIcon = NPC_TYPE_ICONS[npc.type] ?? User

  return (
    <div className="p-4 sm:p-8 sm:pt-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link href={`/campaign/${params.id}/npcs`}
          className="flex items-center gap-1.5 text-sm text-saga-muted hover:text-gold transition-colors">
          <ChevronLeft size={15}/>
          NPCs de {npc.campaign.name}
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-cinzel text-2xl font-bold">Ficha do NPC</h1>
          <p className="text-sm text-saga-muted mt-1">{npc.campaign.name}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={NPC_TYPE_BADGE[npc.type] ?? 'muted'}>{NPC_TYPE_LABELS[npc.type] ?? npc.type}</Badge>
          <Badge variant={npc.isPublic ? 'success' : 'muted'}>{npc.isPublic ? 'Visível aos jogadores' : 'Restrito ao Mestre'}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-5">
        {/* LEFT — portrait + stats */}
        <div className="space-y-4">
          {/* Portrait */}
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            {npc.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={npc.imageUrl} alt={npc.name} className="w-full h-52 object-cover object-top" />
            ) : (
              <div className="w-full h-52 bg-gradient-to-br from-[#1a0533] via-[#2d1060] to-[#4a1080] flex items-center justify-center">
                <TypeIcon size={72} className="text-white/30" />
              </div>
            )}
            <div className="p-4">
              <h2 className="font-cinzel text-lg font-bold text-center">{npc.name}</h2>
              {npc.race && (
                <div className="flex justify-between text-[12px] mt-2">
                  <span className="text-saga-muted">Raça</span>
                  <span>{npc.race}</span>
                </div>
              )}
              {npc.class && (
                <div className="flex justify-between text-[12px] mt-1">
                  <span className="text-saga-muted">Classe</span>
                  <span>{npc.class}</span>
                </div>
              )}
              <div className="flex justify-center mt-3">
                <Badge variant="gold">Nível {npc.level}</Badge>
              </div>
              {npc.linkedMember && (
                <p className="text-[11px] text-saga-muted mt-3 text-center border-t border-border pt-2">
                  Ligado a <span className="text-saga-text">{npc.linkedMember.user.username}</span>
                </p>
              )}
            </div>
          </div>

          {/* HP — só o GM edita */}
          <NPCHPEditor
            campaignId={params.id}
            npcId={npc.id}
            hp={npc.hp}
            maxHp={npc.maxHp}
          />

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'CA', value: '10' },
              { label: 'Iniciativa', value: '+0' },
              { label: 'Velocidade', value: '9m' },
              { label: 'Tipo', value: NPC_TYPE_LABELS[npc.type] ?? npc.type },
            ].map(s => (
              <div key={s.label} className="bg-surface border border-border rounded-lg p-3 text-center">
                <p className="font-cinzel text-base font-bold truncate">{s.value}</p>
                <p className="text-[10px] text-saga-muted mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Descrição */}
          {npc.description && (
            <div className="bg-surface border border-border rounded-lg p-4">
              <p className="text-[10px] font-bold text-saga-dim uppercase tracking-widest mb-2 flex items-center gap-1">
                <Shield size={10}/> Descrição
              </p>
              <p className="text-sm text-saga-muted leading-relaxed">{npc.description}</p>
            </div>
          )}
        </div>

        {/* RIGHT — attributes */}
        <div>
          {isGM ? (
            <NPCAttributePanel
              campaignId={params.id}
              npcId={npc.id}
              attributes={npc.attributes.map(a => ({
                id: a.id, value: a.value,
                attribute: { name: a.attribute.name, defaultDie: a.customDie ?? a.attribute.defaultDie },
              }))}
            />
          ) : npc.attributes.length > 0 ? (
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="font-cinzel text-base font-semibold">Atributos</h3>
              </div>
              <div className="divide-y divide-border">
                {npc.attributes.map(attr => {
                  const mod = Math.floor((attr.value - 10) / 2)
                  const modStr = mod >= 0 ? `+${mod}` : `${mod}`
                  return (
                    <div key={attr.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{attr.attribute.name}</p>
                        <p className="text-[11px] text-saga-muted">valor {attr.value}</p>
                      </div>
                      <p className={`font-cinzel text-2xl font-bold ${mod >= 0 ? 'text-gold' : 'text-saga-danger'}`}>{modStr}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-lg p-8 flex flex-col items-center justify-center text-center gap-3">
              <Shield size={36} className="text-saga-muted/20"/>
              <p className="text-sm text-saga-muted font-cinzel">Nenhum atributo definido</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
