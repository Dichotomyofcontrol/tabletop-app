'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/app';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
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
      setError(msg.replace(/^Firebase:\s*/, ''));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card-mystic w-full max-w-sm rounded-xl p-7">
      <h1 className="text-2xl font-semibold text-zinc-50 mb-1">Log in</h1>
      <p className="text-sm text-zinc-500 mb-6">Welcome back.</p>

      {error && (
        <p className="mb-4 px-3 py-2 rounded-md bg-red-950/40 border border-red-900/40 text-sm text-red-300">
          {error}
        </p>
      )}

      <label className="block mb-3.5">
        <span className="text-xs text-zinc-400 font-medium">Email</span>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
      </label>

      <label className="block mb-5">
        <span className="text-xs text-zinc-400 font-medium">Password</span>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
          className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
      </label>

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
