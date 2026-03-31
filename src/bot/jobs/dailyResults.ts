import { Client, TextChannel } from 'discord.js';
import { prisma } from '../../lib/prisma';

export async function postDailyResults(client: Client) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const servers = await prisma.server.findMany({
    where: { challenges: { some: { active: true } } },
    include: { challenges: { where: { active: true }, take: 1 } },
  });

  for (const server of servers) {
    try {
      const challenge = server.challenges[0];
      if (!challenge || !server.channelId) continue;

      const channel = await client.channels.fetch(server.channelId) as TextChannel | null;
      if (!channel) continue;

      const members = await prisma.serverUser.findMany({
        where: { serverId: server.id },
        include: { user: true },
      });
      const memberIds = members.map(m => m.userId);

      if (challenge.type === 'any') {
        await postAnyResults(channel, challenge.name, memberIds, members, today);
        continue;
      }

      // Specific type challenge (pushup, situp, pullup, other)
      // "other" stores activity as challenge.name.toLowerCase()
      const resolvedType = challenge.type === 'other' ? challenge.name.toLowerCase() : challenge.type;

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

      if (ranked.length === 0) {
        await channel.send(`📭 No ${challenge.name.toLowerCase()} logged today. Get after it tomorrow!`);
        continue;
      }

      const lines = ranked.map((entry, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        return `${medal} **${entry.username}** — ${entry.total} ${challenge.name.toLowerCase()}`;
      });

      const grandTotal = ranked.reduce((sum, e) => sum + e.total, 0);

      await channel.send(
        `💪 **Today's ${challenge.name} Results**\n\n${lines.join('\n')}\n\n` +
        `**${ranked.length}** participant${ranked.length !== 1 ? 's' : ''} · **${grandTotal}** total`,
      );
    } catch (err) {
      console.error(`[dailyResults] error for server ${server.name}:`, err);
    }
  }
}

async function postAnyResults(
  channel: TextChannel,
  challengeName: string,
  memberIds: string[],
  members: { userId: string; user: { username: string } }[],
  today: Date,
) {
  // Today's logs ordered by most recently created
  const todayLogs = await prisma.activityLog.findMany({
    where: { userId: { in: memberIds }, date: today },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  });

  if (todayLogs.length === 0) {
    await channel.send(`📭 No activity logged today for **${challengeName}**. Get after it tomorrow!`);
    return;
  }

  // Distinct (userId, type) pairs = submission count
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

  // Global streak: all ActivityLog dates for each server member
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

    if (!dates.has(todayTime)) {
      return { username: m.user.username, streak: 0 };
    }

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

  await channel.send(
    `💪 **${challengeName} — Daily Update**\n\n` +
    `📊 **${submissionCount}** submission${submissionCount !== 1 ? 's' : ''} · **${participantCount}** participant${participantCount !== 1 ? 's' : ''}\n\n` +
    `🕐 **Recent activity**\n${recentLines.join('\n')}\n\n` +
    `🏆 **Streak Rankings**\n${leaderboardLines.join('\n')}`,
  );
}
