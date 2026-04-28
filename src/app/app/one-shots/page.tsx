import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import { deletePoll } from '@/app/app/actions';
import LiveRefresh from '@/app/app/_components/live-refresh';

export const dynamic = 'force-dynamic';

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export default async function OneShotsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const db = getAdminDb();
  // Only one-shots: polls with no campaignId where user is a member
  const snap = await db.collection('polls').where('memberIds', 'array-contains', user.uid).get();
  const oneShots = snap.docs
    .map((d) => d.data() as Record<string, unknown>)
    .filter((p) => !p.campaignId)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  const now = Date.now();
  const upcoming: typeof oneShots = [];
  const past: typeof oneShots = [];
  for (const p of oneShots) {
    const winnerId = p.winnerOptionId as string | null;
    const opts = (p.options as { id: string; startsAt: string }[]) ?? [];
    const winner = winnerId ? opts.find((o) => o.id === winnerId) : null;
    if (winner && new Date(winner.startsAt).getTime() < now) {
      past.push(p);
    } else {
      upcoming.push(p);
    }
  }

  function statusOf(p: Record<string, unknown>): { label: string; tone: 'voting' | 'scheduled' | 'closed' | 'past' } {
    const status = (p.status as string) ?? 'open';
    const closesAt = p.closesAt as string | null;
    const winnerId = p.winnerOptionId as string | null;
    const opts = (p.options as { id: string; startsAt: string }[]) ?? [];
    const winner = winnerId ? opts.find((o) => o.id === winnerId) : null;
    if (winner) {
      if (new Date(winner.startsAt).getTime() < Date.now()) return { label: 'Past', tone: 'past' };
      return { label: `Scheduled · ${fmt(winner.startsAt)}`, tone: 'scheduled' };
    }
    if (status === 'open' && closesAt && new Date(closesAt) < new Date()) return { label: 'Voting closed — pick a date', tone: 'closed' };
    return { label: `Voting · ${opts.length} option${opts.length === 1 ? '' : 's'}`, tone: 'voting' };
  }

  function tonePill(tone: 'voting' | 'scheduled' | 'closed' | 'past') {
    switch (tone) {
      case 'scheduled': return 'text-emerald-300 bg-emerald-500/[0.08] border-emerald-500/30';
      case 'voting':    return 'text-amber-300 bg-amber-500/[0.08] border-amber-500/30';
      case 'closed':    return 'text-zinc-300 bg-zinc-500/[0.08] border-zinc-500/30';
      case 'past':      return 'text-zinc-500 bg-transparent border-zinc-700/40';
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <LiveRefresh />
      <div className="flex items-baseline justify-between mb-2">
        <h1 className="text-3xl font-semibold text-zinc-50 tracking-tight">One-shots</h1>
        <Link href="/app/schedule" className="btn-gold text-sm">+ New one-shot</Link>
      </div>
      <p className="text-sm text-zinc-500 mb-8">
        Single-night events you&apos;re hosting or invited to. Anything attached to a campaign lives on that campaign&apos;s page.
      </p>

      {oneShots.length === 0 ? (
        <div className="rounded-xl border border-black/[0.10] dark:border-white/[0.07] bg-white dark:bg-zinc-900/40 p-10 text-center">
          <p className="text-zinc-300 font-medium">No one-shots yet.</p>
          <p className="text-sm text-zinc-500 mt-1.5">
            Hosting a one-night thing? Pick a date or let the party vote on options.
          </p>
          <Link href="/app/schedule" className="btn-gold inline-block mt-5">Schedule a one-shot</Link>
        </div>
      ) : (
        <div className="space-y-10">
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-[0.12em] text-zinc-500 font-semibold mb-3">Upcoming &amp; voting</h2>
              <ul className="space-y-2">
                {upcoming.map((p) => {
                  const id = p.id as string;
                  const st = statusOf(p);
                  const isHost = (p.hostId as string) === user.uid;
                  return (
                    <li key={id} className="group relative">
                      <Link href={`/app/polls/${id}`}
                        className="block rounded-lg border border-black/[0.10] dark:border-white/[0.07] bg-white dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition px-5 py-4">
                        <div className="flex items-baseline justify-between gap-3 flex-wrap pr-12">
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-semibold text-zinc-50 truncate">{p.title as string}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              Hosted by {(p.hostName as string) ?? 'someone'}
                              {p.system ? ` · ${p.system as string}` : ''}
                            </p>
                          </div>
                          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md border ${tonePill(st.tone)}`}>
                            {st.label}
                          </span>
                        </div>
                      </Link>
                      {isHost && (
                        <form action={deletePoll}
                          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition">
                          <input type="hidden" name="poll_id" value={id} />
                          <button type="submit"
                            className="text-[11px] px-2 py-1 rounded text-red-300 hover:text-red-200 hover:bg-red-950/30 transition"
                            title="Delete one-shot">
                            Delete
                          </button>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <details>
                <summary className="cursor-pointer list-none text-sm text-zinc-500 hover:text-zinc-300 transition mb-3">
                  Past ({past.length})
                </summary>
                <ul className="divide-y divide-white/[0.05] border-y border-white/[0.05]">
                  {past.map((p) => {
                    const id = p.id as string;
                    const s = statusOf(p);
                    return (
                      <li key={id} className="flex items-center justify-between py-2.5 text-sm">
                        <Link href={`/app/polls/${id}`} className="text-zinc-300 hover:text-zinc-100 truncate">{p.title as string}</Link>
                        <span className="text-xs text-zinc-500 ml-4 shrink-0">{s.label}</span>
                      </li>
                    );
                  })}
                </ul>
              </details>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
