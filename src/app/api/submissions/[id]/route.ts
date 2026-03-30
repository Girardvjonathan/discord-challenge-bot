import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/submissions/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const discordId = (session.user as typeof session.user & { discordId: string }).discordId;
  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { discordId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const submission = await prisma.submission.findUnique({ where: { id } });
  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Only allow deleting own submissions
  if (submission.userId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.submission.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
