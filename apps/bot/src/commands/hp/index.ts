import { SlashCommandBuilder } from 'discord.js'
import type { Command } from '../../types.js'
import { getCampaignByGuild, getMember } from '../../lib/permissions.js'
import { hpEmbed, errorEmbed } from '../../lib/embeds.js'
import { prisma } from 'database'

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('hp')
    .setDescription('Gerencia o HP do seu personagem')
    .addSubcommand(s =>
      s.setName('ver')
        .setDescription('Mostra o HP atual do seu personagem')
        .addUserOption(o =>
          o.setName('jogador')
            .setDescription('Ver HP de outro jogador (somente Mestre)')))
    .addSubcommand(s =>
      s.setName('atualizar')
        .setDescription('Atualiza o HP (ex: -5 dano, +3 cura, 20 define)')
        .addIntegerOption(o =>
          o.setName('valor')
            .setDescription('Quantidade: -5 (dano), +3 (cura), 20 (define diretamente)')
            .setRequired(true))
        .addUserOption(o =>
          o.setName('jogador')
            .setDescription('Modificar HP de outro jogador (somente Mestre)'))),

  async execute(interaction) {
    await interaction.deferReply()
    const sub = interaction.options.getSubcommand()
    const guildId = interaction.guildId!
    const discordId = interaction.user.id

    const campaign = await getCampaignByGuild(guildId)
    if (!campaign) return void await interaction.editReply({ embeds: [errorEmbed('Nenhuma campanha registrada. Use `/campanha registrar`.')] })

    const selfMember = await getMember(discordId, campaign.id)
    if (!selfMember) return void await interaction.editReply({ embeds: [errorEmbed('Você não é membro desta campanha.')] })

    const targetUser = interaction.options.getUser('jogador')
    let targetMember = selfMember

    if (targetUser) {
      if (selfMember.role !== 'GM') {
        return void await interaction.editReply({ embeds: [errorEmbed('Apenas o Mestre pode ver ou modificar o HP de outros jogadores.')] })
      }
      const found = await getMember(targetUser.id, campaign.id)
      if (!found) return void await interaction.editReply({ embeds: [errorEmbed(`${targetUser.username} não é membro desta campanha.`)] })
      targetMember = found
    }

    if (!targetMember.character) {
      return void await interaction.editReply({ embeds: [errorEmbed('Este jogador não tem ficha de personagem.')] })
    }

    const char = targetMember.character

    if (sub === 'ver') {
      return void await interaction.editReply({ embeds: [hpEmbed(char, null)] })
    }

    if (sub === 'atualizar') {
      const valor = interaction.options.getInteger('valor', true)

      // Positive or negative = delta. Value between 0 and maxHp could be ambiguous;
      // treat raw positive as delta (damage/heal), not absolute set.
      // To set absolute, use the exact value: since we can't distinguish easily,
      // positive = heal (add), negative = damage (subtract).
      const newHp = Math.max(0, Math.min(char.maxHp, char.hp + valor))
      const delta = newHp - char.hp

      await prisma.characterSheet.update({
        where: { id: char.id },
        data: { hp: newHp },
      })

      const updated = { ...char, hp: newHp }
      await interaction.editReply({ embeds: [hpEmbed(updated, delta)] })
    }
  },

  async prefix(message, args) {
    if (!args.length) return void await message.reply({ embeds: [errorEmbed('Use: `+hp ver` ou `+hp atualizar -5`')] })
    const sub = args[0].toLowerCase()
    const guildId = message.guildId!
    const discordId = message.author.id

    const campaign = await getCampaignByGuild(guildId)
    if (!campaign) return void await message.reply({ embeds: [errorEmbed('Nenhuma campanha registrada.')] })

    const member = await getMember(discordId, campaign.id)
    if (!member?.character) return void await message.reply({ embeds: [errorEmbed('Você não tem ficha nesta campanha.')] })

    const char = member.character

    if (sub === 'ver') {
      return void await message.reply({ embeds: [hpEmbed(char, null)] })
    }

    const valor = parseInt(args[1])
    if (isNaN(valor)) return void await message.reply({ embeds: [errorEmbed('Informe um valor. Ex: `+hp -5`')] })

    const newHp = Math.max(0, Math.min(char.maxHp, char.hp + valor))
    const delta = newHp - char.hp

    await prisma.characterSheet.update({ where: { id: char.id }, data: { hp: newHp } })
    await message.reply({ embeds: [hpEmbed({ ...char, hp: newHp }, delta)] })
  },
}

export default command
