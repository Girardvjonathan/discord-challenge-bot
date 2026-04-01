import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.discordId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { discordId: session.user.discordId },
    select: { notificationsEnabled: true, notificationTime: true },
  });

  return NextResponse.json({
    notificationsEnabled: user?.notificationsEnabled ?? false,
    notificationTime: user?.notificationTime ?? '08:45',
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.discordId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { notificationsEnabled, notificationTime } = body;

  const data: Record<string, unknown> = {};
  if (typeof notificationsEnabled === 'boolean') data.notificationsEnabled = notificationsEnabled;
  if (typeof notificationTime === 'string' && /^\d{2}:\d{2}$/.test(notificationTime)) {
    data.notificationTime = notificationTime;
  }

  const user = await prisma.user.update({
    where: { discordId: session.user.discordId },
    data,
    select: { notificationsEnabled: true, notificationTime: true },
  });

  return NextResponse.json(user);
}
