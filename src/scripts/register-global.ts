import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { commands } from './commands-list';

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token || !clientId) {
  console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env');
  process.exit(1);
}

const rest = new REST().setToken(token);

rest
  .put(Routes.applicationCommands(clientId), { body: commands })
  .then(() => console.log(`Registered ${commands.length} command(s) globally (may take up to 1 hour to propagate)`))
  .catch((err) => { console.error(err); process.exit(1); });
