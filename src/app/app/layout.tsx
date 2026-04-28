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

  // One-shots: polls with no campaignId where the user is a participant
  const oneshotsSnap = await getAdminDb().collection('polls')
    .where('memberIds', 'array-contains', user.uid).get();
  const oneShots = oneshotsSnap.docs
    .map((d) => {
      const data = d.data();
      const campaignId = data.campaignId as string | null | undefined;
      const opts = (data.options as { id: string; startsAt: string }[]) ?? [];
      const winnerId = data.winnerOptionId as string | null;
      const winner = winnerId ? opts.find((o) => o.id === winnerId) : null;
      const status = (data.status as string) ?? 'open';
      return {
        id: d.id,
        title: (data.title as string) ?? 'One-shot',
        campaignId: campaignId ?? null,
        scheduledAt: winner ? winner.startsAt : null,
        status: status as 'open' | 'scheduled',
        createdAt: (data.createdAt as string) ?? '',
      };
    })
    .filter((p) => !p.campaignId)
    .filter((p) => !p.scheduledAt || new Date(p.scheduledAt).getTime() > Date.now())
    .sort((a, b) => {
      if (a.scheduledAt && b.scheduledAt) return a.scheduledAt.localeCompare(b.scheduledAt);
      if (a.scheduledAt) return -1;
      if (b.scheduledAt) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    })
    .map(({ id, title, status, scheduledAt }) => ({ id, title, status, scheduledAt }));

  const c = await cookies();
  const sidebarOpen = c.get('sidebarOpen')?.value !== 'false';

  return (
    <ToastProvider>
      <AppShell
        initialOpen={sidebarOpen}
        sidebar={<Sidebar campaigns={campaigns} oneShots={oneShots} displayName={displayName} email={user.email ?? ''} />}
      >
        {children}
      </AppShell>
    </ToastProvider>
  );
}
