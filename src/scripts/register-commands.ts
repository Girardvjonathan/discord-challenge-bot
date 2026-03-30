import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { data as pushupCommand } from '../bot/commands/pushup';

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID; // optional: set for instant guild-scoped registration in dev

if (!token || !clientId) {
  console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env');
  process.exit(1);
}

const commands = [pushupCommand.toJSON()];
const rest = new REST().setToken(token);

async function register() {
  try {
    if (guildId) {
      // Guild-scoped: instant propagation, use during development
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      console.log(`Registered ${commands.length} command(s) to guild ${guildId}`);
    } else {
      // Global: up to 1 hour to propagate, use for production
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log(`Registered ${commands.length} command(s) globally`);
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

register();
