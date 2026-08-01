const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN

async function discordFetch(path: string, init?: RequestInit) {
  if (!BOT_TOKEN) return null
  return fetch(`https://discord.com/api/v10${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  }).catch(() => null)
}

export async function notifyPlayerApplicationApproved(
  playerDiscordId: string,
  campaignName: string,
  campaignId: string,
) {
  const dmRes = await discordFetch('/users/@me/channels', {
    method: 'POST',
    body: JSON.stringify({ recipient_id: playerDiscordId }),
  })
  if (!dmRes?.ok) return
  const dm = await dmRes.json().catch(() => null) as { id?: string } | null
  if (!dm?.id) return

  await discordFetch(`/channels/${dm.id}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      embeds: [{
        title: '✅ Inscrição aprovada!',
        description: `Sua inscrição na campanha **${campaignName}** foi **aprovada**. Bem-vindo(a) à aventura!`,
        color: 0x22C55E,
        fields: [{ name: 'Próximos passos', value: `Acesse o site para criar seu personagem e acompanhar a campanha.` }],
        footer: { text: 'Saga RPG' },
      }],
    }),
  })
}

export async function notifyPlayerApplicationRejected(
  playerDiscordId: string,
  campaignName: string,
) {
  const dmRes = await discordFetch('/users/@me/channels', {
    method: 'POST',
    body: JSON.stringify({ recipient_id: playerDiscordId }),
  })
  if (!dmRes?.ok) return
  const dm = await dmRes.json().catch(() => null) as { id?: string } | null
  if (!dm?.id) return

  await discordFetch(`/channels/${dm.id}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      embeds: [{
        title: '❌ Inscrição não aprovada',
        description: `Sua inscrição na campanha **${campaignName}** não foi aprovada desta vez.`,
        color: 0xEF4444,
        fields: [{ name: 'O que fazer?', value: `Fique de olho em outras campanhas abertas no site!` }],
        footer: { text: 'Saga RPG' },
      }],
    }),
  })
}

export async function notifyGMApplicationReceived(
  gmDiscordId: string,
  campaignName: string,
  applicantUsername: string,
  campaignId: string,
) {
  const dmRes = await discordFetch('/users/@me/channels', {
    method: 'POST',
    body: JSON.stringify({ recipient_id: gmDiscordId }),
  })
  if (!dmRes?.ok) return
  const dm = await dmRes.json().catch(() => null) as { id?: string } | null
  if (!dm?.id) return

  await discordFetch(`/channels/${dm.id}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      embeds: [{
        title: '📋 Nova inscrição recebida',
        description: `**${applicantUsername}** se inscreveu na campanha **${campaignName}**.`,
        color: 0xC9A22A,
        fields: [{ name: 'Ver inscrições', value: `Acesse o Painel do Mestre da campanha para aprovar ou rejeitar.` }],
        footer: { text: 'Saga RPG' },
      }],
    }),
  })
}
