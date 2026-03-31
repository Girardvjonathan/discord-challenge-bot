'use client';

import { signIn } from 'next-auth/react';

export default function SignInButton() {
  return (
    <button
      className="primary"
      style={{ width: '100%', padding: '10px', fontSize: '1rem' }}
      onClick={() => signIn('discord', { callbackUrl: '/admin' })}
    >
      Sign in with Discord
    </button>
  );
}
