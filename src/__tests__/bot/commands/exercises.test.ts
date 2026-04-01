import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../lib/prisma', () => ({
  prisma: {
    channel: { findUnique: vi.fn() },
    user: { upsert: vi.fn() },
    channelUser: { upsert: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    activityLog: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}));

import { pushupData, situpData, pullupData } from '../../../bot/commands/exercises';

describe('exercise command builders', () => {
  it.each([
    ['pushup', pushupData, 'Log your push-ups for today'],
    ['situp',  situpData,  'Log your sit-ups for today'],
    ['pullup', pullupData, 'Log your pull-ups for today'],
  ])('%s command has correct name and description', (name, data, description) => {
    const json = data.toJSON();
    expect(json.name).toBe(name);
    expect(json.description).toBe(description);
  });

  it.each([
    ['pushup', pushupData],
    ['situp',  situpData],
    ['pullup', pullupData],
  ])('%s command has a required integer count option (1–10000)', (_name, data) => {
    const json = data.toJSON() as any;
    const count = json.options?.[0];
    expect(count).toBeDefined();
    expect(count.name).toBe('count');
    expect(count.type).toBe(4); // INTEGER
    expect(count.required).toBe(true);
    expect(count.min_value).toBe(1);
    expect(count.max_value).toBe(10000);
  });
});
