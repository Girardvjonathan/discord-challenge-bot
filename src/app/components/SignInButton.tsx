'use client';

import { signIn } from 'next-auth/react';

export default function SignInButton() {
  return (
    <button onClick={() => signIn('discord', { callbackUrl: '/admin' })}>
      Sign in with Discord
    </button>
  );
}
