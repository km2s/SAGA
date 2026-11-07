import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { notFound, redirect } from 'next/navigation'
import { FichaAntiga } from '@/components/character/FichaAntiga'
import { Ficha } from '@/components/screens/ficha/Ficha'
import type { FichaDados } from '@/components/screens/ficha/vals'

// Atributos do D&D 5e do seed (lib/systems-seed.ts).
const ATTR: [string, string][] = [['Força', 'FOR'], ['Destreza', 'DES'], ['Constituição', 'CON'], ['Inteligência', 'INT'], ['Sabedoria', 'SAB'], ['Carisma', 'CAR']]
const SK: [string, string][] = [['Acrobacia', 'DES'], ['Arcanismo', 'INT'], ['Atletismo', 'FOR'], ['Atuação', 'CAR'], ['Enganação', 'CAR'], ['Furtividade', 'DES'], ['História', 'INT'], ['Intimidação', 'CAR'], ['Intuição', 'SAB'], ['Investigação', 'INT'], ['Lidar com Animais', 'SAB'], ['Medicina', 'SAB'], ['Natureza', 'INT'], ['Percepção', 'SAB'], ['Persuasão', 'CAR'], ['Prestidigitação', 'DES'], ['Religião', 'INT'], ['Sobrevivência', 'SAB']]

/**
 * `[id]` aceita o id da participação (links antigos e o bot) ou o id da ficha
 * (telas do redesign). D&D 5e abre a Ficha nova; os outros sistemas seguem com
 * a ficha antiga até a tela Fichas por Sistema.
 */
export default async function PersonagemPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const memberId = (await prisma.campaignMember.findUnique({ where: { id: params.id }, select: { id: true } }).catch(() => null))?.id
    ?? (await prisma.characterSheet.findUnique({ where: { id: params.id }, select: { memberId: true } }).catch(() => null))?.memberId
  if (!memberId) notFound()

  const m = await prisma.campaignMember.findUnique({
    where: { id: memberId },
    include: {
      user: { select: { discordId: true } },
      campaign: { select: { id: true, name: true, system: { select: { name: true } } } },
      character: {
        include: {
          sheetSystem: { select: { name: true } },
          attributes: { include: { attribute: { select: { name: true } } } },
          weapons: { orderBy: { order: 'asc' } },
          spellSlots: { orderBy: { level: 'asc' } },
          textFields: true,
        },
      },
    },
  }).catch(() => null)
  if (!m?.character) notFound()

  const sistema = m.character.sheetSystem?.name ?? m.campaign.system?.name ?? null
  if (sistema !== 'D&D 5e') return <FichaAntiga params={{ id: memberId }} />

  const isMine = m.user.discordId === session.user.discordId
  const gm = isMine ? null : await prisma.campaignMember.findFirst({ where: { campaignId: m.campaignId, role: 'GM', user: { discordId: session.user.discordId } } }).catch(() => null)
  if (!isMine && !gm) notFound()

  const ch = m.character
  const val = (nome: string) => ch.attributes.find(a => a.attribute.name.toLowerCase() === nome.toLowerCase())?.value ?? null
  const texto = (key: string) => ch.textFields.find(t => t.key === key)?.value ?? ''
  const desloc = val('Velocidade')

  const dados: FichaDados = {
    id: ch.id, memberId, campaignId: m.campaignId, podeEditar: true,
    nome: ch.name,
    linha: [ch.race, ch.class, `Nível ${ch.level}`, texto('antecedente'), texto('alinhamento')].filter(Boolean).join(' · '),
    sysCamp: `${sistema} · ${m.campaign.name}`,
    img: ch.imageUrl, classe: ch.class, nivel: ch.level, hp: ch.hp, mx: ch.maxHp,
    attrs: ATTR.map(([n, k]) => ({ n, k, v: val(n) ?? 10 })),
    saves: Object.fromEntries(ATTR.map(([n, k]) => [k, val(`Salv. ${n}`)])),
    skills: SK.map(([n, a]) => ({ n, a, b: val(n) })),
    ca: val('Classe de Armadura'),
    desloc: desloc != null ? `${desloc} m` : null,
    percPassiva: val('Percepção Passiva'),
    armas: ch.weapons.map(w => ({
      n: w.name,
      d: [w.range, w.properties, w.damageType].filter(Boolean).join(' · '),
      b: parseInt(w.attackBonus ?? '0', 10) || 0,
      dano: w.damage ?? '',
    })),
    slots: ch.spellSlots.map(s => ({ level: s.level, total: s.total, used: s.used })),
    textos: { diario: texto('diario'), juramentos: texto('juramentos') },
  }
  return <Ficha dados={dados} />
}
