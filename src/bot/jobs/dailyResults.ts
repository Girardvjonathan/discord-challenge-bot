import { Client, TextChannel } from 'discord.js';
import { prisma } from '../../lib/prisma';
import { withRetry } from '../utils/retry';

/**
 * Posts daily results for all active challenge channels, or a specific one.
 * @param discordChannelId - When provided (e.g. from /results), only posts for that channel.
 */
export async function postDailyResults(client: Client, discordChannelId?: string) {
  console.log(`[dailyResults] starting — ${discordChannelId ? `channel=${discordChannelId}` : 'all active channels'}`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const channels = await prisma.channel.findMany({
    where: {
      challengeActive: true,
      ...(discordChannelId ? { discordChannelId } : {}),
    },
  });

  console.log(`[dailyResults] found ${channels.length} active channel(s)`);

  for (const ch of channels) {
    if (!ch.challengeType) {
      console.log(`[dailyResults] skipping channel=${ch.name} — no challengeType set`);
      continue;
    }

    // Skip if already posted today (guards against double-post on bot restart)
    if (ch.lastDailyPostAt && ch.lastDailyPostAt >= today) {
      console.log(`[dailyResults] skipping channel=${ch.name} — already posted today`);
      continue;
    }

    await withRetry(async () => {
      console.log(`[dailyResults] processing channel=${ch.name} type=${ch.challengeType}`);
      let discordChannel: TextChannel | null = null;
      try {
        discordChannel = await client.channels.fetch(ch.discordChannelId) as TextChannel | null;
      } catch (fetchErr: any) {
        const code = fetchErr?.code;
        if (code === 50001 || code === 10003) {
          console.warn(`[dailyResults] bot lost access to channel=${ch.discordChannelId} (code=${code}), deactivating`);
          // await prisma.channel.update({ where: { id: ch.id }, data: { challengeActive: false } });
          return; // permanent failure, don't retry
        }
        throw fetchErr; // transient — let withRetry handle it
      }
      if (!discordChannel) {
        console.warn(`[dailyResults] could not fetch discord channel=${ch.discordChannelId}, skipping`);
        return;
      }

      const members = await prisma.channelUser.findMany({
        where: { channelId: ch.id },
        include: { user: true },
      });
      const memberIds = members.map(m => m.userId);
      console.log(`[dailyResults] channel=${ch.name} has ${members.length} member(s)`);

      if (ch.challengeType === 'any') {
        await postAnyResults(discordChannel, ch.challengeName!, memberIds, members, today);
        await prisma.channel.update({ where: { id: ch.id }, data: { lastDailyPostAt: new Date() } });
        return;
      }

      // Specific type challenge (pushup, situp, pullup, other)
      const resolvedType = ch.challengeType === 'other'
        ? ch.challengeName!.toLowerCase()
        : ch.challengeType!;

      const logs = await prisma.activityLog.findMany({
        where: { userId: { in: memberIds }, type: resolvedType, date: today },
        include: { user: true },
        orderBy: { count: 'desc' },
      });

      const byUser = new Map<string, { username: string; total: number }>();
      for (const log of logs) {
        const entry = byUser.get(log.userId) ?? { username: log.user.username, total: 0 };
        entry.total += log.count;
        byUser.set(log.userId, entry);
      }

      const ranked = [...byUser.values()].sort((a, b) => b.total - a.total);

      console.log(`[dailyResults] channel=${ch.name} — ${ranked.length} participant(s) logged today`);
      if (ranked.length === 0) {
        await discordChannel.send(`📭 No ${ch.challengeName!.toLowerCase()} logged today. Get after it tomorrow!`);
        await prisma.channel.update({ where: { id: ch.id }, data: { lastDailyPostAt: new Date() } });
        return;
      }

      const lines = ranked.map((entry, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        return `${medal} **${entry.username}** — ${entry.total} ${ch.challengeName!.toLowerCase()}`;
      });

      const grandTotal = ranked.reduce((sum, e) => sum + e.total, 0);

      await discordChannel.send(
        `💪 **Today's ${ch.challengeName} Results**\n\n${lines.join('\n')}\n\n` +
        `**${ranked.length}** participant${ranked.length !== 1 ? 's' : ''} · **${grandTotal}** total`,
      );
      await prisma.channel.update({ where: { id: ch.id }, data: { lastDailyPostAt: new Date() } });
      console.log(`[dailyResults] posted results for channel=${ch.name} participants=${ranked.length} total=${grandTotal}`);
    }, { retries: 3, delayMs: 10000, label: `daily results channel=${ch.name}` })
      .catch(err => console.error(`[dailyResults] channel=${ch.name} failed after all retries:`, err));
  }
}

async function postAnyResults(
  discordChannel: TextChannel,
  challengeName: string,
  memberIds: string[],
  members: { userId: string; user: { username: string } }[],
  today: Date,
) {
  console.log(`[postAnyResults] challenge=${challengeName} members=${memberIds.length} date=${today.toISOString().slice(0, 10)}`);
  const todayLogs = await prisma.activityLog.findMany({
    where: { userId: { in: memberIds }, date: today },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`[postAnyResults] found ${todayLogs.length} log(s) today for challenge=${challengeName}`);
  if (todayLogs.length === 0) {
    await discordChannel.send(`📭 No activity logged today for **${challengeName}**. Get after it tomorrow!`);
    return;
  }

  const submissionCount = new Set(todayLogs.map(l => `${l.userId}:${l.type}`)).size;
  const participantCount = new Set(todayLogs.map(l => l.userId)).size;

  // Up to 5 recent entries, one per user where possible
  const seenUsers = new Set<string>();
  const featured: typeof todayLogs = [];
  for (const log of todayLogs) {
    if (!seenUsers.has(log.userId)) {
      featured.push(log);
      seenUsers.add(log.userId);
    }
    if (featured.length === 5) break;
  }
  if (featured.length < 5) {
    for (const log of todayLogs) {
      if (featured.length >= 5) break;
      if (!featured.includes(log)) featured.push(log);
    }
  }

  // Global streak: all ActivityLog dates for each channel member
  const allLogs = await prisma.activityLog.findMany({
    where: { userId: { in: memberIds } },
    select: { userId: true, date: true },
  });

  const datesByUser = new Map<string, Set<number>>();
  for (const log of allLogs) {
    if (!datesByUser.has(log.userId)) datesByUser.set(log.userId, new Set());
    datesByUser.get(log.userId)!.add(log.date.getTime());
  }

  const todayTime = today.getTime();

  const streaks = members.map(m => {
    const dates = datesByUser.get(m.userId) ?? new Set<number>();
    if (!dates.has(todayTime)) return { username: m.user.username, streak: 0 };

    let streak = 1;
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - 1);
    while (dates.has(d.getTime())) {
      streak++;
      d.setUTCDate(d.getUTCDate() - 1);
    }
    return { username: m.user.username, streak };
  });

  streaks.sort((a, b) => b.streak - a.streak || a.username.localeCompare(b.username));

  const top5 = streaks.slice(0, 5);
  let rank = 1;
  const leaderboardLines = top5.map((entry, i) => {
    if (i > 0 && top5[i - 1].streak !== entry.streak) rank = i + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
    const streakLabel = entry.streak === 0 ? '—' : `${entry.streak} day${entry.streak !== 1 ? 's' : ''}`;
    return `${medal} **${entry.username}** — ${streakLabel}`;
  });

  const recentLines = featured.map(l => `• **${l.user.username}** — ${l.count} ${l.type}`);

  console.log(`[postAnyResults] submissionCount=${submissionCount} participantCount=${participantCount} top streak=${top5[0]?.username}(${top5[0]?.streak}d)`);
  await discordChannel.send(
    `💪 **${challengeName} — Daily Update**\n\n` +
    `📊 **${submissionCount}** submission${submissionCount !== 1 ? 's' : ''} · **${participantCount}** participant${participantCount !== 1 ? 's' : ''}\n\n` +
    `🕐 **Recent activity**\n${recentLines.join('\n')}\n\n` +
    `🏆 **Streak Rankings**\n${leaderboardLines.join('\n')}`,
  );
}
