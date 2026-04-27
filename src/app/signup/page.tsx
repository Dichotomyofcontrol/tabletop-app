'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase/client';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/app';

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!displayName.trim()) { setError('Tell us what to call you'); return; }
    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(getClientAuth(), email, password);
      await updateProfile(cred.user, { displayName: displayName.trim() });
      const idToken = await cred.user.getIdToken(true);
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, displayName: displayName.trim() }),
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
    <form onSubmit={handleSubmit} className="card-mystic w-full max-w-sm rounded-xl p-8">
      <h1 className="font-display text-3xl gold-text mb-1">Forge your name</h1>
      <p className="text-sm text-zinc-400 mb-6">The first step of every campaign.</p>

      {error && (
        <p className="mb-4 px-3 py-2 rounded-md bg-red-950/50 border border-red-900/50 text-sm text-red-300">
          {error}
        </p>
      )}

      <label className="block mb-4">
        <span className="text-xs uppercase tracking-widest text-amber-200/70">Display name</span>
        <input type="text" required value={displayName} onChange={(e) => setDisplayName(e.target.value)}
          placeholder="What your party calls you"
          className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
      </label>

      <label className="block mb-4">
        <span className="text-xs uppercase tracking-widest text-amber-200/70">Email</span>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
      </label>

      <label className="block mb-6">
        <span className="text-xs uppercase tracking-widest text-amber-200/70">Password</span>
        <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
          className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
      </label>

      <button type="submit" disabled={busy}
        className="btn-gold w-full px-4 py-2.5 rounded-md text-sm uppercase tracking-wide">
        {busy ? 'Inscribing…' : 'Begin your tale'}
      </button>

      <p className="mt-6 text-sm text-center text-zinc-400">
        Already have an account?{' '}
        <Link href="/login" className="text-amber-300 hover:text-amber-200 underline-offset-2 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}

export default function SignupPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <Suspense fallback={null}><SignupForm /></Suspense>
    </main>
  );
}
