import { SlashCommandBuilder } from 'discord.js'
import type { Command } from '../../types.js'
import { roll, rollWithAdvantage, buildExpression, isDieExpression } from '../../lib/dice.js'
import { rollEmbed, advantageEmbed, errorEmbed } from '../../lib/embeds.js'
import { getOrCreateUser, getCampaignByGuild, getMember, getActiveSession } from '../../lib/permissions.js'
import { prisma } from 'database'

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('rolar')
    .setDescription('Rola dados com ou sem modificadores de atributo')
    .addStringOption(o =>
      o.setName('dado')
        .setDescription('Ex: d20, 2d6+3, carisma, forca')
        .setRequired(true))
    .addStringOption(o =>
      o.setName('modo')
        .setDescription('Vantagem ou desvantagem')
        .addChoices(
          { name: 'Vantagem (rola 2x, pega o maior)', value: 'vantagem' },
          { name: 'Desvantagem (rola 2x, pega o menor)', value: 'desvantagem' },
        )),

  async execute(interaction) {
    await interaction.deferReply()
    const input = interaction.options.getString('dado', true).toLowerCase().trim()
    const modo = interaction.options.getString('modo') as 'vantagem' | 'desvantagem' | null
    const guildId = interaction.guildId!
    const discordId = interaction.user.id
    const username = interaction.user.username

    try {
      const { expression, modifier, attributeName } = await resolveInput(input, discordId, username, guildId)
      const baseExpr = buildExpression(expression, modifier)

      if (modo) {
        const result = rollWithAdvantage(baseExpr, modo === 'vantagem' ? 'advantage' : 'disadvantage')
        const embed = advantageEmbed(result, username, attributeName)
        await saveRollLog(discordId, guildId, baseExpr, result.kept, attributeName)
        return void await interaction.editReply({ embeds: [embed] })
      }

      const result = roll(baseExpr)
      const embed = rollEmbed(result, username, attributeName)
      await saveRollLog(discordId, guildId, baseExpr, result, attributeName)
      await interaction.editReply({ embeds: [embed] })
    } catch (err) {
      await interaction.editReply({ embeds: [errorEmbed(String(err instanceof Error ? err.message : err))] })
    }
  },

  // +rolar carisma / +rolar d20 / +rolar 2d6+3 vantagem
  async prefix(message, args) {
    if (!args.length) return void await message.reply({ embeds: [errorEmbed('Informe o dado. Ex: `+rolar d20`, `+rolar carisma`')] })
    const input = args[0].toLowerCase()
    const modo = args[1]?.toLowerCase() as 'vantagem' | 'desvantagem' | undefined
    const guildId = message.guildId!
    const discordId = message.author.id
    const username = message.author.username

    try {
      const { expression, modifier, attributeName } = await resolveInput(input, discordId, username, guildId)
      const baseExpr = buildExpression(expression, modifier)

      if (modo === 'vantagem' || modo === 'desvantagem') {
        const result = rollWithAdvantage(baseExpr, modo === 'vantagem' ? 'advantage' : 'disadvantage')
        const embed = advantageEmbed(result, username, attributeName)
        await saveRollLog(discordId, guildId, baseExpr, result.kept, attributeName)
        return void await message.reply({ embeds: [embed] })
      }

      const result = roll(baseExpr)
      const embed = rollEmbed(result, username, attributeName)
      await saveRollLog(discordId, guildId, baseExpr, result, attributeName)
      await message.reply({ embeds: [embed] })
    } catch (err) {
      await message.reply({ embeds: [errorEmbed(String(err instanceof Error ? err.message : err))] })
    }
  },
}

async function resolveInput(input: string, discordId: string, username: string, guildId: string) {
  // Expressão de dado direta (d20, 2d6+3)
  if (isDieExpression(input)) {
    return { expression: input, modifier: 0, attributeName: undefined }
  }

  // Nome de atributo — busca na ficha do jogador
  const campaign = await getCampaignByGuild(guildId)
  if (!campaign) throw new Error('Este servidor não tem uma campanha registrada. Use `/campanha registrar`.')

  const user = await getOrCreateUser(discordId, username)
  const member = await getMember(discordId, campaign.id)
  if (!member?.character) throw new Error('Você não tem uma ficha de personagem nesta campanha.')

  const normalizedInput = input.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

  const attrEntry = member.character.attributes.find((a: { customDie: string | null; value: number; attribute: { name: string; defaultDie: string } }) =>
    a.attribute.name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() === normalizedInput
  )

  if (!attrEntry) {
    const available = member.character.attributes.map((a: { attribute: { name: string } }) => a.attribute.name).join(', ')
    throw new Error(`Atributo "${input}" não encontrado. Disponíveis: ${available || 'nenhum'}`)
  }

  const die = attrEntry.customDie ?? attrEntry.attribute.defaultDie
  return { expression: die, modifier: attrEntry.value, attributeName: attrEntry.attribute.name }
}

async function saveRollLog(discordId: string, guildId: string, expression: string, result: any, attribute?: string) {
  try {
    const campaign = await getCampaignByGuild(guildId)
    if (!campaign) return
    const session = await getActiveSession(campaign.id)
    if (!session) return

    const user = await prisma.user.findUnique({ where: { discordId } })
    if (!user) return

    await prisma.rollLog.create({
      data: {
        expression,
        rolls: result.rolls,
        modifier: result.modifier,
        total: result.total,
        attribute: attribute ?? null,
        rolledBy: user.username,
        sessionId: session.id,
      },
    })
  } catch { /* log não crítico */ }
}

export default command
