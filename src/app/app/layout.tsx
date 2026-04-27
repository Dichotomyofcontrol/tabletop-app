import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser, getDisplayName } from '@/lib/firebase/server';
import { ToastProvider } from './_components/toast';
import Sidebar from './_components/sidebar';
import AppShell from './_components/app-shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const displayName = (await getDisplayName(user.uid)) ?? user.email ?? 'You';

  const campaignsSnap = await getAdminDb().collection('campaigns')
    .where('memberIds', 'array-contains', user.uid).get();
  const campaigns = campaignsSnap.docs
    .map((d) => ({
      id: d.id,
      name: d.data().name as string,
      color: (d.data().color as string | undefined) ?? 'amber',
      createdAt: (d.data().createdAt as string) ?? '',
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(({ id, name, color }) => ({ id, name, color }));

  const c = await cookies();
  const sidebarOpen = c.get('sidebarOpen')?.value !== 'false';

  return (
    <ToastProvider>
      <AppShell
        initialOpen={sidebarOpen}
        sidebar={<Sidebar campaigns={campaigns} displayName={displayName} email={user.email ?? ''} />}
      >
        {children}
      </AppShell>
    </ToastProvider>
  );
}
