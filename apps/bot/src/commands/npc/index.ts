import { SlashCommandBuilder } from 'discord.js'
import type { Command } from '../../types.js'
import { getCampaignByGuild, getMember, getOrCreateUser, canViewNPC } from '../../lib/permissions.js'
import { npcEmbed, errorEmbed, infoEmbed } from '../../lib/embeds.js'
import { prisma } from 'database'

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('npc')
    .setDescription('Gerencia NPCs da campanha (Mestre)')
    .addSubcommand(s =>
      s.setName('criar')
        .setDescription('Cria um novo NPC (somente Mestre)')
        .addStringOption(o => o.setName('nome').setDescription('Nome do NPC').setRequired(true))
        .addStringOption(o =>
          o.setName('tipo')
            .setDescription('Tipo do NPC')
            .setRequired(true)
            .addChoices(
              { name: 'Antagonista', value: 'antagonista' },
              { name: 'Aliado', value: 'aliado' },
              { name: 'Neutro', value: 'neutro' },
            ))
        .addStringOption(o => o.setName('descricao').setDescription('Descrição do NPC'))
        .addStringOption(o => o.setName('jogador').setDescription('Vincula o NPC a um jogador (ID do Discord)')))
    .addSubcommand(s =>
      s.setName('ver')
        .setDescription('Exibe um NPC')
        .addStringOption(o => o.setName('nome').setDescription('Nome do NPC').setRequired(true)))
    .addSubcommand(s =>
      s.setName('listar')
        .setDescription('Lista NPCs visíveis para você'))
    .addSubcommand(s =>
      s.setName('liberar')
        .setDescription('Controla visibilidade de um NPC (somente Mestre)')
        .addStringOption(o => o.setName('npc').setDescription('Nome do NPC').setRequired(true))
        .addStringOption(o => o.setName('jogador').setDescription('ID do Discord do jogador').setRequired(true))
        .addBooleanOption(o => o.setName('visivel').setDescription('Liberar ou revogar acesso').setRequired(true))),

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

    if (sub === 'criar') {
      if (member.role !== 'GM') return void await interaction.editReply({ embeds: [errorEmbed('Apenas o Mestre pode criar NPCs.')] })

      const nome = interaction.options.getString('nome', true)
      const tipo = interaction.options.getString('tipo', true)
      const descricao = interaction.options.getString('descricao') ?? undefined
      const jogadorId = interaction.options.getString('jogador') ?? undefined

      let linkedMemberId: string | undefined
      if (jogadorId) {
        const linkedMember = await prisma.campaignMember.findFirst({
          where: { user: { discordId: jogadorId }, campaignId: campaign.id },
        })
        if (!linkedMember) return void await interaction.editReply({ embeds: [errorEmbed(`Jogador com Discord ID "${jogadorId}" não encontrado na campanha.`)] })
        linkedMemberId = linkedMember.id
      }

      const npc = await prisma.nPC.create({
        data: {
          name: nome,
          type: tipo,
          description: descricao,
          campaignId: campaign.id,
          linkedMemberId: linkedMemberId ?? null,
        },
      })

      const vincText = linkedMemberId ? '\nVinculado a um jogador.' : ''
      await interaction.editReply({ embeds: [infoEmbed(`NPC **${nome}** (${tipo}) criado com sucesso!${vincText}`)] })
    }

    if (sub === 'ver') {
      const nomeBusca = interaction.options.getString('nome', true).toLowerCase()

      const npc = await prisma.nPC.findFirst({
        where: { campaignId: campaign.id, name: { contains: nomeBusca, mode: 'insensitive' } },
        include: { attributes: { include: { attribute: true } } },
      })

      if (!npc) return void await interaction.editReply({ embeds: [errorEmbed(`NPC "${nomeBusca}" não encontrado.`)] })

      if (member.role !== 'GM') {
        const canView = await canViewNPC(discordId, npc.id)
        if (!canView) return void await interaction.editReply({ embeds: [errorEmbed('Você não tem permissão para ver este NPC.')] })
      }

      const attrs = npc.attributes.map(a => ({ name: a.attribute.name, value: a.value }))
      await interaction.editReply({ embeds: [npcEmbed({ ...npc, attributes: attrs })] })
    }

    if (sub === 'listar') {
      const isGM = member.role === 'GM'

      const npcs = isGM
        ? await prisma.nPC.findMany({ where: { campaignId: campaign.id } })
        : await prisma.nPC.findMany({
            where: {
              campaignId: campaign.id,
              OR: [
                { isPublic: true },
                { visibilities: { some: { memberId: member.id, canView: true } } },
                { linkedMemberId: member.id },
              ],
            },
          })

      if (!npcs.length) return void await interaction.editReply({ embeds: [infoEmbed('Nenhum NPC visível para você no momento.')] })

      const lista = npcs.map(n => `• **${n.name}** — ${n.type}${n.isPublic ? ' 👁' : ' 🔒'}`).join('\n')
      await interaction.editReply({ embeds: [infoEmbed(`**NPCs de ${campaign.name}:**\n${lista}`)] })
    }

    if (sub === 'liberar') {
      if (member.role !== 'GM') return void await interaction.editReply({ embeds: [errorEmbed('Apenas o Mestre pode controlar visibilidade de NPCs.')] })

      const nomeBusca = interaction.options.getString('npc', true)
      const jogadorDiscordId = interaction.options.getString('jogador', true)
      const visivel = interaction.options.getBoolean('visivel', true)

      const npc = await prisma.nPC.findFirst({
        where: { campaignId: campaign.id, name: { contains: nomeBusca, mode: 'insensitive' } },
      })
      if (!npc) return void await interaction.editReply({ embeds: [errorEmbed(`NPC "${nomeBusca}" não encontrado.`)] })

      const targetMember = await prisma.campaignMember.findFirst({
        where: { user: { discordId: jogadorDiscordId }, campaignId: campaign.id },
        include: { user: true },
      })
      if (!targetMember) return void await interaction.editReply({ embeds: [errorEmbed('Jogador não encontrado na campanha.')] })

      await prisma.nPCVisibility.upsert({
        where: { npcId_memberId: { npcId: npc.id, memberId: targetMember.id } },
        update: { canView: visivel },
        create: { npcId: npc.id, memberId: targetMember.id, canView: visivel },
      })

      const acao = visivel ? 'pode ver' : 'não pode mais ver'
      await interaction.editReply({ embeds: [infoEmbed(`**${targetMember.user.username}** agora ${acao} o NPC **${npc.name}**.`)] })
    }
  },
}

export default command
