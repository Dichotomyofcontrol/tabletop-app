import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import ScheduleSessionForm from '@/app/app/_components/schedule-session-form';

type Props = {
  searchParams: Promise<{ campaign?: string; mode?: string; lock?: string }>;
};

export default async function SchedulePage({ searchParams }: Props) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const db = getAdminDb();
  // Pull every campaign where the current user is owner or editor
  const snap = await db
    .collection('campaigns')
    .where('memberIds', 'array-contains', user.uid)
    .get();
  const userCampaigns = snap.docs
    .map((d) => {
      const data = d.data();
      const role = ((data.roles ?? {}) as Record<string, string>)[user.uid];
      return {
        id: d.id,
        name: (data.name as string) ?? '',
        venue: (data.venue as string | null) ?? null,
        role,
        createdAt: (data.createdAt as string) ?? '',
      };
    })
    .filter((c) => c.role === 'owner' || c.role === 'editor')
    .sort((a, b) => a.name.localeCompare(b.name));

  const initialCampaignId = sp.campaign ?? null;
  const initialMode = sp.mode === 'poll' ? 'poll' : 'date';
  const lockCampaign = sp.lock === '1';

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <Link
        href={initialCampaignId ? `/app/campaigns/${initialCampaignId}` : '/app'}
        className="text-xs text-zinc-500 hover:text-zinc-200 transition">
        ← Back
      </Link>
      <h1 className="text-3xl font-semibold text-zinc-50 tracking-tight mt-4 mb-2">Schedule a session</h1>
      <p className="text-zinc-500 mb-8 text-sm">
        Pick a campaign — or leave blank for a one-shot. Then either lock in a date
        or let the party vote on options.
      </p>
      <ScheduleSessionForm
        userCampaigns={userCampaigns}
        initialCampaignId={initialCampaignId}
        initialMode={initialMode as 'date' | 'poll'}
        lockCampaign={lockCampaign}
      />
    </div>
  );
}
