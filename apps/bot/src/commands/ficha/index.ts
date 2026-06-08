import { SlashCommandBuilder } from 'discord.js'
import type { Command } from '../../types.js'
import { getCampaignByGuild, getMember, getOrCreateUser } from '../../lib/permissions.js'
import { sheetEmbed, errorEmbed, infoEmbed } from '../../lib/embeds.js'
import { prisma } from 'database'

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ficha')
    .setDescription('Gerencia sua ficha de personagem')
    .addSubcommand(s =>
      s.setName('ver')
        .setDescription('Exibe sua ficha de personagem'))
    .addSubcommand(s =>
      s.setName('criar')
        .setDescription('Cria sua ficha de personagem')
        .addStringOption(o => o.setName('nome').setDescription('Nome do personagem').setRequired(true))
        .addStringOption(o => o.setName('raca').setDescription('Raça do personagem'))
        .addStringOption(o => o.setName('classe').setDescription('Classe do personagem'))
        .addIntegerOption(o => o.setName('nivel').setDescription('Nível inicial').setMinValue(1).setMaxValue(20)))
    .addSubcommand(s =>
      s.setName('atributo')
        .setDescription('Define o valor de um atributo')
        .addStringOption(o => o.setName('nome').setDescription('Nome do atributo (ex: Carisma)').setRequired(true))
        .addIntegerOption(o => o.setName('valor').setDescription('Valor do modificador (ex: +4 = 4)').setRequired(true))
        .addStringOption(o => o.setName('dado').setDescription('Dado customizado (padrão do sistema se vazio)'))),

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

    if (sub === 'ver') {
      if (!member.character) return void await interaction.editReply({ embeds: [infoEmbed('Você ainda não tem ficha. Use `/ficha criar` para criar.')] })

      const attrs = member.character.attributes.map(a => ({
        name: a.attribute.name,
        value: a.value,
        defaultDie: a.customDie ?? a.attribute.defaultDie,
      }))

      await interaction.editReply({ embeds: [sheetEmbed(member.character, attrs)] })
    }

    if (sub === 'criar') {
      if (member.character) return void await interaction.editReply({ embeds: [errorEmbed('Você já tem uma ficha. Use `/ficha atributo` para editar atributos.')] })

      const nome = interaction.options.getString('nome', true)
      const raca = interaction.options.getString('raca') ?? undefined
      const classe = interaction.options.getString('classe') ?? undefined
      const nivel = interaction.options.getInteger('nivel') ?? 1

      await prisma.characterSheet.create({
        data: { name: nome, race: raca, class: classe, level: nivel, memberId: member.id },
      })

      await interaction.editReply({ embeds: [infoEmbed(`Ficha de **${nome}** criada! Use \`/ficha atributo\` para adicionar seus atributos.`)] })
    }

    if (sub === 'atributo') {
      if (!member.character) return void await interaction.editReply({ embeds: [errorEmbed('Crie sua ficha primeiro com `/ficha criar`.')] })

      const attrName = interaction.options.getString('nome', true)
      const value = interaction.options.getInteger('valor', true)
      const customDie = interaction.options.getString('dado') ?? undefined

      // Busca atributo pelo nome no sistema da campanha
      const sysAttr = campaign.system?.attributes.find(a =>
        a.name.toLowerCase() === attrName.toLowerCase()
      )

      if (!sysAttr) {
        const available = campaign.system?.attributes.map(a => a.name).join(', ')
        return void await interaction.editReply({
          embeds: [errorEmbed(`Atributo "${attrName}" não existe no sistema desta campanha.${available ? `\nDisponíveis: ${available}` : ''}`)]
        })
      }

      await prisma.characterAttribute.upsert({
        where: { sheetId_attributeId: { sheetId: member.character.id, attributeId: sysAttr.id } },
        update: { value, customDie: customDie ?? null },
        create: { sheetId: member.character.id, attributeId: sysAttr.id, value, customDie: customDie ?? null },
      })

      const sign = value >= 0 ? '+' : ''
      await interaction.editReply({ embeds: [infoEmbed(`**${sysAttr.name}** definido como ${sign}${value} (${customDie ?? sysAttr.defaultDie}).`)] })
    }
  },
}

export default command
