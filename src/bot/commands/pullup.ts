import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { logSubmission } from './logSubmission';

export const data = new SlashCommandBuilder()
  .setName('pullup')
  .setDescription('Log your pull-ups for today')
  .addIntegerOption(o =>
    o.setName('count').setDescription('Number of pull-ups').setRequired(true).setMinValue(1).setMaxValue(10000)
  );

export async function handlePullup(interaction: ChatInputCommandInteraction) {
  await logSubmission(interaction, 'pullup', interaction.options.getInteger('count', true));
}
