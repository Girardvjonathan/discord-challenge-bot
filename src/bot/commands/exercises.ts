import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { logSubmission } from './logSubmission';

const EXERCISES = [
  { name: 'pushup', description: 'Log your push-ups for today',  label: 'push-ups' },
  { name: 'situp',  description: 'Log your sit-ups for today',   label: 'sit-ups'  },
  { name: 'pullup', description: 'Log your pull-ups for today',  label: 'pull-ups' },
] as const;

function buildCommand(exercise: typeof EXERCISES[number]) {
  return new SlashCommandBuilder()
    .setName(exercise.name)
    .setDescription(exercise.description)
    .addIntegerOption(o =>
      o.setName('count')
        .setDescription(`Number of ${exercise.label}`)
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(10000)
    );
}

async function handleExercise(interaction: ChatInputCommandInteraction, type: string) {
  const count = interaction.options.getInteger('count', true);
  console.log(`[${type}] user=${interaction.user.username} guild=${interaction.guildId} channel=${interaction.channelId} count=${count}`);
  await logSubmission(interaction, type, count);
}

export const pushupData = buildCommand(EXERCISES[0]);
export const situpData  = buildCommand(EXERCISES[1]);
export const pullupData = buildCommand(EXERCISES[2]);

export const handlePushup = (i: ChatInputCommandInteraction) => handleExercise(i, 'pushup');
export const handleSitup  = (i: ChatInputCommandInteraction) => handleExercise(i, 'situp');
export const handlePullup = (i: ChatInputCommandInteraction) => handleExercise(i, 'pullup');
