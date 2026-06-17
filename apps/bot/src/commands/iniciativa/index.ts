import { SlashCommandBuilder } from 'discord.js'
import type { Command } from '../../types.js'
import { getCampaignByGuild, getMember, getActiveSession } from '../../lib/permissions.js'
import { initiativeRollEmbed, initiativeOrderEmbed, errorEmbed, infoEmbed } from '../../lib/embeds.js'
import { roll } from '../../lib/dice.js'
import { prisma } from 'database'

const INIT_ATTR = 'Iniciativa'

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('iniciativa')
    .setDescription('Tracker de iniciativa da sessão atual')
    .addSubcommand(s =>
      s.setName('rolar')
        .setDescription('Rola sua iniciativa e entra na ordem de turno')
        .addIntegerOption(o =>
          o.setName('bonus')
            .setDescription('Bônus extra de iniciativa (opcional)')))
    .addSubcommand(s =>
      s.setName('ver')
        .setDescription('Mostra a ordem de iniciativa atual'))
    .addSubcommand(s =>
      s.setName('limpar')
        .setDescription('Reseta todas as iniciativas da sessão (somente Mestre)')),

  async execute(interaction) {
    await interaction.deferReply()
    const sub = interaction.options.getSubcommand()
    const guildId = interaction.guildId!
    const discordId = interaction.user.id

    const campaign = await getCampaignByGuild(guildId)
    if (!campaign) return void await interaction.editReply({ embeds: [errorEmbed('Nenhuma campanha registrada. Use `/campanha registrar`.')] })

    const session = await getActiveSession(campaign.id)
    if (!session) return void await interaction.editReply({ embeds: [errorEmbed('Não há sessão ativa no momento.')] })

    const member = await getMember(discordId, campaign.id)
    if (!member) return void await interaction.editReply({ embeds: [errorEmbed('Você não é membro desta campanha.')] })

    if (sub === 'rolar') {
      const bonus = interaction.options.getInteger('bonus') ?? 0

      // Try to find Destreza/Iniciativa modifier from character sheet
      let modifier = bonus
      if (member.character?.attributes) {
        const initAttr = member.character.attributes.find((a: { attribute: { name: string }; value: number }) =>
          ['destreza', 'iniciativa', 'dex', 'agilidade'].includes(
            a.attribute.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
          )
        )
        if (initAttr) modifier += initAttr.value
      }

      const result = roll(`d20${modifier >= 0 ? `+${modifier}` : `${modifier}`}`)
      const charName = member.character?.name ?? interaction.user.username

      // Save as a roll log entry so /iniciativa ver can read it
      await prisma.rollLog.create({
        data: {
          expression: 'd20',
          rolls: result.rolls,
          modifier,
          total: result.total,
          attribute: INIT_ATTR,
          rolledBy: charName,
          sessionId: session.id,
        },
      })

      await interaction.editReply({ embeds: [initiativeRollEmbed(charName, result.total, 'd20', modifier)] })
    }

    if (sub === 'ver') {
      const logs = await prisma.rollLog.findMany({
        where: { sessionId: session.id, attribute: INIT_ATTR },
        orderBy: { rolledAt: 'asc' },
      })

      // Keep only the last roll per character (by rolledBy)
      const latest = new Map<string, { name: string; total: number; rolledBy: string }>()
      for (const log of logs) {
        latest.set(log.rolledBy, { name: log.rolledBy, total: log.total, rolledBy: log.rolledBy })
      }

      await interaction.editReply({ embeds: [initiativeOrderEmbed(Array.from(latest.values()), session.name)] })
    }

    if (sub === 'limpar') {
      if (member.role !== 'GM') {
        return void await interaction.editReply({ embeds: [errorEmbed('Apenas o Mestre pode limpar a iniciativa.')] })
      }

      await prisma.rollLog.deleteMany({
        where: { sessionId: session.id, attribute: INIT_ATTR },
      })

      await interaction.editReply({ embeds: [infoEmbed('Iniciativa resetada. Todos podem rolar novamente.')] })
    }
  },

  async prefix(message, args) {
    const sub = args[0]?.toLowerCase()
    const guildId = message.guildId!
    const discordId = message.author.id

    const campaign = await getCampaignByGuild(guildId)
    if (!campaign) return void await message.reply({ embeds: [errorEmbed('Nenhuma campanha registrada.')] })

    const session = await getActiveSession(campaign.id)
    if (!session) return void await message.reply({ embeds: [errorEmbed('Sem sessão ativa.')] })

    const member = await getMember(discordId, campaign.id)
    if (!member) return void await message.reply({ embeds: [errorEmbed('Você não é membro desta campanha.')] })

    if (!sub || sub === 'rolar') {
      let modifier = 0
      if (member.character?.attributes) {
        const initAttr = member.character.attributes.find((a: { attribute: { name: string }; value: number }) =>
          ['destreza', 'iniciativa', 'dex', 'agilidade'].includes(
            a.attribute.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
          )
        )
        if (initAttr) modifier = initAttr.value
      }

      const result = roll(`d20${modifier >= 0 ? `+${modifier}` : `${modifier}`}`)
      const charName = member.character?.name ?? message.author.username

      await prisma.rollLog.create({
        data: {
          expression: 'd20',
          rolls: result.rolls,
          modifier,
          total: result.total,
          attribute: INIT_ATTR,
          rolledBy: charName,
          sessionId: session.id,
        },
      })

      return void await message.reply({ embeds: [initiativeRollEmbed(charName, result.total, 'd20', modifier)] })
    }

    if (sub === 'ver') {
      const logs = await prisma.rollLog.findMany({
        where: { sessionId: session.id, attribute: INIT_ATTR },
        orderBy: { rolledAt: 'asc' },
      })
      const latest = new Map<string, { name: string; total: number; rolledBy: string }>()
      for (const log of logs) {
        latest.set(log.rolledBy, { name: log.rolledBy, total: log.total, rolledBy: log.rolledBy })
      }
      return void await message.reply({ embeds: [initiativeOrderEmbed(Array.from(latest.values()), session.name)] })
    }
  },
}

export default command
