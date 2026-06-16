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
