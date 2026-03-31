import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { logSubmission } from './logSubmission';

export const data = new SlashCommandBuilder()
  .setName('pushup')
  .setDescription('Log your push-ups for today')
  .addIntegerOption(o =>
    o.setName('count').setDescription('Number of push-ups').setRequired(true).setMinValue(1).setMaxValue(10000)
  );

export async function handlePushup(interaction: ChatInputCommandInteraction) {
  const count = interaction.options.getInteger('count', true);
  console.log(`[pushup] user=${interaction.user.username} guild=${interaction.guildId} channel=${interaction.channelId} count=${count}`);
  await logSubmission(interaction, 'pushup', count);
}
