import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { postDailyResults } from '../jobs/dailyResults';

export const data = new SlashCommandBuilder()
  .setName('challenge_daily_result')
  .setDescription('Post today\'s results for this channel\'s challenge');

export async function handleResults(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    await postDailyResults(interaction.client, interaction.channelId);
    await interaction.editReply('Results posted!');
  } catch (err) {
    console.error('[results] error:', err);
    await interaction.editReply('Something went wrong posting the results.');
  }
}
