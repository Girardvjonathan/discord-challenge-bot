import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// GET /api/stats?channelId=...
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const discordId = (session.user as typeof session.user & { discordId: string }).discordId;
  const discordChannelId = req.nextUrl.searchParams.get('channelId');

  const user = await prisma.user.findUnique({ where: { discordId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const channel = discordChannelId
    ? await prisma.channel.findUnique({ where: { discordChannelId } })
    : await prisma.channelUser.findFirst({ where: { userId: user.id }, include: { channel: true } }).then(r => r?.channel);

  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });

  const membership = await prisma.channelUser.findUnique({
    where: { userId_channelId: { userId: user.id, channelId: channel.id } },
  });
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!channel.challengeActive || !channel.challengeType) {
    return NextResponse.json({ totalCount: 0, checkIns: 0, thisMonth: 0, lastMonth: 0, delta: null, challengeName: '', history: [] });
  }

  const typeFilter = channel.challengeType === 'any'
    ? {}
    : channel.challengeType === 'other'
    ? { type: channel.challengeName!.toLowerCase() }
    : { type: channel.challengeType };

  const now = new Date();
  const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

  const [allTime, thisMonth, lastMonth, history] = await Promise.all([
    prisma.activityLog.aggregate({
      where: { userId: user.id, ...typeFilter },
      _sum: { count: true },
      _count: { id: true },
    }),
    prisma.activityLog.aggregate({
      where: { userId: user.id, ...typeFilter, date: { gte: thisMonthStart } },
      _sum: { count: true },
    }),
    prisma.activityLog.aggregate({
      where: { userId: user.id, ...typeFilter, date: { gte: lastMonthStart, lt: thisMonthStart } },
      _sum: { count: true },
    }),
    prisma.activityLog.findMany({
      where: { userId: user.id, ...typeFilter },
      select: { date: true, count: true, type: true },
      orderBy: { date: 'asc' },
    }),
  ]);

  const thisMonthTotal = thisMonth._sum.count ?? 0;
  const lastMonthTotal = lastMonth._sum.count ?? 0;
  const delta = lastMonthTotal === 0 ? null : Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100);

  return NextResponse.json({
    totalCount: allTime._sum.count ?? 0,
    checkIns: allTime._count.id,
    thisMonth: thisMonthTotal,
    lastMonth: lastMonthTotal,
    delta,
    challengeName: channel.challengeName ?? channel.challengeType,
    history: history.map(l => ({ date: l.date, count: l.count, type: l.type })),
  });
}
