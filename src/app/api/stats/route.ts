import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// GET /api/stats?serverId=...
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const discordId = (session.user as typeof session.user & { discordId: string }).discordId;
  const guildId = req.nextUrl.searchParams.get('serverId');

  const user = await prisma.user.findUnique({ where: { discordId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const server = guildId
    ? await prisma.server.findUnique({ where: { guildId } })
    : await prisma.serverUser.findFirst({ where: { userId: user.id }, include: { server: true } }).then(r => r?.server);

  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 });

  const membership = await prisma.serverUser.findUnique({
    where: { userId_serverId: { userId: user.id, serverId: server.id } },
  });
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const challenge = await prisma.challenge.findFirst({ where: { serverId: server.id, active: true } });
  if (!challenge) return NextResponse.json({ totalPushups: 0, checkIns: 0, thisMonth: 0, lastMonth: 0, delta: null, history: [] });

  const now = new Date();
  const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

  const [allTime, thisMonth, lastMonth, history] = await Promise.all([
    // Total push-ups and check-ins all time
    prisma.submission.aggregate({
      where: { userId: user.id, challengeId: challenge.id },
      _sum: { count: true },
      _count: { id: true },
    }),
    // This month total
    prisma.submission.aggregate({
      where: { userId: user.id, challengeId: challenge.id, date: { gte: thisMonthStart } },
      _sum: { count: true },
    }),
    // Last month total
    prisma.submission.aggregate({
      where: { userId: user.id, challengeId: challenge.id, date: { gte: lastMonthStart, lt: thisMonthStart } },
      _sum: { count: true },
    }),
    // All submissions for chart
    prisma.submission.findMany({
      where: { userId: user.id, challengeId: challenge.id },
      select: { date: true, count: true },
      orderBy: { date: 'asc' },
    }),
  ]);

  const thisMonthTotal = thisMonth._sum.count ?? 0;
  const lastMonthTotal = lastMonth._sum.count ?? 0;
  const delta = lastMonthTotal === 0 ? null : Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100);

  return NextResponse.json({
    totalPushups: allTime._sum.count ?? 0,
    checkIns: allTime._count.id,
    thisMonth: thisMonthTotal,
    lastMonth: lastMonthTotal,
    delta,
    history: history.map(s => ({ date: s.date, count: s.count })),
  });
}
