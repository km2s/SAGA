import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, content, visibility } = body

  if (!content?.trim()) return NextResponse.json({ error: 'Conteúdo obrigatório' }, { status: 400 })

  const validVisibility = ['PRIVATE', 'CAMPAIGN', 'GM_ONLY']
  if (visibility && !validVisibility.includes(visibility)) {
    return NextResponse.json({ error: 'Visibilidade inválida' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { discordId: session.user.discordId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const member = await prisma.campaignMember.findFirst({
    where: { userId: user.id, campaignId: params.id },
  })
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  if (visibility === 'GM_ONLY' && member.role !== 'GM') {
    return NextResponse.json({ error: 'Apenas o Mestre pode criar notas do tipo GM_ONLY' }, { status: 403 })
  }

  const note = await prisma.note.create({
    data: {
      title: title?.trim() || null,
      content: content.trim(),
      visibility: visibility ?? 'PRIVATE',
      authorId: user.id,
      campaignId: params.id,
    },
  })

  return NextResponse.json(note, { status: 201 })
}
