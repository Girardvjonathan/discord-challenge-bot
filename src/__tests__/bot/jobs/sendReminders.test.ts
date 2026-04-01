import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../lib/prisma', () => ({
  prisma: {
    user: { findMany: vi.fn() },
    activityLog: { findMany: vi.fn() },
  },
}));

import { sendDailyReminders } from '../../../bot/jobs/sendReminders';
import { prisma } from '../../../lib/prisma';

const mockUsers = [
  { id: 'user-1', discordId: 'discord-1', username: 'alice', notificationsEnabled: true, notificationTime: '08:45' },
  { id: 'user-2', discordId: 'discord-2', username: 'bob',   notificationsEnabled: true, notificationTime: '08:45' },
];

function makeClient(sendFn = vi.fn().mockResolvedValue(undefined)) {
  return {
    users: {
      fetch: vi.fn().mockResolvedValue({ send: sendFn }),
    },
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('sendDailyReminders', () => {
  it('returns early when no users match the notification time', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    const client = makeClient();
    await sendDailyReminders(client, '08:45');
    expect(client.users.fetch).not.toHaveBeenCalled();
  });

  it('skips users who already logged today', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any);
    // Both users already logged
    vi.mocked(prisma.activityLog.findMany).mockResolvedValue([
      { userId: 'user-1' },
      { userId: 'user-2' },
    ] as any);
    const client = makeClient();
    await sendDailyReminders(client, '08:45');
    expect(client.users.fetch).not.toHaveBeenCalled();
  });

  it('sends DM only to users who have not logged today', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any);
    // Only user-1 has logged
    vi.mocked(prisma.activityLog.findMany).mockResolvedValue([
      { userId: 'user-1' },
    ] as any);
    const sendFn = vi.fn().mockResolvedValue(undefined);
    const client = makeClient(sendFn);
    await sendDailyReminders(client, '08:45');
    expect(client.users.fetch).toHaveBeenCalledTimes(1);
    expect(client.users.fetch).toHaveBeenCalledWith('discord-2');
    expect(sendFn).toHaveBeenCalledTimes(1);
  });

  it('continues sending to other users when one DM fails', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any);
    vi.mocked(prisma.activityLog.findMany).mockResolvedValue([]);
    const sendFn = vi.fn()
      .mockRejectedValueOnce(new Error('Cannot send DMs to this user'))
      .mockResolvedValueOnce(undefined);
    const client = makeClient(sendFn);
    await sendDailyReminders(client, '08:45');
    expect(sendFn).toHaveBeenCalledTimes(2);
  });

  it('sends reminders to all opted-in users when no time filter is given', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any);
    vi.mocked(prisma.activityLog.findMany).mockResolvedValue([]);
    const sendFn = vi.fn().mockResolvedValue(undefined);
    const client = makeClient(sendFn);
    await sendDailyReminders(client);
    expect(sendFn).toHaveBeenCalledTimes(2);
  });
});
