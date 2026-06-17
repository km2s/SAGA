import 'dotenv/config'
import { Client, Collection, GatewayIntentBits } from 'discord.js'
import type { Command } from './types.js'

import rolar from './commands/rolar/index.js'
import sessao from './commands/sessao/index.js'
import ficha from './commands/ficha/index.js'
import nota from './commands/nota/index.js'
import npc from './commands/npc/index.js'
import campanha from './commands/campanha/index.js'
import hp from './commands/hp/index.js'
import iniciativa from './commands/iniciativa/index.js'
import resumo from './commands/resumo/index.js'
import handout from './commands/handout/index.js'

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
})

const commands = new Collection<string, Command>()
const PREFIX = '+'

for (const cmd of [rolar, sessao, ficha, nota, npc, campanha, hp, iniciativa, resumo, handout]) {
  commands.set(cmd.data.name, cmd)
}

client.once('ready', () => {
  console.log(`✦ SAGA online como ${client.user?.tag}`)
})

// ── Slash commands ──────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return
  const command = commands.get(interaction.commandName)
  if (!command) return

  try {
    await command.execute(interaction)
  } catch (err) {
    console.error(`Erro no comando /${interaction.commandName}:`, err)
    const msg = { content: '❌ Ocorreu um erro ao executar esse comando.', ephemeral: true }
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg)
    } else {
      await interaction.reply(msg)
    }
  }
})

// ── Prefix commands (+rolar, +ficha, etc.) ──────────────────
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return

  const [rawCmd, ...args] = message.content.slice(PREFIX.length).trim().split(/\s+/)
  const cmdName = rawCmd.toLowerCase()
  const command = commands.get(cmdName)

  if (command?.prefix) {
    try {
      await command.prefix(message, args)
    } catch (err) {
      console.error(`Erro no comando +${cmdName}:`, err)
      await message.reply('❌ Ocorreu um erro ao executar esse comando.')
    }
  }
})

client.login(process.env.DISCORD_TOKEN)
