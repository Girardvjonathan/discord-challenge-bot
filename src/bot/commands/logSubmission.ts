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
 *  - challenge.type === activityType      (e.g. "pushup" challenge + pushup activity)
 *  - challenge.type === "other" AND challenge.name.toLowerCase() === activityType
 *  - challenge.type === "any"             (matches everything)
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
    const server = await prisma.server.findUnique({
      where: { guildId: interaction.guildId },
      include: { challenges: { where: { active: true }, take: 1 } },
    });

    // Resolve activity type from channel challenge when not explicitly provided
    let resolvedType = activityType;
    if (resolvedType === null) {
      const challenge = server?.challenges[0];
      if (!challenge) {
        await interaction.editReply('No active challenge in this server. An admin needs to run **/start_challenge** first.');
        return;
      }
      if (challenge.type === 'any') {
        await interaction.editReply('This is an open challenge — please specify an activity type: `/log type:walking count:5000`');
        return;
      }
      // For "other" challenges, use the challenge name as the activity identifier
      resolvedType = challenge.type === 'other'
        ? challenge.name.toLowerCase()
        : challenge.type;
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

    if (server) {
      await prisma.serverUser.upsert({
        where: { userId_serverId: { userId: user.id, serverId: server.id } },
        update: {},
        create: { userId: user.id, serverId: server.id },
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

    // Find all active challenges across the user's servers that match this activity
    const memberships = await prisma.serverUser.findMany({
      where: { userId: user.id },
      include: {
        server: {
          include: { challenges: { where: { active: true } } },
        },
      },
    });

    const matchingChallenges = memberships.flatMap(m =>
      m.server.challenges.filter(c => {
        if (c.type === 'any') return true;
        if (c.type === 'other') return c.name.toLowerCase() === resolvedType;
        return c.type === resolvedType;
      })
    );

    const action = existing ? 'Updated' : 'Logged';
    const challengeList = matchingChallenges.length > 0
      ? `\nContributing to: ${matchingChallenges.map(c => `**${c.name}**`).join(', ')}`
      : '\n_No active challenges match this activity._';

    await interaction.editReply(
      `${action} **${count} ${resolvedType}** for today! Keep it up!${challengeList}`
    );
  } catch (err) {
    console.error('[logSubmission] error:', err);
    await interaction.editReply('Something went wrong saving your activity. Please try again.');
  }
}
