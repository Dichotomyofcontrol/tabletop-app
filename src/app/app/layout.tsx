import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser, getDisplayName } from '@/lib/firebase/server';
import LogoutButton from './_components/logout-button';
import { ToastProvider } from './_components/toast';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const displayName = (await getDisplayName(user.uid)) ?? user.email;

  return (
    <ToastProvider>
      <div className="flex flex-1 flex-col">
        <header className="border-b border-amber-500/10 bg-zinc-950/40 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
            <Link href="/app" className="flex items-center gap-2.5 group">
              <svg viewBox="0 0 64 64" className="w-7 h-7 text-amber-400 group-hover:text-amber-300 transition" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M32 4 L58 22 L48 54 L16 54 L6 22 Z" />
                <path d="M32 4 L32 28 M58 22 L32 28 M6 22 L32 28 M48 54 L32 28 M16 54 L32 28" opacity="0.55" />
              </svg>
              <span className="font-display text-amber-100 text-lg tracking-wide">Tabletop Scheduler</span>
            </Link>
            <div className="flex items-center gap-5 text-sm">
              <Link href="/app/settings" className="text-zinc-400 hover:text-amber-200 transition">{displayName}</Link>
              <LogoutButton />
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10">{children}</main>
      </div>
    </ToastProvider>
  );
}
