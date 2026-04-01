import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { data as pushupCommand } from '../bot/commands/pushup';
import { data as situpCommand } from '../bot/commands/situp';
import { data as pullupCommand } from '../bot/commands/pullup';
import { data as logCommand } from '../bot/commands/log';
import { data as resultsCommand } from '../bot/commands/results';
import { data as startChallengeCommand } from '../bot/commands/startChallenge';
import { data as openStatsCommand } from '../bot/commands/openStats';
import { data as enableNotificationCommand } from '../bot/commands/enableNotification';

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env');
  process.exit(1);
}

const commands = [
  pushupCommand.toJSON(),
  situpCommand.toJSON(),
  pullupCommand.toJSON(),
  logCommand.toJSON(),
  resultsCommand.toJSON(),
  startChallengeCommand.toJSON(),
  openStatsCommand.toJSON(),
  enableNotificationCommand.toJSON(),
];

const rest = new REST().setToken(token);

async function register() {
  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId!, guildId), { body: commands });
      console.log(`Registered ${commands.length} command(s) to guild ${guildId}`);
    } else {
      await rest.put(Routes.applicationCommands(clientId!), { body: commands });
      console.log(`Registered ${commands.length} command(s) globally`);
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

register();
