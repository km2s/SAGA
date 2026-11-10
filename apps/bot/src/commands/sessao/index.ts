import { SlashCommandBuilder } from 'discord.js'
import type { Command } from '../../types.js'
import { getCampaignByGuild, getMember, getActiveSession, formatDuration } from '../../lib/permissions.js'
import { sessionStartEmbed, sessionEndEmbed, errorEmbed, infoEmbed } from '../../lib/embeds.js'
import { prisma, contarRolagens, resumoContagem } from 'database'

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('sessao')
    .setDescription('Gerencia sessões da campanha')
    .addSubcommand(s =>
      s.setName('iniciar')
        .setDescription('Inicia uma nova sessão (somente Mestre)')
        .addStringOption(o => o.setName('nome').setDescription('Nome da sessão (opcional)')))
    .addSubcommand(s =>
      s.setName('encerrar')
        .setDescription('Encerra a sessão atual e gera resumo (somente Mestre)'))
    .addSubcommand(s =>
      s.setName('status')
        .setDescription('Mostra o status da sessão atual')),

  async execute(interaction) {
    await interaction.deferReply()
    const sub = interaction.options.getSubcommand()
    const guildId = interaction.guildId!
    const discordId = interaction.user.id

    const campaign = await getCampaignByGuild(guildId)
    if (!campaign) return void await interaction.editReply({ embeds: [errorEmbed('Nenhuma campanha registrada neste servidor. Use `/campanha registrar`.')]})

    const member = await getMember(discordId, campaign.id)
    if (!member) return void await interaction.editReply({ embeds: [errorEmbed('Você não é membro desta campanha.')]})

    if (sub === 'iniciar') {
      if (member.role !== 'GM') return void await interaction.editReply({ embeds: [errorEmbed('Apenas o Mestre pode iniciar sessões.')]})

      const existing = await getActiveSession(campaign.id)
      if (existing) return void await interaction.editReply({ embeds: [errorEmbed(`Já existe uma sessão ativa: **${existing.name ?? 'Sessão em andamento'}**. Encerre antes de iniciar outra.`)]})

      const nome = interaction.options.getString('nome') ?? undefined
      const session = await prisma.session.create({
        data: { name: nome, campaignId: campaign.id },
      })
      await prisma.campaign.update({ where: { id: campaign.id }, data: { updatedAt: new Date() } })

      await interaction.editReply({ embeds: [sessionStartEmbed(session.name ?? 'Nova sessão', campaign.name)] })
    }

    if (sub === 'encerrar') {
      if (member.role !== 'GM') return void await interaction.editReply({ embeds: [errorEmbed('Apenas o Mestre pode encerrar sessões.')]})

      const session = await getActiveSession(campaign.id)
      if (!session) return void await interaction.editReply({ embeds: [errorEmbed('Não há sessão ativa para encerrar.')]})

      const contagem = await contagemSessao(session.id, member)
      const rollCount = contagem.publicas
      const duration = formatDuration(session.startedAt)

      await prisma.session.update({
        where: { id: session.id },
        data: { isActive: false, endedAt: new Date() },
      })

      const summaryContent = generateSummary(session.name, duration, rollCount)
      await prisma.sessionSummary.create({
        data: { sessionId: session.id, content: summaryContent },
      })

      await interaction.editReply({ embeds: [sessionEndEmbed(campaign.name, duration, rollCount)] })
      await mestreVeTudo(interaction, contagem.mestre)
    }

    if (sub === 'status') {
      const session = await getActiveSession(campaign.id)
      if (!session) return void await interaction.editReply({ embeds: [infoEmbed('Nenhuma sessão ativa no momento.')] })
      const duration = formatDuration(session.startedAt)
      const contagem = await contagemSessao(session.id, member)
      const rollCount = contagem.publicas
      await interaction.editReply({ embeds: [infoEmbed(`**${session.name ?? 'Sessão em andamento'}** · ${campaign.name}\n⏱ Duração: ${duration} · 🎲 Rolagens: ${rollCount}`)] })
      await mestreVeTudo(interaction, contagem.mestre)
    }
  },
}

// Rolagens privadas (combinado de 2026-11-07): no canal, só as públicas; o mestre recebe, só para ele,
// o total com os contadores ("30 rolagens · 10 secretas · 10 às cegas").
async function contagemSessao(sessionId: string, member: { id: string; role: string; user?: { username?: string } | null }) {
  const logs = await prisma.rollLog.findMany({ where: { sessionId, NOT: { expression: 'chat' } }, select: { visibility: true, revealedAt: true, memberId: true, rolledBy: true } })
  const publicas = logs.filter(l => l.visibility === 'PUBLIC' || l.revealedAt).length
  const mestre = member.role === 'GM' ? resumoContagem(contarRolagens(logs, { memberId: member.id, username: member.user?.username ?? '', gm: true })) : null
  return { publicas, mestre }
}
async function mestreVeTudo(interaction: { followUp: (o: { embeds: ReturnType<typeof infoEmbed>[]; ephemeral: boolean }) => Promise<unknown> }, resumo: string | null) {
  if (resumo) await interaction.followUp({ embeds: [infoEmbed(`🎲 Só você vê: ${resumo}`)], ephemeral: true })
}

function generateSummary(name: string | null, duration: string, rolls: number): string {
  return `Sessão: ${name ?? 'Sem nome'}\nDuração: ${duration}\nTotal de rolagens: ${rolls}\nGerado automaticamente pelo SAGA.`
}

export default command
