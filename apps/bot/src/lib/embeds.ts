import { EmbedBuilder, Colors } from 'discord.js'
import type { RollResult, AdvantageResult } from './dice.js'

const GOLD = 0xC9A22A
const PURPLE = 0x7C3AED
const DANGER = 0xEF4444
const SUCCESS = 0x22C55E
const MUTED = 0x3D3D58

export function rollEmbed(result: RollResult, rolledBy: string, attributeName?: string): EmbedBuilder {
  const label = attributeName ? `Rolagem de ${attributeName}` : 'Rolagem de dado'

  let color = GOLD
  let titlePrefix = '🎲'
  let footer = ''

  if (result.isCritical) {
    color = 0xF0D060
    titlePrefix = '✦'
    footer = 'Crítico natural!'
  } else if (result.isCriticalFail) {
    color = DANGER
    titlePrefix = '💀'
    footer = 'Falha crítica!'
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${titlePrefix} ${rolledBy} — ${label}`)
    .addFields(
      { name: 'Resultado', value: `**${result.total}**`, inline: true },
      { name: 'Dado', value: result.expression, inline: true },
      { name: 'Rolados', value: `\`${result.rolls.join(', ')}\``, inline: true },
    )

  if (result.modifier !== 0) {
    embed.addFields({ name: 'Modificador', value: `${result.modifier > 0 ? '+' : ''}${result.modifier}`, inline: true })
  }
  if (footer) embed.setFooter({ text: footer })

  return embed
}

export function advantageEmbed(result: AdvantageResult, rolledBy: string, attributeName?: string): EmbedBuilder {
  const label = attributeName ? `Rolagem de ${attributeName}` : 'Rolagem de dado'
  const typeLabel = result.type === 'advantage' ? '⬆️ Vantagem' : '⬇️ Desvantagem'

  return new EmbedBuilder()
    .setColor(result.type === 'advantage' ? SUCCESS : DANGER)
    .setTitle(`🎲 ${rolledBy} — ${label} (${typeLabel})`)
    .addFields(
      { name: 'Resultado final', value: `**${result.kept.total}**`, inline: true },
      { name: 'Mantido', value: `\`${result.kept.rolls.join(', ')}\``, inline: true },
      { name: 'Descartado', value: `\`${result.discarded.rolls.join(', ')}\``, inline: true },
    )
}

export function sessionStartEmbed(sessionName: string, campaignName: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(SUCCESS)
    .setTitle('🟢 Sessão iniciada!')
    .setDescription(`**${sessionName || 'Nova sessão'}** em **${campaignName}** começou.`)
    .setFooter({ text: 'Use /sessao encerrar para finalizar' })
    .setTimestamp()
}

export function sessionEndEmbed(campaignName: string, duration: string, rollCount: number): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(MUTED)
    .setTitle('⏹ Sessão encerrada')
    .setDescription(`A sessão de **${campaignName}** foi encerrada.`)
    .addFields(
      { name: 'Duração', value: duration, inline: true },
      { name: 'Rolagens', value: `${rollCount}`, inline: true },
    )
    .setTimestamp()
}

export function sheetEmbed(character: {
  name: string; race?: string | null; class?: string | null
  level: number; hp: number; maxHp: number
}, attributes: Array<{ name: string; value: number; defaultDie: string }>): EmbedBuilder {
  const attrLines = attributes.map(a =>
    `**${a.name}** — ${a.defaultDie} ${a.value >= 0 ? '+' : ''}${a.value}`
  ).join('\n')

  return new EmbedBuilder()
    .setColor(PURPLE)
    .setTitle(`📋 ${character.name}`)
    .setDescription(`${character.race ?? ''} · ${character.class ?? ''} · Nível ${character.level}`)
    .addFields(
      { name: 'HP', value: `${character.hp}/${character.maxHp}`, inline: true },
      { name: 'Atributos', value: attrLines || 'Nenhum atributo configurado.' },
    )
}

