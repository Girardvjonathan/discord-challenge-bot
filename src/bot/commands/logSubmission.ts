import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { prisma } from '../../lib/prisma';

/**
 * Core logging logic used by all activity commands.
 *
 * activityType:
 *  - For /pushup, /situp, /pullup: pass the fixed type ("pushup" etc.)
 *  - For /log: pass null → resolved from the channel's challenge
 *
 * Challenge matching:
 *  - channel.challengeType === activityType      (e.g. "pushup" challenge + pushup activity)
 *  - channel.challengeType === "other" AND channel.challengeName.toLowerCase() === activityType
 *  - channel.challengeType === "any"             (matches everything)
 */
export async function logSubmission(
  interaction: ChatInputCommandInteraction,
  activityType: string | null,
  count: number,
) {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const channel = await prisma.channel.findUnique({
      where: { guildId: interaction.guildId },
    });

    // Resolve activity type from channel challenge when not explicitly provided
    let resolvedType: string;
    if (activityType !== null) {
      resolvedType = activityType;
    } else {
      if (!channel?.challengeActive || !channel.challengeType) {
        await interaction.editReply('No active challenge in this server. An admin needs to run **/start_challenge** first.');
        return;
      }
      if (channel.challengeType === 'any') {
        await interaction.editReply('This is an open challenge — please use a specific command: `/pushup`, `/situp`, or `/pullup`.');
        return;
      }
      // For "other" challenges, use the challenge name as the activity identifier
      resolvedType = channel.challengeType === 'other'
        ? channel.challengeName!.toLowerCase()
        : channel.challengeType;
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

    if (channel) {
      await prisma.channelUser.upsert({
        where: { userId_channelId: { userId: user.id, channelId: channel.id } },
        update: {},
        create: { userId: user.id, channelId: channel.id },
      });
    }

    // Log the activity
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const existing = await prisma.activityLog.findUnique({
      where: { userId_type_date: { userId: user.id, type: resolvedType, date: today } },
    });

    await prisma.activityLog.upsert({
      where: { userId_type_date: { userId: user.id, type: resolvedType, date: today } },
      update: { count },
      create: { userId: user.id, type: resolvedType, count, date: today },
    });

    // Find all active challenges across the user's channels that match this activity
    const memberships = await prisma.channelUser.findMany({
      where: { userId: user.id },
      include: { channel: true },
    });

    const matchingChannels = memberships
      .map(m => m.channel)
      .filter(ch => {
        if (!ch.challengeActive || !ch.challengeType) return false;
        if (ch.challengeType === 'any') return true;
        if (ch.challengeType === 'other') return ch.challengeName?.toLowerCase() === resolvedType;
        return ch.challengeType === resolvedType;
      });

    const action = existing ? 'Updated' : 'Logged';
    const challengeList = matchingChannels.length > 0
      ? `\nContributing to: ${matchingChannels.map(c => `**${c.challengeName}**`).join(', ')}`
      : '\n_No active challenges match this activity._';

    await interaction.editReply(
      `${action} **${count} ${resolvedType}** for today! Keep it up!${challengeList}`
    );
  } catch (err) {
    console.error('[logSubmission] error:', err);
    await interaction.editReply('Something went wrong saving your activity. Please try again.');
  }
}
