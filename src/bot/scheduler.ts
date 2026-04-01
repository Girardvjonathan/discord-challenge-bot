import cron from 'node-cron';
import { Client } from 'discord.js';
import { postDailyResults } from './jobs/dailyResults';
import { sendDailyReminders } from './jobs/sendReminders';

export function scheduleDailyJobs(client: Client) {
  // Check every minute and send reminders to users whose notification time matches now
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mm = String(now.getUTCMinutes()).padStart(2, '0');
    const currentTime = `${hh}:${mm}`;
    await sendDailyReminders(client, currentTime);
  });

  // Post daily results at 5PM UTC
  cron.schedule('0 17 * * *', async () => {
    console.log('5PM — posting daily results...');
    await postDailyResults(client);
  });

  // Post weekly leaderboard every Sunday at 8PM
  cron.schedule('0 20 * * 0', async () => {
    console.log('Sunday 8PM — posting weekly leaderboard...');
    // TODO: query weekly totals and post leaderboard
  });

  // Post monthly leaderboard on the 1st of each month at 8PM
  cron.schedule('0 20 1 * *', async () => {
    console.log('1st of month — posting monthly leaderboard...');
    // TODO: query monthly totals and post leaderboard
  });
}
