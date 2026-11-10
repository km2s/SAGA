import { SlashCommandBuilder } from 'discord.js'
import type { Command } from '../../types.js'
import { getCampaignByGuild, getMember } from '../../lib/permissions.js'
import { summaryEmbed, errorEmbed, infoEmbed } from '../../lib/embeds.js'
import { prisma } from 'database'

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('resumo')
    .setDescription('Mostra o resumo da última sessão encerrada'),

  async execute(interaction) {
    await interaction.deferReply()
    const guildId = interaction.guildId!
    const discordId = interaction.user.id

    const campaign = await getCampaignByGuild(guildId)
    if (!campaign) return void await interaction.editReply({ embeds: [errorEmbed('Nenhuma campanha registrada. Use `/campanha registrar`.')] })

    const member = await getMember(discordId, campaign.id)
    if (!member) return void await interaction.editReply({ embeds: [errorEmbed('Você não é membro desta campanha.')] })

    const lastSession = await prisma.session.findFirst({
      where: { campaignId: campaign.id, isActive: false },
      orderBy: { endedAt: 'desc' },
      include: { summary: true },
    })

    if (!lastSession) {
      return void await interaction.editReply({ embeds: [infoEmbed('Nenhuma sessão encerrada encontrada.')] })
    }

    if (!lastSession.summary) {
      return void await interaction.editReply({ embeds: [infoEmbed('A última sessão não tem resumo gerado.')] })
    }

    await interaction.editReply({ embeds: [summaryEmbed(lastSession.summary, lastSession.name)] })
  },

  async prefix(message) {
    const guildId = message.guildId!
    const discordId = message.author.id

    const campaign = await getCampaignByGuild(guildId)
    if (!campaign) return void await message.reply({ embeds: [errorEmbed('Nenhuma campanha registrada.')] })

    const member = await getMember(discordId, campaign.id)
    if (!member) return void await message.reply({ embeds: [errorEmbed('Você não é membro desta campanha.')] })

    const lastSession = await prisma.session.findFirst({
      where: { campaignId: campaign.id, isActive: false },
      orderBy: { endedAt: 'desc' },
      include: { summary: true },
    })

    if (!lastSession?.summary) {
      return void await message.reply({ embeds: [infoEmbed('Nenhum resumo disponível.')] })
    }

    await message.reply({ embeds: [summaryEmbed(lastSession.summary, lastSession.name)] })
  },
}

export default command
