'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { api } from '../lib/api';

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const data = new FormData(event.currentTarget);
    try {
      await api(`auth/${mode}`, { method: 'POST', body: JSON.stringify({ email: data.get('email'), password: data.get('password') }) });
      router.replace('/app/today'); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not sign in.'); setBusy(false); }
  }
  return <main className="auth-shell"><section className="auth-card"><Link className="brand" href="/"><span className="brand-mark">BH</span><span>Be Human</span></Link><p className="eyebrow">Your private space</p><h1>{mode === 'login' ? 'Welcome back.' : 'Start gently.'}</h1><p className="lede">Your plan and personal context are private by default.</p><form className="setup-form" onSubmit={submit}><label className="field"><span>Email</span><input name="email" type="email" autoComplete="email" required /></label><label className="field"><span>Password</span><input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={12} maxLength={128} required /><small>Use at least 12 characters.</small></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button></form><button className="text-button" type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Create a new account' : 'I already have an account'}</button></section></main>;
}
