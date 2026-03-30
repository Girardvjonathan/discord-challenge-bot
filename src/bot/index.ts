import { Client, GatewayIntentBits, Collection } from 'discord.js';
import dotenv from 'dotenv';
import { scheduleDailyJobs } from './scheduler';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
  ],
});

client.once('ready', () => {
  console.log(`Bot online as ${client.user?.tag}`);
  scheduleDailyJobs(client);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'pushup') {
    const { handlePushup } = await import('./commands/pushup');
    await handlePushup(interaction);
  }
});

client.login(process.env.DISCORD_TOKEN);
