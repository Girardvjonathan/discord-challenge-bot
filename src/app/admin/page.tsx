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
      <main>
        <h1>No challenges found</h1>
        <p>
          You are not part of any active challenge server yet. Ask an admin to run{' '}
          <code>/start_push_up_challenge</code> in your Discord server.
        </p>
      </main>
    );
  }

  // Resolve server: from query param, or auto-select if only one
  const selectedMembership = guildId
    ? memberships.find(m => m.server.guildId === guildId)
    : memberships.length === 1
    ? memberships[0]
    : null;

  if (!selectedMembership) {
    return (
      <main>
        <h1>Select a server</h1>
        <ul>
          {memberships.map(({ server }) => (
            <li key={server.id}>
              <a href={`/admin?server=${server.guildId}`}>{server.name}</a>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  const server = selectedMembership.server;

  return (
    <main>
      <h1>{server.name} — Dashboard</h1>
      <p>Welcome, {session.user.name}!</p>
      <h2>Stats</h2>
      <Stats serverId={server.guildId} />
      <h2>Check-in Calendar</h2>
      <Calendar serverId={server.guildId} />
    </main>
  );
}
