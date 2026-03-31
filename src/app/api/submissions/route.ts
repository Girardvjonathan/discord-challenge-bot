import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// GET /api/submissions?month=YYYY-MM&serverId=...
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const discordId = (session.user as typeof session.user & { discordId: string }).discordId;
  const { searchParams } = req.nextUrl;
  const month = searchParams.get('month');
  const guildId = searchParams.get('serverId');

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Invalid or missing month (expected YYYY-MM)' }, { status: 400 });
  }

  const [year, mon] = month.split('-').map(Number);
  const from = new Date(Date.UTC(year, mon - 1, 1));
  const to = new Date(Date.UTC(year, mon, 1));

  const user = await prisma.user.findUnique({ where: { discordId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const channel = guildId
    ? await prisma.channel.findUnique({ where: { guildId } })
    : await prisma.channelUser.findFirst({ where: { userId: user.id }, include: { channel: true } }).then(r => r?.channel);

  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });

  const membership = await prisma.channelUser.findUnique({
    where: { userId_channelId: { userId: user.id, channelId: channel.id } },
  });
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Build activity type filter based on challenge type
  const typeFilter = !channel.challengeActive || !channel.challengeType || channel.challengeType === 'any'
    ? {}
    : channel.challengeType === 'other'
    ? { type: channel.challengeName!.toLowerCase() }
    : { type: channel.challengeType };

  const logs = await prisma.activityLog.findMany({
    where: { userId: user.id, date: { gte: from, lt: to }, ...typeFilter },
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
  const { date, count, type, serverId: guildId } = body;

  if (!date || !type || typeof count !== 'number' || count < 1 || count > 1000000) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { discordId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const channel = guildId
    ? await prisma.channel.findUnique({ where: { guildId } })
    : await prisma.channelUser.findFirst({ where: { userId: user.id }, include: { channel: true } }).then(r => r?.channel);

  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });

  const membership = await prisma.channelUser.findUnique({
    where: { userId_channelId: { userId: user.id, channelId: channel.id } },
  });
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const day = new Date(date);
  day.setUTCHours(0, 0, 0, 0);

  const log = await prisma.activityLog.upsert({
    where: { userId_type_date: { userId: user.id, type, date: day } },
    update: { count },
    create: { userId: user.id, type, count, date: day },
  });

  return NextResponse.json({ submission: log });
}
