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

client.once('clientReady', async (c) => {
  console.log(`Bot online as ${c.user.tag}`);
  scheduleDailyJobs(c);
  await bootstrapGuilds(c);
});

async function announceGuild(guild: import('discord.js').Guild) {
  const defaultChannel = guild.systemChannel ??
    guild.channels.cache.find(
      (c) => c.isTextBased() && c.permissionsFor(guild.members.me!)?.has('SendMessages')
    ) as TextChannel | undefined;

  await defaultChannel?.send(
    `👋 **Challenge Bot is here!**\n\nAn admin can run **/start_challenge** in any channel to kick things off.`
  );
}

async function bootstrapGuilds(c: import('discord.js').Client<true>) {
  for (const guild of c.guilds.cache.values()) {
    console.log(`[bootstrap] connected to guild: ${guild.name}`);
  }
}

// Send welcome message when bot is added to a new guild
client.on('guildCreate', async (guild) => {
  try {
    await announceGuild(guild);
  } catch (err) {
    console.error('[guildCreate] error:', err);
  }
});

// Deactivate all challenge channels when bot is removed from a guild
client.on('guildDelete', async (guild) => {
  try {
    await prisma.channel.updateMany({
      where: { guildId: guild.id },
      data: { challengeActive: false },
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
  } else if (commandName === 'situp') {
    const { handleSitup } = await import('./commands/situp');
    await handleSitup(interaction);
  } else if (commandName === 'pullup') {
    const { handlePullup } = await import('./commands/pullup');
    await handlePullup(interaction);
  } else if (commandName === 'submit_challenge_activity') {
    const { handleLog } = await import('./commands/log');
    await handleLog(interaction);
  } else if (commandName === 'challenge_daily_result') {
    const { handleResults } = await import('./commands/results');
    await handleResults(interaction);
  } else if (commandName === 'start_challenge') {
    const { handleStartChallenge } = await import('./commands/startChallenge');
    await handleStartChallenge(interaction);
  } else if (commandName === 'open_my_challenge_stats') {
    const { handleOpenStats } = await import('./commands/openStats');
    await handleOpenStats(interaction);
  } else if (commandName === 'enable_challenge_notification') {
    const { handleEnableNotification } = await import('./commands/enableNotification');
    await handleEnableNotification(interaction);
  }
});

client.login(process.env.DISCORD_TOKEN);
