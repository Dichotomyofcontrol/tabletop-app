import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser, getDisplayName } from '@/lib/firebase/server';
import LogoutButton from './_components/logout-button';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const displayName = (await getDisplayName(user.uid)) ?? user.email;

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/app"
            className="font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Tabletop Scheduler
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">{displayName}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10">
        {children}
      </main>
    </div>
  );
}
