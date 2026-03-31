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

      // Get members of this server
      const members = await prisma.serverUser.findMany({
        where: { serverId: server.id },
        select: { userId: true },
      });
      const memberIds = members.map(m => m.userId);

      // Query activity logs matching challenge type
      // "other" challenges store the activity type as challenge.name.toLowerCase()
      const resolvedType = challenge.type === 'other' ? challenge.name.toLowerCase() : challenge.type;
      const activityFilter = resolvedType === 'any'
        ? { userId: { in: memberIds }, date: today }
        : { userId: { in: memberIds }, type: resolvedType, date: today };

      const logs = await prisma.activityLog.findMany({
        where: activityFilter,
        include: { user: true },
        orderBy: { count: 'desc' },
      });

      // For "any" challenges, aggregate all activities per user
      const byUser = new Map<string, { username: string; total: number; breakdown: string[] }>();
      for (const log of logs) {
        const entry = byUser.get(log.userId) ?? { username: log.user.username, total: 0, breakdown: [] };
        entry.total += log.count;
        entry.breakdown.push(`${log.count} ${log.type}`);
        byUser.set(log.userId, entry);
      }

      const ranked = [...byUser.values()].sort((a, b) => b.total - a.total);

      if (ranked.length === 0) {
        await channel.send(`📭 No ${challenge.name.toLowerCase()} logged today. Get after it tomorrow!`);
        continue;
      }

      const lines = ranked.map((entry, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        const detail = challenge.type === 'any'
          ? `${entry.total} total (${entry.breakdown.join(', ')})`
          : `${entry.total} ${challenge.name.toLowerCase()}`;
        return `${medal} **${entry.username}** — ${detail}`;
      });

      const grandTotal = ranked.reduce((sum, e) => sum + e.total, 0);

      await channel.send(
        `💪 **Today's ${challenge.name} Results**\n\n${lines.join('\n')}\n\n` +
        `**${ranked.length}** participant${ranked.length !== 1 ? 's' : ''} · **${grandTotal}** total`
      );
    } catch (err) {
      console.error(`[dailyResults] error for server ${server.name}:`, err);
    }
  }
}
