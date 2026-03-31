import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { logSubmission } from './logSubmission';

export const data = new SlashCommandBuilder()
  .setName('situp')
  .setDescription('Log your sit-ups for today')
  .addIntegerOption(o =>
    o.setName('count').setDescription('Number of sit-ups').setRequired(true).setMinValue(1).setMaxValue(10000)
  );

export async function handleSitup(interaction: ChatInputCommandInteraction) {
  const count = interaction.options.getInteger('count', true);
  console.log(`[situp] user=${interaction.user.username} guild=${interaction.guildId} channel=${interaction.channelId} count=${count}`);
  await logSubmission(interaction, 'situp', count);
}
