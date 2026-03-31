import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Calendar from '../components/Calendar';
import Stats from '../components/Stats';

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ server?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/');

  const discordId = (session.user as typeof session.user & { discordId: string }).discordId;
  const { server: guildId } = await searchParams;

  const user = await prisma.user.findUnique({
    where: { discordId },
    include: {
      servers: {
        include: { server: { include: { challenges: { where: { active: true } } } } },
      },
    },
  });

  if (!user) redirect('/');

  const memberships = user.servers;

  if (memberships.length === 0) {
    return (
      <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-tertiary)' }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: '420px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔍</div>
          <h1 style={{ marginBottom: '0.5rem' }}>No challenges found</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            You are not part of any active challenge server yet. Ask an admin to run{' '}
            <code>/start_push_up_challenge</code> in your Discord server.
          </p>
        </div>
      </main>
    );
  }

  const selectedMembership = guildId
    ? memberships.find(m => m.server.guildId === guildId)
    : memberships.length === 1
    ? memberships[0]
    : null;

  if (!selectedMembership) {
    return (
      <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-tertiary)' }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '2rem', minWidth: '320px' }}>
          <h1 style={{ marginBottom: '1rem' }}>Select a server</h1>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {memberships.map(({ server }) => (
              <li key={server.id}>
                <a
                  href={`/admin?server=${server.guildId}`}
                  style={{
                    display: 'block',
                    padding: '10px 14px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-normal)',
                    fontWeight: 500,
                  }}
                >
                  {server.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </main>
    );
  }

  const server = selectedMembership.server;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-tertiary)' }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        padding: '1rem',
        flexShrink: 0,
      }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 8px 12px', borderBottom: '1px solid var(--border)', marginBottom: '8px' }}>
          {server.name}
        </div>
        {memberships.length > 1 && (
          <a href="/admin" style={{ display: 'block', padding: '6px 8px', fontSize: '0.875rem', color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)' }}>
            ← Switch server
          </a>
        )}
        <div style={{ padding: '6px 8px', fontSize: '0.875rem', background: 'var(--bg-modifier)', borderRadius: 'var(--radius-sm)', color: 'var(--text-normal)', fontWeight: 500 }}>
          💪 Push-up Challenge
        </div>
        <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)', marginTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {session.user.image && (
              <img src={session.user.image} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
            )}
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-normal)' }}>{session.user.name}</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: '1.5rem 2rem', overflowY: 'auto' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Welcome back, {session.user.name}
        </p>

        <h2>Stats</h2>
        <Stats serverId={server.guildId} />

        <h2>Check-in Calendar</h2>
        <Calendar serverId={server.guildId} challengeType={server.challenges[0]?.type ?? 'pushup'} />
      </main>
    </div>
  );
}
