import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { prisma } from '../../lib/prisma';

export const data = new SlashCommandBuilder()
  .setName('enable_challenge_notification')
  .setDescription('Toggle daily reminder DMs when you haven\'t logged yet')
  .addStringOption(o =>
    o.setName('setting')
      .setDescription('Turn notifications on or off')
      .setRequired(true)
      .addChoices(
        { name: 'On', value: 'on' },
        { name: 'Off', value: 'off' },
      )
  );

export async function handleEnableNotification(interaction: ChatInputCommandInteraction) {
  const setting = interaction.options.getString('setting', true);
  const enabled = setting === 'on';
  console.log(`[enable_challenge_notification] user=${interaction.user.username} setting=${setting}`);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    await prisma.user.upsert({
      where: { discordId: interaction.user.id },
      update: { notificationsEnabled: enabled, username: interaction.user.username, avatar: interaction.user.avatar },
      create: {
        discordId: interaction.user.id,
        username: interaction.user.username,
        avatar: interaction.user.avatar,
        notificationsEnabled: enabled,
      },
    });

    console.log(`[enable_challenge_notification] user=${interaction.user.username} notificationsEnabled=${enabled}`);

    await interaction.editReply(
      enabled
        ? '🔔 Daily reminders **enabled**. You\'ll get a DM each morning if you haven\'t logged yet. Set your preferred time in the dashboard.'
        : '🔕 Daily reminders **disabled**. You won\'t receive any more reminder DMs.'
    );
  } catch (err) {
    console.error('[enable_challenge_notification] error:', err);
    await interaction.editReply('Something went wrong updating your notification settings. Please try again.');
  }
}
