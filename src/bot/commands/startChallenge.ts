import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from 'discord.js';
import { prisma } from '../../lib/prisma';

export const data = new SlashCommandBuilder()
  .setName('start_push_up_challenge')
  .setDescription('Start the daily push-up challenge in this channel')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function handleStartChallenge(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guildId = interaction.guildId!;
  const channel = interaction.channel as TextChannel;

  try {
    const server = await prisma.server.upsert({
      where: { guildId },
      update: { channelId: channel.id, channelName: channel.name },
      create: {
        guildId,
        name: interaction.guild!.name,
        channelId: channel.id,
        channelName: channel.name,
      },
    });

    const existing = await prisma.challenge.findFirst({
      where: { serverId: server.id },
    });

    if (existing) {
      await prisma.challenge.update({
        where: { id: existing.id },
        data: { active: true },
      });
    } else {
      await prisma.challenge.create({
        data: { serverId: server.id, type: 'pushup', active: true },
      });
    }

    await interaction.editReply(`Challenge started! Results will be posted in <#${channel.id}> every day at 5 PM.`);

    await channel.send(
      `🏋️ **Daily Push-up Challenge has started!**\n\n` +
      `Use **/pushup <count>** each day to log your push-ups.\n` +
      `Results are posted here every day at 5 PM and leaderboards every Sunday.\n\n` +
      `Register your account to track your full stats: ${process.env.NEXTAUTH_URL}`
    );
  } catch (err) {
    console.error('[startChallenge] error:', err);
    await interaction.editReply('Something went wrong starting the challenge. Please try again.');
  }
}
