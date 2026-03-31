import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// GET /api/activity-history?type=pushup
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const discordId = (session.user as typeof session.user & { discordId: string }).discordId;
  const type = req.nextUrl.searchParams.get('type');

  if (!type) return NextResponse.json({ error: 'Missing type' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { discordId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const history = await prisma.activityLog.findMany({
    where: { userId: user.id, type },
    select: { date: true, count: true },
    orderBy: { date: 'asc' },
  });

  return NextResponse.json({
    history: history.map(l => ({ date: l.date, count: l.count })),
  });
}
