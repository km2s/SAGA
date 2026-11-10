import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { mergeResourcesJson } from '@/lib/resource-tracks'
import { validateImageUrlOrError } from '@/lib/validate-url'
import { apagarSeNosso } from '@/lib/storage'

const TIPOS = ['comum', 'arma', 'armadura', 'escudo', 'consumivel', 'missao']
const ICONES = ['sword', 'shield', 'shield-half', 'flask-conical', 'scroll', 'gem', 'backpack', 'key', 'mail']
const num = (v: unknown, lo: number, hi: number) => (typeof v === 'number' && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : lo)
/** Inventário vindo do navegador: até 200 itens, campos conhecidos e limitados. */
function limparInventario(x: unknown) {
  if (!Array.isArray(x) || x.length > 200) return null
  return x.filter(i => i && typeof i === 'object' && typeof (i as { n?: unknown }).n === 'string' && (i as { n: string }).n.trim()).map(raw => {
    const i = raw as Record<string, unknown>
    return {
      id: typeof i.id === 'string' ? i.id.slice(0, 40) : `i${Math.random().toString(36).slice(2, 10)}`,
      ic: ICONES.includes(i.ic as string) ? i.ic : 'backpack', n: (i.n as string).trim().slice(0, 80), d: typeof i.d === 'string' ? i.d.slice(0, 200) : '',
      q: Math.round(num(i.q, 1, 9999)), w: num(i.w, 0, 9999), ty: TIPOS.includes(i.ty as string) ? i.ty : 'comum', eq: i.eq ? 1 : 0,
      ...(typeof i.ca === 'number' ? { ca: Math.round(num(i.ca, 0, 30)) } : {}),
    }
  })
}
function limparMoedas(x: unknown) {
  if (!x || typeof x !== 'object') return null
  const m = x as Record<string, unknown>
  return Object.fromEntries(['pc', 'pp', 'pe', 'po', 'pl'].map(k => [k, Math.round(num(m[k], 0, 9_999_999))]))
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sheet = await prisma.characterSheet.findUnique({
    where: { id: params.id },
    include: { member: { include: { user: true } } },
  }).catch(() => null)
  if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isMine = sheet.member.user.discordId === session.user.discordId
  const isGM = await prisma.campaignMember.findFirst({
    where: {
      campaignId: sheet.member.campaignId,
      user: { discordId: session.user.discordId },
      role: 'GM',
    },
  }).catch(() => null)
  if (!isMine && !isGM) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.characterAttribute.deleteMany({ where: { sheetId: params.id } }).catch(() => null)
  await prisma.characterSheet.delete({ where: { id: params.id } }).catch(() => null)

  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // params.id is the CharacterSheet ID
  const sheet = await prisma.characterSheet.findUnique({
    where: { id: params.id },
    include: { member: { include: { user: true } } },
  })
  if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isMine = sheet.member.user.discordId === session.user.discordId
  const isGM = await prisma.campaignMember.findFirst({
    where: {
      campaignId: sheet.member.campaignId,
      user: { discordId: session.user.discordId },
      role: 'GM',
    },
  })
  if (!isMine && !isGM) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as {
    hp?: number; maxHp?: number; level?: number; isPublic?: boolean; imageUrl?: string | null
    name?: string; race?: string | null; class?: string | null
    // Barras de recurso além da vida: {chave: {current, max}}, mescladas com as gravadas
    resources?: unknown
    // Inventário, moedas e XP (SAGA Ficha Inventario)
    inventario?: unknown; moedas?: unknown; xpGanho?: { v?: unknown; motivo?: unknown }
  }

  // Imagem: só http(s); a antiga sai do bucket se for nossa.
  if ('imageUrl' in body && body.imageUrl) {
    const { value, error } = validateImageUrlOrError(body.imageUrl)
    if (error) return NextResponse.json({ error }, { status: 400 })
    body.imageUrl = value
  }
  const inv = body.inventario !== undefined ? limparInventario(body.inventario) : undefined
  if (body.inventario !== undefined && !inv) return NextResponse.json({ error: 'Inventário inválido' }, { status: 400 })
  const moedas = body.moedas !== undefined ? limparMoedas(body.moedas) : undefined
  if (body.moedas !== undefined && !moedas) return NextResponse.json({ error: 'Moedas inválidas' }, { status: 400 })
  const ganho = body.xpGanho && typeof body.xpGanho.v === 'number' && body.xpGanho.v > 0 && body.xpGanho.v <= 999_999 ? Math.round(body.xpGanho.v) : null
  if (body.xpGanho !== undefined && !ganho) return NextResponse.json({ error: 'XP inválido' }, { status: 400 })
  const hist = ganho ? JSON.stringify([{ w: typeof body.xpGanho!.motivo === 'string' ? body.xpGanho!.motivo.trim().slice(0, 80) || 'Concedido pelo Mestre' : 'Concedido pelo Mestre', v: ganho }, ...(() => { try { return JSON.parse(sheet.xpHistoricoJson ?? '[]') as unknown[] } catch { return [] } })()].slice(0, 20)) : undefined

  // Only the character owner can change visibility
  if (body.isPublic !== undefined && !isMine) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Nome, raça e classe editáveis depois da criação (mesmos limites da criação)
  if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
    return NextResponse.json({ error: 'O nome não pode ficar vazio' }, { status: 400 })
  }
  const optionalText = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, 60) || null : null)

  const newMaxHp = body.maxHp !== undefined ? Math.max(1, body.maxHp) : sheet.maxHp
  const updated = await prisma.characterSheet.update({
    where: { id: params.id },
    data: {
      ...(body.hp !== undefined && { hp: Math.min(newMaxHp, Math.max(0, body.hp)) }),
      ...(body.maxHp !== undefined && { maxHp: newMaxHp }),
      ...(body.level !== undefined && { level: Math.min(20, Math.max(1, body.level)) }),
      ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
      ...('imageUrl' in body && { imageUrl: body.imageUrl ?? null }),
      ...(body.name !== undefined && { name: body.name.trim().slice(0, 100) }),
      ...('race' in body && { race: optionalText(body.race) }),
      ...('class' in body && { class: optionalText(body.class) }),
      ...(body.resources !== undefined && { resourcesJson: mergeResourcesJson(sheet.resourcesJson, body.resources) }),
      ...(inv && { inventarioJson: JSON.stringify(inv) }),
      ...(moedas && { moedasJson: JSON.stringify(moedas) }),
      ...(ganho && { xp: { increment: ganho }, xpHistoricoJson: hist }),
    },
  })
  if ('imageUrl' in body && sheet.imageUrl && sheet.imageUrl !== updated.imageUrl) void apagarSeNosso(sheet.imageUrl)
  return NextResponse.json(updated)
}
