import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('pushup')
  .setDescription('Log your push-ups for today')
  .addIntegerOption((option) =>
    option
      .setName('count')
      .setDescription('Number of push-ups completed')
      .setRequired(true)
      .setMinValue(1)
  );

export async function handlePushup(interaction: ChatInputCommandInteraction) {
  const count = interaction.options.getInteger('count', true);

  // TODO: persist submission via Prisma
  await interaction.reply({
    content: `Logged ${count} push-ups for today! Keep it up!`,
    ephemeral: true,
  });
}
