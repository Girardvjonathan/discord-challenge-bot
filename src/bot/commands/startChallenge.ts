import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from 'discord.js';
import { prisma } from '../../lib/prisma';

const CHALLENGE_TYPES = [
  { name: 'Push-ups',       value: 'pushup',  command: '/pushup' },
  { name: 'Sit-ups',        value: 'situp',   command: '/situp'  },
  { name: 'Pull-ups',       value: 'pullup',  command: '/pullup' },
  { name: 'Any activities', value: 'any',     command: '/pushup, /situp, /pullup or /log' },
  { name: 'Other',          value: 'other',   command: '/log'    },
];

export const data = new SlashCommandBuilder()
  .setName('start_challenge')
  .setDescription('Start a daily challenge in this channel')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption(o =>
    o.setName('type')
      .setDescription('Type of challenge')
      .setRequired(true)
      .addChoices(
        { name: 'Push-ups',       value: 'pushup' },
        { name: 'Sit-ups',        value: 'situp'  },
        { name: 'Pull-ups',       value: 'pullup' },
        { name: 'Any activities', value: 'any'    },
        { name: 'Other',          value: 'other'  },
      )
  )
  .addStringOption(o =>
    o.setName('name')
      .setDescription('Custom activity name — required for "Other" (e.g. "Walking", "Steps")')
      .setRequired(false)
  );

export async function handleStartChallenge(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guildId = interaction.guildId!;
  const channel = interaction.channel as TextChannel;
  const type = interaction.options.getString('type', true);
  const customName = interaction.options.getString('name')?.trim();

  if (type === 'other' && !customName) {
    await interaction.editReply('Please provide a **name** for your custom challenge (e.g. `Walking`, `Steps`).');
    return;
  }

  const typeInfo = CHALLENGE_TYPES.find(t => t.value === type)!;
  const displayName = type === 'other' ? customName! : typeInfo.name;

  try {
    const server = await prisma.server.upsert({
      where: { guildId },
      update: { channelId: channel.id, channelName: channel.name },
      create: {
        guildId,
        name: interaction.guild!.name,
        channelId: channel.id,
        channelName: channel.name,
      },
    });

    const existing = await prisma.challenge.findFirst({ where: { serverId: server.id } });

    if (existing) {
      await prisma.challenge.update({
        where: { id: existing.id },
        data: { type, name: displayName, active: true },
      });
    } else {
      await prisma.challenge.create({
        data: { serverId: server.id, type, name: displayName, active: true },
      });
    }

    await interaction.editReply(
      `**${displayName}** challenge started! Results will be posted in <#${channel.id}> every day at 5 PM.`
    );

    const logInstruction = type === 'any'
      ? 'Use **/pushup**, **/situp**, **/pullup**, or **/log** each day to log any activity.'
      : `Use **${typeInfo.command} <count>** each day to log your ${displayName.toLowerCase()}.`;

    await channel.send(
      `🏋️ **Daily ${displayName} Challenge has started!**\n\n` +
      `${logInstruction}\n` +
      `Results are posted here every day at 5 PM and leaderboards every Sunday.\n\n` +
      `Register your account to track your full stats: ${process.env.NEXTAUTH_URL}`
    );
  } catch (err) {
    console.error('[startChallenge] error:', err);
    await interaction.editReply('Something went wrong starting the challenge. Please try again.');
  }
}
