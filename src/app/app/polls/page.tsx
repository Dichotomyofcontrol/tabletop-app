import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import { getCampaignColor } from '@/lib/campaign-colors';
import LiveRefresh from '@/app/app/_components/live-refresh';

export const dynamic = 'force-dynamic';

function untilLabel(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'closed';
  const min = Math.floor(ms / 60000);
  if (min < 60) return `closes in ${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `closes in ${h}h`;
  const d = Math.floor(h / 24);
  return `closes in ${d}d`;
}

export default async function PollsInboxPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const db = getAdminDb();
  const snap = await db.collection('polls').where('memberIds', 'array-contains', user.uid).get();

  const polls = await Promise.all(snap.docs
    .map((d) => d.data())
    .filter((p) => (p.status as string) === 'open')
    .map(async (data) => {
      const campaignId = data.campaignId as string | null | undefined;
      const partsSnap = await db.collection('polls').doc(data.id as string).collection('participants').get();
      const myDoc = partsSnap.docs.find((x) => x.id === user.uid);
      const myResponses = myDoc ? (myDoc.data().responses as Record<string, string>) ?? {} : {};
      const opts = (data.options as { id: string }[]) ?? [];
      const responded = opts.filter((o) => myResponses[o.id]).length;
      const totalParticipants = partsSnap.size;
      const camp = campaignId ? await db.collection('campaigns').doc(campaignId).get() : null;
      return {
        id: data.id as string,
        title: (data.title as string) ?? 'Poll',
        hostId: data.hostId as string,
        campaignId: campaignId ?? null,
        campaignName: camp && camp.exists ? (camp.data()!.name as string) : null,
        campaignColor: camp && camp.exists ? ((camp.data()!.color as string) ?? 'amber') : null,
        optionsCount: opts.length,
        respondedCount: responded,
        totalParticipants,
        closesAt: (data.closesAt as string | null) ?? null,
        createdAt: (data.createdAt as string) ?? '',
      };
    }));

  polls.sort((a, b) => {
    const aPending = a.respondedCount < a.optionsCount ? 0 : 1;
    const bPending = b.respondedCount < b.optionsCount ? 0 : 1;
    if (aPending !== bPending) return aPending - bPending;
    if (a.closesAt && b.closesAt) return a.closesAt.localeCompare(b.closesAt);
    if (a.closesAt) return -1;
    if (b.closesAt) return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <LiveRefresh />
      <h1 className="text-3xl font-semibold text-zinc-50 tracking-tight mb-2">Polls</h1>
      <p className="text-sm text-zinc-500 mb-8">
        Open polls awaiting your vote — across all your campaigns and one-shots.
      </p>

      {polls.length === 0 ? (
        <div className="rounded-xl border border-black/[0.10] dark:border-white/[0.07] bg-white dark:bg-zinc-900/40 p-10 text-center">
          <p className="text-zinc-300 font-medium">No open polls.</p>
          <p className="text-sm text-zinc-500 mt-1.5 mb-5">When someone schedules by vote, those polls show up here.</p>
          <Link href="/app/schedule?mode=poll" className="btn-gold inline-block">Start a poll</Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {polls.map((p) => {
            const isHost = p.hostId === user.uid;
            const youHaventVoted = p.respondedCount === 0;
            const partial = p.respondedCount > 0 && p.respondedCount < p.optionsCount;
            const tag = youHaventVoted ? 'Vote needed'
              : partial ? 'Partially voted'
              : isHost && p.totalParticipants > 0 ? 'You can pick a winner'
              : 'Voted';
            const tone = youHaventVoted
              ? 'text-amber-300 bg-amber-500/[0.08] border-amber-500/30'
              : partial
                ? 'text-amber-200 bg-amber-500/[0.06] border-amber-500/30'
                : isHost
                  ? 'text-emerald-300 bg-emerald-500/[0.06] border-emerald-500/30'
                  : 'text-zinc-400 bg-transparent border-zinc-700/40';
            const color = p.campaignColor ? getCampaignColor(p.campaignColor) : null;
            return (
              <li key={p.id}>
                <Link href={`/app/polls/${p.id}`}
                  className="block rounded-lg border border-black/[0.10] dark:border-white/[0.07] bg-white dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition px-5 py-4">
                  <div className="flex items-center gap-3">
                    {color && (
                      <span className="w-1.5 self-stretch rounded-full" style={{ background: color.hex }} />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <p className="text-base font-semibold text-zinc-50 truncate">{p.title}</p>
                        {p.closesAt && (
                          <span className="text-[11px] text-amber-300 font-medium">{untilLabel(p.closesAt)}</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {p.campaignName ? `${p.campaignName} \u00b7 ` : 'One-shot \u00b7 '}
                        {p.optionsCount} date option{p.optionsCount === 1 ? '' : 's'} \u00b7 {p.totalParticipants} responded
                      </p>
                    </div>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md border whitespace-nowrap ${tone}`}>
                      {tag}
                    </span>
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
