import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Calendar from '../components/Calendar';
import Stats from '../components/Stats';

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user) redirect('/');

  const discordId = (session.user as typeof session.user & { discordId: string }).discordId;
  const user = await prisma.user.findUnique({ where: { discordId } });
  if (!user) redirect('/');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-tertiary)' }}>
      <header style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        padding: '0 1.5rem',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-normal)' }}>
          Dashboard
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {session.user.image && (
            <img src={session.user.image} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
          )}
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-normal)' }}>
            {session.user.name}
          </span>
        </div>
      </header>

      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <Stats />

        <h2 style={{ marginTop: '2rem', marginBottom: '0.75rem' }}>Check-in Calendar</h2>
        <Calendar />
      </main>
    </div>
  );
}
