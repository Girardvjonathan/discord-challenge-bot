import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user) redirect('/');

  const discordId = (session.user as typeof session.user & { discordId: string }).discordId;

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
        <p>You are not part of any active challenge server yet. Ask an admin to run <code>/start_push_up_challenge</code> in your Discord server.</p>
      </main>
    );
  }

  // Auto-select if only one server, otherwise show picker
  const server = memberships.length === 1 ? memberships[0].server : null;

  if (!server) {
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

  return (
    <main>
      <h1>{server.name} — Dashboard</h1>
      <p>Welcome, {session.user.name}!</p>
      {/* TODO: Calendar view, stats panel, leaderboard table */}
    </main>
  );
}
