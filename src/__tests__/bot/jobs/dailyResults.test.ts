import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../lib/prisma', () => ({
  prisma: {
    channel: { findMany: vi.fn(), update: vi.fn() },
    channelUser: { findMany: vi.fn() },
    activityLog: { findMany: vi.fn() },
  },
}));

import { postDailyResults } from '../../../bot/jobs/dailyResults';
import { prisma } from '../../../lib/prisma';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function makeChannel(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ch-1',
    name: 'fitness',
    discordChannelId: 'discord-ch-1',
    challengeType: 'any',
    challengeName: 'Fitness Challenge',
    challengeActive: true,
    lastDailyPostAt: null,
    ...overrides,
  };
}

function makeDiscordChannel() {
  const send = vi.fn().mockResolvedValue(undefined);
  return { send, id: 'discord-ch-1' };
}

function makeClient(discordChannel: ReturnType<typeof makeDiscordChannel>) {
  return {
    channels: { fetch: vi.fn().mockResolvedValue(discordChannel) },
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('postDailyResults — any challenge type', () => {
  it('posts "no activity" message when no logs today', async () => {
    const ch = makeChannel();
    vi.mocked(prisma.channel.findMany).mockResolvedValue([ch] as any);
    vi.mocked(prisma.channelUser.findMany).mockResolvedValue([
      { userId: 'u1', user: { username: 'alice' } },
    ] as any);
    vi.mocked(prisma.activityLog.findMany).mockResolvedValue([]);
    vi.mocked(prisma.channel.update).mockResolvedValue(ch as any);

    const discordCh = makeDiscordChannel();
    const client = makeClient(discordCh);
    await postDailyResults(client);

    expect(discordCh.send).toHaveBeenCalledTimes(1);
    expect(discordCh.send.mock.calls[0][0]).toContain('No activity logged today');
  });

  it('includes the current month name in the post title', async () => {
    const ch = makeChannel();
    vi.mocked(prisma.channel.findMany).mockResolvedValue([ch] as any);
    vi.mocked(prisma.channelUser.findMany).mockResolvedValue([
      { userId: 'u1', user: { username: 'alice' } },
    ] as any);
    // today logs
    vi.mocked(prisma.activityLog.findMany)
      .mockResolvedValueOnce([
        { userId: 'u1', type: 'run', count: 5, user: { username: 'alice' }, createdAt: new Date() },
      ] as any)
      // monthly logs
      .mockResolvedValueOnce([
        { userId: 'u1' },
      ] as any);
    vi.mocked(prisma.channel.update).mockResolvedValue(ch as any);

    const discordCh = makeDiscordChannel();
    const client = makeClient(discordCh);
    await postDailyResults(client);

    const currentMonth = MONTH_NAMES[new Date().getUTCMonth()];
    expect(discordCh.send.mock.calls[0][0]).toContain(currentMonth);
  });

  it('ranks users by monthly submission count descending', async () => {
    const ch = makeChannel();
    vi.mocked(prisma.channel.findMany).mockResolvedValue([ch] as any);
    vi.mocked(prisma.channelUser.findMany).mockResolvedValue([
      { userId: 'u1', user: { username: 'alice' } },
      { userId: 'u2', user: { username: 'bob' } },
    ] as any);
    vi.mocked(prisma.activityLog.findMany)
      // today's logs
      .mockResolvedValueOnce([
        { userId: 'u1', type: 'run', count: 3, user: { username: 'alice' }, createdAt: new Date() },
        { userId: 'u2', type: 'swim', count: 2, user: { username: 'bob' }, createdAt: new Date() },
      ] as any)
      // monthly logs — bob has 5 entries, alice has 2
      .mockResolvedValueOnce([
        { userId: 'u2' }, { userId: 'u2' }, { userId: 'u2' }, { userId: 'u2' }, { userId: 'u2' },
        { userId: 'u1' }, { userId: 'u1' },
      ] as any);
    vi.mocked(prisma.channel.update).mockResolvedValue(ch as any);

    const discordCh = makeDiscordChannel();
    const client = makeClient(discordCh);
    await postDailyResults(client);

    const msg: string = discordCh.send.mock.calls[0][0];
    const rankingsSection = msg.split('Rankings')[1] ?? '';
    const bobPos = rankingsSection.indexOf('bob');
    const alicePos = rankingsSection.indexOf('alice');
    expect(bobPos).toBeGreaterThan(-1);
    expect(alicePos).toBeGreaterThan(-1);
    expect(bobPos).toBeLessThan(alicePos); // bob ranked higher
    expect(rankingsSection).toContain('5 submissions'); // bob's count
    expect(rankingsSection).toContain('2 submissions'); // alice's count
  });

  it('excludes users with zero submissions this month from the leaderboard', async () => {
    const ch = makeChannel();
    vi.mocked(prisma.channel.findMany).mockResolvedValue([ch] as any);
    vi.mocked(prisma.channelUser.findMany).mockResolvedValue([
      { userId: 'u1', user: { username: 'alice' } },
      { userId: 'u2', user: { username: 'bob' } },
    ] as any);
    vi.mocked(prisma.activityLog.findMany)
      // today's logs — only alice logged today
      .mockResolvedValueOnce([
        { userId: 'u1', type: 'run', count: 3, user: { username: 'alice' }, createdAt: new Date() },
      ] as any)
      // monthly logs — only alice has submissions this month
      .mockResolvedValueOnce([
        { userId: 'u1' }, { userId: 'u1' },
      ] as any);
    vi.mocked(prisma.channel.update).mockResolvedValue(ch as any);

    const discordCh = makeDiscordChannel();
    const client = makeClient(discordCh);
    await postDailyResults(client);

    const msg: string = discordCh.send.mock.calls[0][0];
    expect(msg).toContain('alice');
    expect(msg).not.toContain('bob'); // bob has 0 submissions this month
  });
});
