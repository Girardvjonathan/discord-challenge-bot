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
  { name: 'Any activities', value: 'any',     command: '/pushup, /situp, /pullup or /submit_challenge_activity' },
  { name: 'Other',          value: 'other',   command: '/submit_challenge_activity' },
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
  const discordChannel = interaction.channel as TextChannel;
  const type = interaction.options.getString('type', true);
  const customName = interaction.options.getString('name')?.trim();
  console.log(`[start_challenge] user=${interaction.user.username} guild=${interaction.guildId} channel=${discordChannel.name} type=${type} customName=${customName ?? 'none'}`);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (type === 'other' && !customName) {
    console.log(`[start_challenge] rejected: 'other' type missing custom name`);
    await interaction.editReply('Please provide a **name** for your custom challenge (e.g. `Walking`, `Steps`).');
    return;
  }

  const typeInfo = CHALLENGE_TYPES.find(t => t.value === type)!;
  const displayName = type === 'other' ? customName! : typeInfo.name;

  try {
    await prisma.channel.upsert({
      where: { discordChannelId: discordChannel.id },
      update: {
        guildName: interaction.guild!.name,
        name: discordChannel.name,
        challengeType: type,
        challengeName: displayName,
        challengeActive: true,
      },
      create: {
        discordChannelId: discordChannel.id,
        guildId: interaction.guildId!,
        guildName: interaction.guild!.name,
        name: discordChannel.name,
        challengeType: type,
        challengeName: displayName,
        challengeActive: true,
      },
    });

    console.log(`[start_challenge] upserted channel=${discordChannel.id} name=${displayName} type=${type}`);
    await interaction.editReply(
      `**${displayName}** challenge started! Results will be posted in <#${discordChannel.id}> every day at 5 PM.`
    );

    const logInstruction = type === 'any'
      ? 'Use **/pushup**, **/situp**, **/pullup**, or **/submit_challenge_activity** each day to log any activity.'
      : `Use **${typeInfo.command} <count>** each day to log your ${displayName.toLowerCase()}.`;

    await discordChannel.send(
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
