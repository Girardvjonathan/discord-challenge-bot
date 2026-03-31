import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { logSubmission } from './logSubmission';

export const data = new SlashCommandBuilder()
  .setName('log')
  .setDescription('Log your activity for today (type resolved from channel challenge)')
  .addIntegerOption(o =>
    o.setName('count')
      .setDescription('Amount to log')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(1000000)
  );

export async function handleLog(interaction: ChatInputCommandInteraction) {
  const count = interaction.options.getInteger('count', true);
  await logSubmission(interaction, null, count);
}
