import { SlashCommandBuilder } from 'discord.js'
import type { Command } from '../../types.js'
import { getCampaignByGuild, getMember } from '../../lib/permissions.js'
import { handoutListEmbed, handoutDetailEmbed, errorEmbed, infoEmbed } from '../../lib/embeds.js'
import { prisma } from 'database'

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('handout')
    .setDescription('Acessa handouts compartilhados com você')
    .addSubcommand(s =>
      s.setName('listar')
        .setDescription('Lista todos os handouts visíveis para você'))
    .addSubcommand(s =>
      s.setName('ver')
        .setDescription('Mostra o conteúdo de um handout')
        .addIntegerOption(o =>
          o.setName('numero')
            .setDescription('Número do handout (use /handout listar para ver os números)')
            .setRequired(true)
            .setMinValue(1))),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })
    const sub = interaction.options.getSubcommand()
    const guildId = interaction.guildId!
    const discordId = interaction.user.id

    const campaign = await getCampaignByGuild(guildId)
    if (!campaign) return void await interaction.editReply({ embeds: [errorEmbed('Nenhuma campanha registrada. Use `/campanha registrar`.')] })

    const member = await getMember(discordId, campaign.id)
    if (!member) return void await interaction.editReply({ embeds: [errorEmbed('Você não é membro desta campanha.')] })

    const isGM = member.role === 'GM'

    // GM vê todos os handouts; players veem apenas os compartilhados com eles
    const handouts = await prisma.handout.findMany({
      where: isGM
        ? { campaignId: campaign.id }
        : {
            campaignId: campaign.id,
            seenBy: { some: { memberId: member.id } },
          },
      include: {
        sharedBy: { include: { user: { select: { username: true } } } },
        seenBy: { where: { memberId: member.id } },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (sub === 'listar') {
      // Mark unread items as seen for the member (if not GM)
      if (!isGM) {
        const unseenIds = handouts
          .filter(h => h.seenBy.length === 0)
          .map(h => h.id)

        for (const handoutId of unseenIds) {
          await prisma.handoutView.upsert({
            where: { handoutId_memberId: { handoutId, memberId: member.id } },
            update: {},
            create: { handoutId, memberId: member.id },
          }).catch(() => null)
        }
      }

      return void await interaction.editReply({ embeds: [handoutListEmbed(handouts)] })
    }

    if (sub === 'ver') {
      const numero = interaction.options.getInteger('numero', true)
      const handout = handouts[numero - 1]

      if (!handout) {
        return void await interaction.editReply({ embeds: [errorEmbed(`Handout #${numero} não encontrado. Use \`/handout listar\` para ver os disponíveis.`)] })
      }

      // Mark as seen
      if (!isGM) {
        await prisma.handoutView.upsert({
          where: { handoutId_memberId: { handoutId: handout.id, memberId: member.id } },
          update: {},
          create: { handoutId: handout.id, memberId: member.id },
        }).catch(() => null)
      }

      await interaction.editReply({ embeds: [handoutDetailEmbed(handout)] })
    }
  },

  async prefix(message, args) {
    const sub = args[0]?.toLowerCase() ?? 'listar'
    const guildId = message.guildId!
    const discordId = message.author.id

    const campaign = await getCampaignByGuild(guildId)
    if (!campaign) return void await message.reply({ embeds: [errorEmbed('Nenhuma campanha registrada.')] })

    const member = await getMember(discordId, campaign.id)
    if (!member) return void await message.reply({ embeds: [errorEmbed('Você não é membro desta campanha.')] })

    const isGM = member.role === 'GM'

    const handouts = await prisma.handout.findMany({
      where: isGM
        ? { campaignId: campaign.id }
        : { campaignId: campaign.id, seenBy: { some: { memberId: member.id } } },
      include: {
        sharedBy: { include: { user: { select: { username: true } } } },
        seenBy: { where: { memberId: member.id } },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (sub === 'listar') {
      return void await message.reply({ embeds: [handoutListEmbed(handouts)] })
    }

    const numero = parseInt(args[1])
    if (isNaN(numero)) return void await message.reply({ embeds: [errorEmbed('Informe o número do handout. Ex: `+handout ver 2`')] })

    const handout = handouts[numero - 1]
    if (!handout) return void await message.reply({ embeds: [errorEmbed(`Handout #${numero} não encontrado.`)] })

    await message.reply({ embeds: [handoutDetailEmbed(handout)] })
  },
}

export default command
