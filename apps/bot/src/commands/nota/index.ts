import { SlashCommandBuilder, EmbedBuilder } from 'discord.js'
import type { Command } from '../../types.js'
import { getCampaignByGuild, getMember, getOrCreateUser } from '../../lib/permissions.js'
import { errorEmbed, infoEmbed } from '../../lib/embeds.js'
import { prisma } from 'database'

const PURPLE = 0x7C3AED

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('nota')
    .setDescription('Gerencia seu bloco de notas')
    .addSubcommand(s =>
      s.setName('adicionar')
        .setDescription('Adiciona uma nota')
        .addStringOption(o => o.setName('texto').setDescription('Conteúdo da nota').setRequired(true))
        .addStringOption(o =>
          o.setName('visibilidade')
            .setDescription('Quem pode ver essa nota')
            .addChoices(
              { name: 'Privada (só você)', value: 'PRIVATE' },
              { name: 'Campanha (todos veem)', value: 'CAMPAIGN' },
              { name: 'Só o Mestre', value: 'GM_ONLY' },
            ))
        .addStringOption(o => o.setName('titulo').setDescription('Título da nota (opcional)')))
    .addSubcommand(s =>
      s.setName('ver')
        .setDescription('Exibe suas notas')
        .addStringOption(o =>
          o.setName('tipo')
            .setDescription('Filtrar por visibilidade')
            .addChoices(
              { name: 'Minhas notas privadas', value: 'PRIVATE' },
              { name: 'Notas da campanha', value: 'CAMPAIGN' },
            )))
    .addSubcommand(s =>
      s.setName('campanha')
        .setDescription('Exibe todas as notas visíveis da campanha')),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })
    const sub = interaction.options.getSubcommand()
    const guildId = interaction.guildId!
    const discordId = interaction.user.id

    const campaign = await getCampaignByGuild(guildId)
    if (!campaign) return void await interaction.editReply({ embeds: [errorEmbed('Nenhuma campanha registrada neste servidor.')] })

    const user = await getOrCreateUser(discordId, interaction.user.username)
    const member = await getMember(discordId, campaign.id)
    if (!member) return void await interaction.editReply({ embeds: [errorEmbed('Você não é membro desta campanha.')] })

    if (sub === 'adicionar') {
      const texto = interaction.options.getString('texto', true)
      const titulo = interaction.options.getString('titulo') ?? undefined
      const visibilidade = (interaction.options.getString('visibilidade') ?? 'PRIVATE') as 'PRIVATE' | 'CAMPAIGN' | 'GM_ONLY'

      await prisma.note.create({
        data: {
          title: titulo,
          content: texto,
          visibility: visibilidade,
          authorId: user.id,
          campaignId: campaign.id,
        },
      })

      const labelMap = { PRIVATE: 'privada', CAMPAIGN: 'da campanha', GM_ONLY: 'só para o mestre' }
      await interaction.editReply({ embeds: [infoEmbed(`Nota ${labelMap[visibilidade]} salva! 📝`)] })
    }

    if (sub === 'ver') {
      const tipo = (interaction.options.getString('tipo') ?? 'PRIVATE') as 'PRIVATE' | 'CAMPAIGN'

      const notes = await prisma.note.findMany({
        where: { authorId: user.id, campaignId: campaign.id, visibility: tipo },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })

      if (!notes.length) return void await interaction.editReply({ embeds: [infoEmbed('Nenhuma nota encontrada.')] })

      const embed = new EmbedBuilder()
        .setColor(PURPLE)
        .setTitle(`📝 Suas notas — ${campaign.name}`)
        .setDescription(notes.map((n: { title: string | null; content: string; createdAt: Date }, i: number) =>
          `**${i + 1}. ${n.title ?? 'Sem título'}**\n${n.content}\n*${n.createdAt.toLocaleDateString('pt-BR')}*`
        ).join('\n\n'))

      await interaction.editReply({ embeds: [embed] })
    }

    if (sub === 'campanha') {
      const isGM = member.role === 'GM'
      const notes = await prisma.note.findMany({
        where: {
          campaignId: campaign.id,
          visibility: isGM ? { in: ['CAMPAIGN', 'GM_ONLY'] } : 'CAMPAIGN',
        },
        include: { author: true },
        orderBy: { createdAt: 'desc' },
        take: 15,
      })

      if (!notes.length) return void await interaction.editReply({ embeds: [infoEmbed('Nenhuma nota pública na campanha ainda.')] })

      const embed = new EmbedBuilder()
        .setColor(PURPLE)
        .setTitle(`📜 Notas da campanha — ${campaign.name}`)
        .setDescription(notes.map((n: { title: string | null; content: string; author: { username: string } }) =>
          `**${n.title ?? 'Sem título'}** — *${n.author.username}*\n${n.content}`
        ).join('\n\n'))

      await interaction.editReply({ embeds: [embed] })
    }
  },
}

export default command
