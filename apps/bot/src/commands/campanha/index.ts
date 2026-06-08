import { SlashCommandBuilder } from 'discord.js'
import type { Command } from '../../types.js'
import { getCampaignByGuild, getOrCreateUser, isGM } from '../../lib/permissions.js'
import { errorEmbed, infoEmbed } from '../../lib/embeds.js'
import { prisma } from 'database'

const SISTEMAS_PRESET = ['D&D 5e', 'Pathfinder 2e', 'Tormenta 20', 'Call of Cthulhu', 'Personalizado']

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('campanha')
    .setDescription('Gerencia a campanha vinculada a este servidor')
    .addSubcommand(s =>
      s.setName('registrar')
        .setDescription('Cria e vincula uma campanha a este servidor Discord')
        .addStringOption(o => o.setName('nome').setDescription('Nome da campanha').setRequired(true))
        .addStringOption(o =>
          o.setName('sistema')
            .setDescription('Sistema de RPG')
            .addChoices(
              { name: 'D&D 5e', value: 'D&D 5e' },
              { name: 'Pathfinder 2e', value: 'Pathfinder 2e' },
              { name: 'Tormenta 20', value: 'Tormenta 20' },
              { name: 'Call of Cthulhu', value: 'Call of Cthulhu' },
              { name: 'Personalizado (você define os atributos)', value: 'Personalizado' },
            ))
        .addStringOption(o => o.setName('descricao').setDescription('Descrição da campanha'))
        .addStringOption(o => o.setName('tema').setDescription('Tema/ambientação (ex: Medieval, Sci-fi, Horror)')))
    .addSubcommand(s =>
      s.setName('info')
        .setDescription('Exibe informações da campanha deste servidor'))
    .addSubcommand(s =>
      s.setName('entrar')
        .setDescription('Entra na campanha deste servidor como jogador'))
    .addSubcommand(s =>
      s.setName('atributo')
        .setDescription('Adiciona um atributo ao sistema personalizado (somente Mestre)')
        .addStringOption(o => o.setName('nome').setDescription('Nome do atributo (ex: Carisma)').setRequired(true))
        .addStringOption(o => o.setName('dado').setDescription('Dado padrão (ex: d20, 2d6)').setRequired(true))
        .addStringOption(o => o.setName('descricao').setDescription('Descrição do atributo'))),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })
    const sub = interaction.options.getSubcommand()
    const guildId = interaction.guildId!
    const discordId = interaction.user.id
    const username = interaction.user.username

    const user = await getOrCreateUser(discordId, username)

    if (sub === 'registrar') {
      const existing = await getCampaignByGuild(guildId)
      if (existing) return void await interaction.editReply({
        embeds: [errorEmbed(`Já existe uma campanha neste servidor: **${existing.name}**.\nUse \`/campanha info\` para ver detalhes.`)]
      })

      const nome = interaction.options.getString('nome', true)
      const sistema = interaction.options.getString('sistema') ?? 'Personalizado'
      const descricao = interaction.options.getString('descricao') ?? undefined
      const tema = interaction.options.getString('tema') ?? undefined

      // Cria ou busca o sistema de RPG
      let rpgSystem = await prisma.rPGSystem.findFirst({ where: { name: sistema, isPreset: sistema !== 'Personalizado' } })

      if (!rpgSystem) {
        rpgSystem = await prisma.rPGSystem.create({
          data: { name: sistema, isPreset: false },
        })

        // Atributos padrão para sistemas predefinidos
        if (sistema === 'D&D 5e' || sistema === 'Pathfinder 2e' || sistema === 'Tormenta 20') {
          const attrs = [
            { name: 'Força', defaultDie: 'd20' },
            { name: 'Destreza', defaultDie: 'd20' },
            { name: 'Constituição', defaultDie: 'd20' },
            { name: 'Inteligência', defaultDie: 'd20' },
            { name: 'Sabedoria', defaultDie: 'd20' },
            { name: 'Carisma', defaultDie: 'd20' },
          ]
          await prisma.systemAttribute.createMany({
            data: attrs.map(a => ({ ...a, systemId: rpgSystem!.id })),
          })
        }
      }

      const campaign = await prisma.campaign.create({
        data: {
          name: nome,
          description: descricao,
          theme: tema,
          guildId,
          systemId: rpgSystem.id,
        },
      })

      // Registra o criador como Mestre
      await prisma.campaignMember.create({
        data: { userId: user.id, campaignId: campaign.id, role: 'GM' },
      })

      await interaction.editReply({
        embeds: [infoEmbed(
          `Campanha **${nome}** criada!\nSistema: ${sistema}\n\nVocê é o Mestre. Outros jogadores podem usar \`/campanha entrar\` para participar.`
        )]
      })
    }

    if (sub === 'info') {
      const campaign = await getCampaignByGuild(guildId)
      if (!campaign) return void await interaction.editReply({ embeds: [errorEmbed('Nenhuma campanha registrada. Use `/campanha registrar`.')]})

      const memberCount = await prisma.campaignMember.count({ where: { campaignId: campaign.id } })
      const sessionCount = await prisma.session.count({ where: { campaignId: campaign.id } })

      await interaction.editReply({
        embeds: [infoEmbed(
          `**${campaign.name}**\n${campaign.description ?? ''}\n\nSistema: ${campaign.system?.name ?? 'Não definido'}\nMembros: ${memberCount} · Sessões: ${sessionCount}\nTema: ${campaign.theme ?? 'Não definido'}`
        )]
      })
    }

    if (sub === 'entrar') {
      const campaign = await getCampaignByGuild(guildId)
      if (!campaign) return void await interaction.editReply({ embeds: [errorEmbed('Nenhuma campanha registrada neste servidor.')] })

      const already = await prisma.campaignMember.findUnique({
        where: { userId_campaignId: { userId: user.id, campaignId: campaign.id } },
      })

      if (already) return void await interaction.editReply({ embeds: [infoEmbed(`Você já é membro de **${campaign.name}**!`)] })

      await prisma.campaignMember.create({
        data: { userId: user.id, campaignId: campaign.id, role: 'PLAYER' },
      })

      await interaction.editReply({ embeds: [infoEmbed(`Você entrou em **${campaign.name}**! Use \`/ficha criar\` para criar seu personagem.`)] })
    }

    if (sub === 'atributo') {
      const campaign = await getCampaignByGuild(guildId)
      if (!campaign) return void await interaction.editReply({ embeds: [errorEmbed('Nenhuma campanha registrada neste servidor.')] })

      const gm = await isGM(discordId, campaign.id)
      if (!gm) return void await interaction.editReply({ embeds: [errorEmbed('Apenas o Mestre pode adicionar atributos.')] })

      const nome = interaction.options.getString('nome', true)
      const dado = interaction.options.getString('dado', true)
      const descricao = interaction.options.getString('descricao') ?? undefined

      if (!campaign.systemId) return void await interaction.editReply({ embeds: [errorEmbed('Esta campanha não tem sistema configurado.')] })

      const existing = await prisma.systemAttribute.findFirst({
        where: { systemId: campaign.systemId, name: { equals: nome, mode: 'insensitive' } },
      })

      if (existing) return void await interaction.editReply({ embeds: [errorEmbed(`Atributo **${nome}** já existe neste sistema.`)] })

      await prisma.systemAttribute.create({
        data: { name: nome, defaultDie: dado, description: descricao, systemId: campaign.systemId },
      })

      await interaction.editReply({ embeds: [infoEmbed(`Atributo **${nome}** (${dado}) adicionado ao sistema!`)] })
    }
  },
}

export default command
