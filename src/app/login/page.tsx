'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase/client';
import { friendlyAuthError } from '@/lib/auth-errors';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/app';

  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setInfo(null); setBusy(true);
    try {
      const cred = await signInWithEmailAndPassword(getClientAuth(), email, password);
      const idToken = await cred.user.getIdToken();
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Could not create session');
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(friendlyAuthError(msg));
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setInfo(null); setBusy(true);
    try {
      if (!email.trim()) throw new Error('auth/missing-email');
      await sendPasswordResetEmail(getClientAuth(), email.trim());
      setInfo("If that email has an account, a reset link is on its way. Check your inbox.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Don't leak account-existence — but we do show real validation errors
      if (msg.includes('auth/invalid-email')) {
        setError(friendlyAuthError(msg));
      } else {
        // For other errors (incl. user-not-found), show neutral message
        setInfo("If that email has an account, a reset link is on its way. Check your inbox.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (mode === 'reset') {
    return (
      <form onSubmit={handleReset} className="card-mystic w-full max-w-sm rounded-xl p-7">
        <h1 className="text-2xl font-semibold text-zinc-50 mb-1">Reset password</h1>
        <p className="text-sm text-zinc-500 mb-6">Enter your email and we&apos;ll send a reset link.</p>

        {error && <p className="mb-4 px-3 py-2 rounded-md bg-red-950/40 border border-red-900/40 text-sm text-red-300">{error}</p>}
        {info && <p className="mb-4 px-3 py-2 rounded-md bg-emerald-950/30 border border-emerald-900/40 text-sm text-emerald-300">{info}</p>}

        <label className="block mb-5">
          <span className="text-xs text-zinc-400 font-medium">Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
        </label>

        <button type="submit" disabled={busy} className="btn-gold w-full">
          {busy ? 'Sending…' : 'Send reset link'}
        </button>

        <button type="button" onClick={() => { setMode('login'); setError(null); setInfo(null); }}
          className="mt-4 w-full text-sm text-center text-zinc-500 hover:text-zinc-300 transition">
          ← Back to log in
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleLogin} className="card-mystic w-full max-w-sm rounded-xl p-7">
      <h1 className="text-2xl font-semibold text-zinc-50 mb-1">Log in</h1>
      <p className="text-sm text-zinc-500 mb-6">Welcome back.</p>

      {error && <p className="mb-4 px-3 py-2 rounded-md bg-red-950/40 border border-red-900/40 text-sm text-red-300">{error}</p>}

      <label className="block mb-3.5">
        <span className="text-xs text-zinc-400 font-medium">Email</span>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
      </label>

      <label className="block mb-1.5">
        <span className="text-xs text-zinc-400 font-medium">Password</span>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
          className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
      </label>
      <div className="text-right mb-5">
        <button type="button" onClick={() => { setMode('reset'); setError(null); setInfo(null); }}
          className="text-xs text-amber-300 hover:text-amber-200 transition">
          Forgot password?
        </button>
      </div>

      <button type="submit" disabled={busy} className="btn-gold w-full">
        {busy ? 'Logging in…' : 'Log in'}
      </button>

      <p className="mt-5 text-sm text-center text-zinc-500">
        New here?{' '}
        <Link href="/signup" className="text-amber-300 hover:text-amber-200 underline-offset-2 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <Suspense fallback={null}><LoginForm /></Suspense>
    </main>
  );
}
