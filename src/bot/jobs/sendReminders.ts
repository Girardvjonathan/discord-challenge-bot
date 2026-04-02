import { Client } from 'discord.js';
import { prisma } from '../../lib/prisma';
import { withRetry } from '../utils/retry';

// Discord error code 50007 = user has DMs disabled — permanent, not worth retrying
const PERMANENT_DM_ERROR = 50007;

export async function sendDailyReminders(client: Client, currentTime?: string) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Find users with notifications enabled whose notification time matches now
  const where = currentTime
    ? { notificationsEnabled: true, notificationTime: currentTime }
    : { notificationsEnabled: true };

  const users = await prisma.user.findMany({ where });

  if (users.length === 0) return;
  console.log(`[sendReminders] ${currentTime ?? 'manual'} — ${users.length} user(s) to remind`);

  console.log(`[sendReminders] ${users.length} user(s) have notifications enabled`);

  // Find which of them have already logged something today
  const todayLogs = await prisma.activityLog.findMany({
    where: {
      userId: { in: users.map(u => u.id) },
      date: today,
    },
    select: { userId: true },
  });

  const loggedUserIds = new Set(todayLogs.map(l => l.userId));

  const toRemind = users.filter(u => !loggedUserIds.has(u.id));
  console.log(`[sendReminders] ${toRemind.length} user(s) haven't logged today`);

  const statsUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? 'http://localhost:3000';

  let sent = 0;
  let failed = 0;

  for (const user of toRemind) {
    await withRetry(async () => {
      const discordUser = await client.users.fetch(user.discordId);
      await discordUser.send(
        `👋 **Daily challenge reminder!**\n\n` +
        `You haven't logged any activity today yet. Don't break your streak!\n\n` +
        `Use **/pushup**, **/situp**, **/pullup**, or **/submit_challenge_activity** in your challenge channel.\n\n` +
        `📊 [View your stats](${statsUrl}/admin)`
      );
      console.log(`[sendReminders] DM sent to user=${user.username}`);
      sent++;
    }, { retries: 3, delayMs: 5000, label: `reminder user=${user.username}` })
      .catch((err: any) => {
        if (err?.code === PERMANENT_DM_ERROR) {
          console.warn(`[sendReminders] user=${user.username} has DMs disabled, skipping`);
        } else {
          console.warn(`[sendReminders] could not DM user=${user.username} after all retries: ${err?.message}`);
        }
        failed++;
      });
  }

  console.log(`[sendReminders] done — sent=${sent} failed=${failed}`);
}
