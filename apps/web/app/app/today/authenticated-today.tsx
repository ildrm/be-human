'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { LifeOS } from '../../ui/life-os';

type Me = { user: { displayName: string; email: string } };
export function AuthenticatedToday() {
  const [session, setSession] = useState<Me | null>();
  useEffect(() => { api<Me>('auth/me').then(setSession).catch(() => setSession(null)); }, []);
  if (session === undefined) return <main className="loading-shell"><span className="brand-mark">BH</span><p>Preparing your private space…</p></main>;
  if (session === null) return <main className="error-shell"><h1>Sign in to see your plan.</h1><p>Your personal data is never loaded into a public page.</p><Link className="button primary" href="/login">Sign in</Link></main>;
  return <LifeOS displayName={session.user.displayName} email={session.user.email} />;
}
