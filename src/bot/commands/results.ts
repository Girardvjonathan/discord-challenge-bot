import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { postDailyResults } from '../jobs/dailyResults';

export const data = new SlashCommandBuilder()
  .setName('results')
  .setDescription('Manually post today\'s push-up results (for testing)');

export async function handleResults(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    await postDailyResults(interaction.client);
    await interaction.editReply('Results posted!');
  } catch (err) {
    console.error('[results] error:', err);
    await interaction.editReply('Something went wrong posting the results.');
  }
}
