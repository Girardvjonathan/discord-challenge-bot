import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// GET /api/submissions?month=YYYY-MM
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const discordId = (session.user as typeof session.user & { discordId: string }).discordId;
  const month = req.nextUrl.searchParams.get('month');

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Invalid or missing month (expected YYYY-MM)' }, { status: 400 });
  }

  const [year, mon] = month.split('-').map(Number);
  const from = new Date(Date.UTC(year, mon - 1, 1));
  const to = new Date(Date.UTC(year, mon, 1));

  const user = await prisma.user.findUnique({ where: { discordId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const logs = await prisma.activityLog.findMany({
    where: { userId: user.id, date: { gte: from, lt: to } },
    select: { id: true, date: true, type: true, count: true },
    orderBy: { date: 'asc' },
  });

  return NextResponse.json({ submissions: logs });
}

// POST /api/submissions — create or update an activity log
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const discordId = (session.user as typeof session.user & { discordId: string }).discordId;
  const body = await req.json();
  const { date, count, type } = body;

  if (!date || !type || typeof count !== 'number' || count < 1 || count > 1000000) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { discordId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const day = new Date(date);
  day.setUTCHours(0, 0, 0, 0);

  const log = await prisma.activityLog.upsert({
    where: { userId_type_date: { userId: user.id, type, date: day } },
    update: { count },
    create: { userId: user.id, type, count, date: day },
  });

  return NextResponse.json({ submission: log });
}
