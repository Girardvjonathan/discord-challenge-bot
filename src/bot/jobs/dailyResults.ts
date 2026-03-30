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

      const submissions = await prisma.submission.findMany({
        where: { challengeId: challenge.id, date: today },
        include: { user: true },
        orderBy: { count: 'desc' },
      });

      const channel = await client.channels.fetch(server.channelId) as TextChannel | null;
      if (!channel) continue;

      if (submissions.length === 0) {
        await channel.send(`📭 No push-ups logged today. Get after it tomorrow!`);
        continue;
      }

      const lines = submissions.map((s, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        return `${medal} **${s.user.username}** — ${s.count} push-ups`;
      });

      const total = submissions.reduce((sum, s) => sum + s.count, 0);

      await channel.send(
        `💪 **Today's Push-up Results**\n\n${lines.join('\n')}\n\n` +
        `**${submissions.length}** participant${submissions.length !== 1 ? 's' : ''} · **${total}** total push-ups`
      );
    } catch (err) {
      console.error(`[dailyResults] error for server ${server.name}:`, err);
    }
  }
}
