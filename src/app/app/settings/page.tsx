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
      <Link href="/app"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50">
        ← Dashboard
      </Link>
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-4 mb-6">
        Account settings
      </h1>

      {sp.saved && (
        <p className="mb-4 text-sm text-green-600 dark:text-green-400">Saved.</p>
      )}
      {sp.error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{sp.error}</p>
      )}

      <form action={updateProfile}
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</span>
          <input type="email" disabled value={user.email ?? ''}
            className="mt-1 w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-950 text-zinc-500" />
          <span className="block mt-1 text-xs text-zinc-500">
            Email is managed by Firebase Auth. To change it, contact support (not built yet).
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Display name</span>
          <input type="text" name="display_name" required defaultValue={displayName}
            className="mt-1 w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50" />
        </label>

        <button type="submit"
          className="px-5 py-2 rounded-md bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 font-medium">
          Save changes
        </button>
      </form>
    </div>
  );
}
