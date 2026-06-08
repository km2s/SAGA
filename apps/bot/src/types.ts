import type { ChatInputCommandInteraction, Message, SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from 'discord.js'

export interface Command {
  data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>
  prefix?: (message: Message, args: string[]) => Promise<void>
}
