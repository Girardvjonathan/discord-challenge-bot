import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import SignInButton from './components/SignInButton';

export default async function Home() {
  const session = await auth();
  if (session) redirect('/admin');

  return (
    <main style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg-tertiary)',
    }}>
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💪</div>
        <h1 style={{ marginBottom: '0.5rem' }}>Challenge Bot</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          Track your daily push-up challenges and compete with your community.
        </p>
        <SignInButton />
      </div>
    </main>
  );
}
