import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { prisma } from '../../lib/prisma';

export const data = new SlashCommandBuilder()
  .setName('pushup')
  .setDescription('Log your push-ups for today')
  .addIntegerOption((option) =>
    option
      .setName('count')
      .setDescription('Number of push-ups completed')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(10000)
  );

export async function handlePushup(interaction: ChatInputCommandInteraction) {
  const count = interaction.options.getInteger('count', true);
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const server = await prisma.server.findUnique({ where: { guildId } });

    if (!server) {
      await interaction.editReply('This server has not been set up yet. Please re-add the bot to initialize it.');
      return;
    }

    const challenge = await prisma.challenge.findFirst({
      where: { serverId: server.id, active: true },
    });

    if (!challenge) {
      await interaction.editReply('No active challenge found. An admin needs to run **/start_push_up_challenge** first.');
      return;
    }

    // Upsert user
    const user = await prisma.user.upsert({
      where: { discordId: interaction.user.id },
      update: { username: interaction.user.username, avatar: interaction.user.avatar },
      create: {
        discordId: interaction.user.id,
        username: interaction.user.username,
        avatar: interaction.user.avatar,
      },
    });

    // Ensure server membership is recorded
    await prisma.serverUser.upsert({
      where: { userId_serverId: { userId: user.id, serverId: server.id } },
      update: {},
      create: { userId: user.id, serverId: server.id },
    });

    // Today's date at midnight UTC for consistent daily grouping
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const existing = await prisma.submission.findUnique({
      where: { userId_challengeId_date: { userId: user.id, challengeId: challenge.id, date: today } },
    });

    await prisma.submission.upsert({
      where: { userId_challengeId_date: { userId: user.id, challengeId: challenge.id, date: today } },
      update: { count },
      create: { userId: user.id, challengeId: challenge.id, count, date: today },
    });

    const message = existing
      ? `Updated today's count to **${count} push-ups**. Keep it up!`
      : `Logged **${count} push-ups** for today! Keep it up!`;

    await interaction.editReply(message);
  } catch (err) {
    console.error('[pushup] error:', err);
    await interaction.editReply('Something went wrong saving your submission. Please try again.');
  }
}
