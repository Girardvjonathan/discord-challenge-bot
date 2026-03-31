import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// GET /api/activity-types — distinct activity types the user has logged
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const discordId = (session.user as typeof session.user & { discordId: string }).discordId;
  const user = await prisma.user.findUnique({ where: { discordId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const rows = await prisma.activityLog.findMany({
    where: { userId: user.id },
    select: { type: true },
    distinct: ['type'],
    orderBy: { type: 'asc' },
  });

  return NextResponse.json({ types: rows.map(r => r.type) });
}