export function npcEmbed(npc: {
  name: string; description?: string | null; type: string
  attributes: Array<{ name: string; value: number }>
}): EmbedBuilder {
  const attrLines = npc.attributes.map(a =>
    `**${a.name}** — ${a.value >= 0 ? '+' : ''}${a.value}`
  ).join('\n')

  return new EmbedBuilder()
    .setColor(GOLD)
    .setTitle(`⚔️ ${npc.name}`)
    .setDescription(npc.description ?? '_Sem descrição._')
    .addFields(
      { name: 'Tipo', value: npc.type, inline: true },
      ...(attrLines ? [{ name: 'Atributos', value: attrLines }] : []),
    )
}

export function errorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(DANGER).setDescription(`❌ ${message}`)
}

export function infoEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(GOLD).setDescription(`ℹ️ ${message}`)
}

export function hpEmbed(character: {
  name: string; hp: number; maxHp: number
}, delta: number | null): EmbedBuilder {
  const pct = character.maxHp > 0 ? character.hp / character.maxHp : 0
  const bars = 10
  const filled = Math.round(pct * bars)
  const bar = '█'.repeat(filled) + '░'.repeat(bars - filled)
  const color = pct > 0.5 ? SUCCESS : pct > 0.25 ? 0xF59E0B : DANGER

  const desc = delta !== null
    ? `${delta > 0 ? `+${delta} curado` : `${delta} de dano`} → **${character.hp}/${character.maxHp}**`
    : `**${character.hp}/${character.maxHp}**`

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`❤️ ${character.name}`)
    .setDescription(`\`${bar}\`\n${desc}`)
}

export function initiativeRollEmbed(name: string, result: number, die: string, modifier: number): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(GOLD)
    .setTitle(`⚡ ${name} — Iniciativa`)
    .addFields(
      { name: 'Resultado', value: `**${result}**`, inline: true },
      { name: 'Dado', value: die, inline: true },
      ...(modifier !== 0 ? [{ name: 'Modificador', value: `${modifier >= 0 ? '+' : ''}${modifier}`, inline: true }] : []),
    )
}

export function initiativeOrderEmbed(
  entries: { name: string; total: number; rolledBy: string }[],
  sessionName: string | null,
): EmbedBuilder {
  const sorted = [...entries].sort((a, b) => b.total - a.total)
  const lines = sorted.map((e, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`
    return `${medal} **${e.name}** — ${e.total}`
  })

  return new EmbedBuilder()
    .setColor(PURPLE)
    .setTitle(`⚡ Ordem de Iniciativa${sessionName ? ` · ${sessionName}` : ''}`)
    .setDescription(lines.length > 0 ? lines.join('\n') : '_Nenhuma iniciativa registrada nesta sessão._')
}

export function summaryEmbed(summary: {
  content: string; createdAt: Date | string
}, sessionName: string | null): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(MUTED)
    .setTitle(`📜 Resumo${sessionName ? ` — ${sessionName}` : ' da última sessão'}`)
    .setDescription(summary.content.slice(0, 4096))
    .setTimestamp(new Date(summary.createdAt))
}

export function handoutListEmbed(
  handouts: { id: string; title: string | null; createdAt: Date | string }[],
): EmbedBuilder {
  if (handouts.length === 0) {
    return new EmbedBuilder()
      .setColor(MUTED)
      .setDescription('📭 Nenhum handout compartilhado com você.')
  }
  const lines = handouts.map((h, i) =>
    `**${i + 1}.** ${h.title ?? '_(sem título)_'} — <t:${Math.floor(new Date(h.createdAt).getTime() / 1000)}:d>`
  )
  return new EmbedBuilder()
    .setColor(PURPLE)
    .setTitle('📋 Seus Handouts')
    .setDescription(lines.join('\n'))
    .setFooter({ text: 'Use /handout ver [número] para ver o conteúdo' })
}

export function handoutDetailEmbed(handout: {
  title: string | null; content: string | null; imageUrl: string | null
  createdAt: Date | string; sharedBy: { user: { username: string } }
}): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(PURPLE)
    .setTitle(handout.title ?? '📋 Handout')
    .setFooter({ text: `Compartilhado por ${handout.sharedBy.user.username}` })
    .setTimestamp(new Date(handout.createdAt))

  if (handout.content) embed.setDescription(handout.content.slice(0, 4096))
  if (handout.imageUrl) embed.setImage(handout.imageUrl)

  return embed
}
