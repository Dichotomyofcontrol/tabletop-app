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
    <div className="max-w-xl mx-auto px-8 py-10">
      <h1 className="text-3xl font-semibold text-zinc-50 tracking-tight mb-2">Account</h1>
      <p className="text-zinc-500 mb-8 text-sm">Your name and login.</p>

      {sp.saved && (
        <p className="mb-4 px-3 py-2 rounded-md bg-emerald-950/30 border border-emerald-900/40 text-sm text-emerald-300">
          Saved.
        </p>
      )}
      {sp.error && (
        <p className="mb-4 px-3 py-2 rounded-md bg-red-950/40 border border-red-900/40 text-sm text-red-300">
          {sp.error}
        </p>
      )}

      <form action={updateProfile} className="space-y-5">
        <label className="block">
          <span className="text-xs text-zinc-400 font-medium">Email</span>
          <input type="email" disabled value={user.email ?? ''}
            className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md opacity-60 cursor-not-allowed" />
          <span className="block mt-1.5 text-xs text-zinc-500">
            Managed by Firebase Auth. Email changes aren&apos;t built yet.
          </span>
        </label>

        <label className="block">
          <span className="text-xs text-zinc-400 font-medium">Display name</span>
          <input type="text" name="display_name" required defaultValue={displayName}
            className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
        </label>

        <button type="submit" className="btn-gold">Save changes</button>
      </form>
    </div>
  );
}
