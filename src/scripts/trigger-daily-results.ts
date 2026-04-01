import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import { postDailyResults } from '../bot/jobs/dailyResults';

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async (c) => {
  console.log(`Logged in as ${c.user.tag}`);
  await postDailyResults(client);
  console.log('Done.');
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
