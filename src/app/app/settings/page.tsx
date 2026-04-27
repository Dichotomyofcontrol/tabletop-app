import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import { updateProfile } from '@/app/app/actions';

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function SettingsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const snap = await getAdminDb().collection('users').doc(user.uid).get();
  const displayName = (snap.data()?.displayName as string | undefined) ?? '';

  return (
    <div className="max-w-xl">
      <Link href="/app" className="text-sm text-zinc-500 hover:text-amber-200 transition">
        ← Dashboard
      </Link>
      <h1 className="font-display text-4xl gold-text mt-4 mb-2">Account</h1>
      <p className="text-zinc-400 mb-8">Your name in the realm.</p>

      {sp.saved && (
        <p className="mb-4 px-3 py-2 rounded-md bg-emerald-950/40 border border-emerald-900/40 text-sm text-emerald-300">
          ✓ Saved.
        </p>
      )}
      {sp.error && (
        <p className="mb-4 px-3 py-2 rounded-md bg-red-950/50 border border-red-900/50 text-sm text-red-300">
          {sp.error}
        </p>
      )}

      <form action={updateProfile} className="card-mystic rounded-xl p-6 space-y-5">
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-amber-200/70">Email</span>
          <input type="email" disabled value={user.email ?? ''}
            className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md opacity-60 cursor-not-allowed" />
          <span className="block mt-1.5 text-xs text-zinc-500">
            Managed by Firebase Auth. Email changes aren&apos;t built yet.
          </span>
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-widest text-amber-200/70">Display name</span>
          <input type="text" name="display_name" required defaultValue={displayName}
            className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
        </label>

        <button type="submit" className="btn-gold px-5 py-2.5 rounded-md text-sm uppercase tracking-wide">
          Save changes
        </button>
      </form>
    </div>
  );
}
