import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('open_my_challenge_stats')
  .setDescription('Get a link to your personal activity dashboard');

export async function handleOpenStats(interaction: ChatInputCommandInteraction) {
  const url = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  await interaction.reply({
    content: `📊 View your activity stats here: ${url}/admin`,
    flags: MessageFlags.Ephemeral,
  });
}
