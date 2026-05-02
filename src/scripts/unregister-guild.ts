import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env');
  process.exit(1);
}

if (!guildId) {
  console.error('Missing DISCORD_GUILD_ID in .env');
  process.exit(1);
}

const rest = new REST().setToken(token);

rest
  .put(Routes.applicationGuildCommands(clientId, guildId), { body: [] })
  .then(() => console.log(`Cleared all commands from guild ${guildId}`))
  .catch((err) => { console.error(err); process.exit(1); });
