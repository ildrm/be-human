'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { LifeOS, type TodayData } from '../../ui/life-os';

type Me = { user: { displayName: string; email: string } };
type SessionData = { me: Me; today: TodayData };
export function AuthenticatedToday() {
  const [session, setSession] = useState<SessionData | null>();
  useEffect(() => {
    Promise.all([api<Me>('auth/me'), api<{ data: TodayData }>('today')])
      .then(([me, today]) => setSession({ me, today: today.data }))
      .catch(() => setSession(null));
  }, []);
  if (session === undefined) return <main className="loading-shell"><span className="brand-mark">BH</span><p>Preparing your private space…</p></main>;
  if (session === null) return <main className="error-shell"><h1>Sign in to see your plan.</h1><p>Your personal data is never loaded into a public page.</p><Link className="button primary" href="/login">Sign in</Link></main>;
  return <LifeOS displayName={session.me.user.displayName} email={session.me.user.email} initialToday={session.today} />;
}
