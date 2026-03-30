import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import dotenv from 'dotenv';
import { scheduleDailyJobs } from './scheduler';
import { prisma } from '../lib/prisma';

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

// Bootstrap server + challenge when bot is added to a guild
client.on('guildCreate', async (guild) => {
  try {
    const defaultChannel = guild.systemChannel ??
      guild.channels.cache.find(
        (c) => c.isTextBased() && c.permissionsFor(guild.members.me!)?.has('SendMessages')
      ) as TextChannel | undefined;

    await prisma.server.upsert({
      where: { guildId: guild.id },
      update: { name: guild.name, channelId: defaultChannel?.id, channelName: defaultChannel?.name },
      create: {
        guildId: guild.id,
        name: guild.name,
        channelId: defaultChannel?.id,
        channelName: defaultChannel?.name,
        challenges: { create: { type: 'pushup', active: true } },
      },
    });

    await defaultChannel?.send(
      `👋 **Push-up Challenge Bot is here!**\n\nUse **/pushup <count>** each day to log your push-ups. Results are posted at 5 PM and leaderboards every Sunday.\n\nRegister your account to track your stats: ${process.env.NEXTAUTH_URL}`
    );
  } catch (err) {
    console.error('[guildCreate] error:', err);
  }
});

// Mark server inactive when bot is removed, preserving history
client.on('guildDelete', async (guild) => {
  try {
    const server = await prisma.server.findUnique({ where: { guildId: guild.id } });
    if (!server) return;
    await prisma.challenge.updateMany({
      where: { serverId: server.id },
      data: { active: false },
    });
  } catch (err) {
    console.error('[guildDelete] error:', err);
  }
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
