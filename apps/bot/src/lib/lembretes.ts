import type { Client } from 'discord.js'
import { prisma } from 'database'

const MIN = 60_000
const dmDesligada = (raw: string | null) => { try { return (JSON.parse(raw ?? '{}') as { dm?: number }).dm === 0 } catch { return false } }

/**
 * Lembrete das sessões agendadas no Painel do Mestre: 1 hora antes, cada membro
 * recebe uma DM. Marca `lembradoEm` antes de enviar (dois bots no ar não repetem).
 */
async function enviarDevidos(client: Client) {
  const agora = Date.now()
  const devidas = await prisma.sessaoAgendada.findMany({
    where: {
      lembrete: true, lembradoEm: null,
      quando: { gt: new Date(agora), lte: new Date(agora + 60 * MIN) },
      campaign: { botEnabled: true, archivedAt: null },
    },
    select: {
      id: true, titulo: true, horario: true,
      campaign: { select: { name: true, members: { select: { user: { select: { discordId: true, prefsJson: true } } } } } },
    },
  }).catch(() => [])

  for (const ag of devidas) {
    const marcada = await prisma.sessaoAgendada.updateMany({ where: { id: ag.id, lembradoEm: null }, data: { lembradoEm: new Date() } }).catch(() => ({ count: 0 }))
    if (!marcada.count) continue
    const texto = `⏳ **${ag.titulo}** de *${ag.campaign.name}* começa às ${ag.horario} (horário de Brasília). Até já na mesa!`
    for (const m of ag.campaign.members) {
      // Perfil › Conexões: "Lembretes de sessão por DM" desligado.
      if (dmDesligada(m.user.prefsJson)) continue
      try {
        const u = await client.users.fetch(m.user.discordId)
        await u.send(texto)
      } catch { /* DM fechada ou usuário fora do alcance do bot */ }
    }
  }
}

export function iniciarLembretes(client: Client) {
  const tick = () => { void enviarDevidos(client).catch(err => console.error('Erro nos lembretes de sessão:', err)) }
  tick()
  setInterval(tick, 5 * MIN)
}
