import { redirect } from 'next/navigation';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser, getDisplayName } from '@/lib/firebase/server';
import { ToastProvider } from './_components/toast';
import Sidebar from './_components/sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const displayName = (await getDisplayName(user.uid)) ?? user.email ?? 'You';

  const campaignsSnap = await getAdminDb().collection('campaigns')
    .where('memberIds', 'array-contains', user.uid).get();
  const campaigns = campaignsSnap.docs
    .map((d) => ({ id: d.id, name: d.data().name as string, createdAt: (d.data().createdAt as string) ?? '' }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(({ id, name }) => ({ id, name }));

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Sidebar campaigns={campaigns} displayName={displayName} email={user.email ?? ''} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </ToastProvider>
  );
}
