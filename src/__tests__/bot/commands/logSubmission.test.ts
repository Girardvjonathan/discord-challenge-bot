import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../lib/prisma', () => ({
  prisma: {
    channel: { findUnique: vi.fn() },
    user: { upsert: vi.fn() },
    channelUser: { upsert: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    activityLog: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}));

import { logSubmission } from '../../../bot/commands/logSubmission';
import { prisma } from '../../../lib/prisma';

const mockUser = { id: 'user-cuid', discordId: 'discord-123', username: 'testuser', avatar: null };
const mockChannel = {
  id: 'channel-cuid',
  discordChannelId: 'discord-channel-1',
  challengeType: 'pushup',
  challengeName: 'Push-ups',
  challengeActive: true,
};

function makeInteraction(overrides: Record<string, unknown> = {}) {
  return {
    guildId: 'guild-123',
    channelId: 'discord-channel-1',
    user: { id: 'discord-123', username: 'testuser', avatar: null },
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    reply: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.user.upsert).mockResolvedValue(mockUser as any);
  vi.mocked(prisma.channelUser.upsert).mockResolvedValue({} as any);
  vi.mocked(prisma.channelUser.findMany).mockResolvedValue([]);
  vi.mocked(prisma.activityLog.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.activityLog.upsert).mockResolvedValue({} as any);
  vi.mocked(prisma.channel.findUnique).mockResolvedValue(mockChannel as any);
});

describe('logSubmission — DM interactions', () => {
  it('rejects /submit_challenge_activity (null type) in DMs', async () => {
    const interaction = makeInteraction({ guildId: null });
    await logSubmission(interaction, null, 10);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('challenge channel') }),
    );
    expect(interaction.deferReply).not.toHaveBeenCalled();
  });

  it('rejects DM submission when user has no channel enrollments', async () => {
    vi.mocked(prisma.channelUser.count).mockResolvedValue(0);
    const interaction = makeInteraction({ guildId: null });
    await logSubmission(interaction, 'pushup', 10);
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining('not enrolled'),
    );
    expect(prisma.activityLog.upsert).not.toHaveBeenCalled();
  });

  it('allows DM submission when user is already enrolled', async () => {
    vi.mocked(prisma.channelUser.count).mockResolvedValue(1);
    const interaction = makeInteraction({ guildId: null });
    await logSubmission(interaction, 'pushup', 10);
    expect(prisma.activityLog.upsert).toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining('pushup'),
    );
  });

  it('does not set ephemeral flag for DM replies', async () => {
    vi.mocked(prisma.channelUser.count).mockResolvedValue(1);
    const interaction = makeInteraction({ guildId: null });
    await logSubmission(interaction, 'pushup', 5);
    expect(interaction.deferReply).toHaveBeenCalledWith({});
  });
});

describe('logSubmission — type resolution from channel', () => {
  it('rejects when no active challenge and activityType is null', async () => {
    vi.mocked(prisma.channel.findUnique).mockResolvedValue({
      ...mockChannel,
      challengeActive: false,
    } as any);
    const interaction = makeInteraction();
    await logSubmission(interaction, null, 10);
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining('start_challenge'),
    );
    expect(prisma.activityLog.upsert).not.toHaveBeenCalled();
  });

  it('rejects "any" challenge type for /submit_challenge_activity and hints about type option', async () => {
    vi.mocked(prisma.channel.findUnique).mockResolvedValue({
      ...mockChannel,
      challengeType: 'any',
    } as any);
    const interaction = makeInteraction();
    await logSubmission(interaction, null, 10);
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining('type:'),
    );
    expect(prisma.activityLog.upsert).not.toHaveBeenCalled();
  });

  it('logs with explicit type in an "any" channel without rejection', async () => {
    vi.mocked(prisma.channel.findUnique).mockResolvedValue({
      ...mockChannel,
      challengeType: 'any',
    } as any);
    vi.mocked(prisma.channelUser.findMany).mockResolvedValue([
      { channel: { challengeActive: true, challengeType: 'any', challengeName: 'Fitness', id: 'ch-1' } },
    ] as any);
    const interaction = makeInteraction();
    await logSubmission(interaction, 'stretching', 15);
    expect(prisma.activityLog.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ type: 'stretching', count: 15 }),
      }),
    );
  });

  it('resolves activity type from challengeName for "other" challenges', async () => {
    vi.mocked(prisma.channel.findUnique).mockResolvedValue({
      ...mockChannel,
      challengeType: 'other',
      challengeName: 'Walking',
    } as any);
    const interaction = makeInteraction();
    await logSubmission(interaction, null, 10);
    expect(prisma.activityLog.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ type: 'walking' }),
      }),
    );
  });

  it('uses activityType directly when explicitly provided', async () => {
    const interaction = makeInteraction();
    await logSubmission(interaction, 'situp', 20);
    expect(prisma.activityLog.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ type: 'situp', count: 20 }),
      }),
    );
  });
});

describe('logSubmission — activity log upsert', () => {
  it('replies with "Logged" for a new entry', async () => {
    vi.mocked(prisma.activityLog.findUnique).mockResolvedValue(null);
    const interaction = makeInteraction();
    await logSubmission(interaction, 'pushup', 30);
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining('Logged'),
    );
  });

  it('replies with "Updated" when an entry already exists', async () => {
    vi.mocked(prisma.activityLog.findUnique).mockResolvedValue({ id: 'existing' } as any);
    const interaction = makeInteraction();
    await logSubmission(interaction, 'pushup', 50);
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining('Updated'),
    );
  });

  it('includes the stats link in the reply', async () => {
    const interaction = makeInteraction();
    await logSubmission(interaction, 'pushup', 10);
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining('/admin'),
    );
  });
});
