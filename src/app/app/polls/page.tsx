import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import { getCampaignColor } from '@/lib/campaign-colors';

export const dynamic = 'force-dynamic';

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export default async function PollsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const db = getAdminDb();
  const snap = await db.collection('polls').where('memberIds', 'array-contains', user.uid).get();

  const polls = snap.docs
    .map((d) => d.data() as Record<string, unknown>)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  // Pull campaign colors for any campaign-scoped polls
  const campaignIds = Array.from(new Set(polls.map((p) => p.campaignId as string | null).filter(Boolean))) as string[];
  const campaignMap = new Map<string, { name: string; color: string }>();
  if (campaignIds.length > 0) {
    const campSnaps = await Promise.all(campaignIds.map((id) => db.collection('campaigns').doc(id).get()));
    for (const cs of campSnaps) {
      if (cs.exists) {
        const d = cs.data()!;
        campaignMap.set(cs.id, { name: (d.name as string) ?? '', color: (d.color as string) ?? 'amber' });
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="flex items-baseline justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-50 tracking-tight">Polls</h1>
          <p className="text-sm text-zinc-500 mt-1">
            One-shots and campaign sessions you&apos;re voting on.
          </p>
        </div>
        <Link href="/app/polls/new" className="btn-gold text-sm">+ New one-shot poll</Link>
      </div>

      {polls.length === 0 ? (
        <div className="rounded-xl border border-black/[0.10] dark:border-white/[0.07] bg-white dark:bg-zinc-900/40 p-10 text-center">
          <p className="text-zinc-300 font-medium">No polls yet.</p>
          <p className="text-sm text-zinc-500 mt-1.5">
            Polls are useful when you don&apos;t know when everyone&apos;s free yet.
          </p>
          <Link href="/app/polls/new" className="btn-gold inline-block mt-5">Start a one-shot poll</Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {polls.map((p) => {
            const id = p.id as string;
            const status = (p.status as string) ?? 'open';
            const closesAt = p.closesAt as string | null | undefined;
            const isExpired = !!(closesAt && new Date(closesAt) < new Date());
            const effective = status === 'scheduled' ? 'scheduled' : isExpired ? 'closed' : 'open';
            const campaignId = p.campaignId as string | null | undefined;
            const camp = campaignId ? campaignMap.get(campaignId) : null;
            const color = camp ? getCampaignColor(camp.color) : null;
            const opts = (p.options as { id: string; startsAt: string }[]) ?? [];
            const winnerId = p.winnerOptionId as string | null;
            const winning = winnerId ? opts.find((o) => o.id === winnerId) : null;

            return (
              <li key={id}>
                <Link href={`/app/polls/${id}`}
                  className="block rounded-lg border border-black/[0.10] dark:border-white/[0.07] bg-white dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition px-5 py-4">
                  <div className="flex items-center gap-3">
                    {color && (
                      <span className="w-1.5 self-stretch rounded-full" style={{ background: color.hex }} />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <p className="text-base font-semibold text-zinc-50 truncate">{p.title as string}</p>
                        {effective === 'scheduled' && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Scheduled</span>
                        )}
                        {effective === 'closed' && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Closed</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {camp ? `${camp.name} · ` : 'One-shot · '}
                        {winning ? `Locked in for ${fmt(winning.startsAt)}` : `${opts.length} dates · hosted by ${p.hostName as string}`}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
