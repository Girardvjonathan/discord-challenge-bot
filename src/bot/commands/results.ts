import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { postDailyResults } from '../jobs/dailyResults';

export const data = new SlashCommandBuilder()
  .setName('challenge_daily_result')
  .setDescription('Post today\'s results for this channel\'s challenge');

export async function handleResults(interaction: ChatInputCommandInteraction) {
  console.log(`[challenge_daily_result] user=${interaction.user.username} guild=${interaction.guildId} channel=${interaction.channelId}`);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    await postDailyResults(interaction.client, interaction.channelId);
    console.log(`[challenge_daily_result] results posted for channel=${interaction.channelId}`);
    await interaction.editReply('Results posted!');
  } catch (err) {
    console.error('[challenge_daily_result] error:', err);
    await interaction.editReply('Something went wrong posting the results.');
  }
}
