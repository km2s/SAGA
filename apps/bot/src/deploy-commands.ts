import 'dotenv/config'
import { REST, Routes } from 'discord.js'

import rolar from './commands/rolar/index.js'
import sessao from './commands/sessao/index.js'
import ficha from './commands/ficha/index.js'
import nota from './commands/nota/index.js'
import npc from './commands/npc/index.js'
import campanha from './commands/campanha/index.js'

const commands = [rolar, sessao, ficha, nota, npc, campanha].map(c => c.data.toJSON())

const rest = new REST().setToken(process.env.DISCORD_TOKEN!)

async function deploy() {
  const clientId = process.env.DISCORD_CLIENT_ID!
  const guildId = process.env.DISCORD_GUILD_ID

  try {
    console.log(`Registrando ${commands.length} comandos...`)

    if (guildId) {
      // Registro por servidor (instantâneo, ideal para testes)
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
      console.log(`✦ Comandos registrados no servidor ${guildId}`)
    } else {
      // Registro global (demora até 1h para propagar)
      await rest.put(Routes.applicationCommands(clientId), { body: commands })
      console.log('✦ Comandos registrados globalmente')
    }
  } catch (err) {
    console.error('Erro ao registrar comandos:', err)
    process.exit(1)
  }
}

deploy()
