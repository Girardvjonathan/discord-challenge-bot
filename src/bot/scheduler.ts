import cron from 'node-cron';
import { Client } from 'discord.js';
import { postDailyResults } from './jobs/dailyResults';

export function scheduleDailyJobs(client: Client) {
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
