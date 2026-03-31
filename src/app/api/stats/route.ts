import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

function computeStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const dateSet = new Set(dates.map(d => d.getTime()));
  const todayTime = today.getTime();

  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayTime = yesterday.getTime();

  // Count from today if logged today, otherwise from yesterday
  let startTime: number;
  if (dateSet.has(todayTime)) {
    startTime = todayTime;
  } else if (dateSet.has(yesterdayTime)) {
    startTime = yesterdayTime;
  } else {
    return 0;
  }

  let streak = 1;
  const d = new Date(startTime);
  d.setUTCDate(d.getUTCDate() - 1);
  while (dateSet.has(d.getTime())) {
    streak++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return streak;
}

// GET /api/stats
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const discordId = (session.user as typeof session.user & { discordId: string }).discordId;
  const user = await prisma.user.findUnique({ where: { discordId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const now = new Date();
  const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

  const [allDates, thisMonthDates, lastMonthDates, activityTotals] = await Promise.all([
    prisma.activityLog.findMany({
      where: { userId: user.id },
      select: { date: true },
      distinct: ['date'],
    }),
    prisma.activityLog.findMany({
      where: { userId: user.id, date: { gte: thisMonthStart } },
      select: { date: true },
      distinct: ['date'],
    }),
    prisma.activityLog.findMany({
      where: { userId: user.id, date: { gte: lastMonthStart, lt: thisMonthStart } },
      select: { date: true },
      distinct: ['date'],
    }),
    prisma.activityLog.groupBy({
      by: ['type'],
      where: { userId: user.id },
      _sum: { count: true },
      orderBy: { _sum: { count: 'desc' } },
    }),
  ]);

  return NextResponse.json({
    streak: computeStreak(allDates.map(d => d.date)),
    totalCheckIns: allDates.length,
    thisMonthCheckIns: thisMonthDates.length,
    lastMonthCheckIns: lastMonthDates.length,
    activityTypes: activityTotals.map(t => ({ type: t.type, total: t._sum.count ?? 0 })),
  });
}
