import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import SignInButton from './components/SignInButton';

export default async function Home() {
  const session = await auth();
  if (session) redirect('/admin');

  return (
    <main>
      <h1>Discord Challenge Bot</h1>
      <p>Register with your Discord account to join the daily push-up challenge.</p>
      <SignInButton />
    </main>
  );
}
