import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import GuestForm from './guest-form';
import PollCommentForm from '@/app/app/_components/poll-comment-form';

type Props = { params: Promise<{ id: string }> };

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}
function relTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
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

export default async function PublicPollPage({ params }: Props) {
  const { id } = await params;
  const db = getAdminDb();
  const snap = await db.collection('polls').doc(id).get();
  if (!snap.exists) return notFound();
  const data = snap.data()!;

  if (data.campaignId) {
    const user = await getCurrentUser();
    if (!user) redirect(`/login?next=${encodeURIComponent(`/app/polls/${id}`)}`);
    redirect(`/app/polls/${id}`);
  }

  const user = await getCurrentUser();
  if (user) redirect(`/app/polls/${id}`);

  const partsSnap = await db.collection('polls').doc(id).collection('participants').get();
  const participants = partsSnap.docs.map((d) => ({
    uid: d.id,
    displayName: (d.data().displayName as string) ?? 'Anon',
    isGuest: !!d.data().isGuest,
    responses: (d.data().responses as Record<string, 'yes' | 'no' | 'maybe'>) ?? {},
  }));

  const commentsSnap = await db.collection('polls').doc(id).collection('comments').orderBy('createdAt', 'asc').get();
  const comments = commentsSnap.docs.map((d) => ({
    id: d.id,
    displayName: (d.data().displayName as string) ?? 'Anon',
    text: d.data().text as string,
    createdAt: d.data().createdAt as string,
    isGuest: !!d.data().isGuest,
  }));

  const c = await cookies();
  const guestId = c.get('guestId')?.value;
  const myPart = guestId ? participants.find((p) => p.uid === guestId) : null;

  const options = (data.options as { id: string; startsAt: string }[]) ?? [];
  const status = (data.status as 'open' | 'scheduled') ?? 'open';
  const closesAt = (data.closesAt as string | null) ?? null;
  const isExpired = !!(closesAt && new Date(closesAt) < new Date());
  const effectiveStatus: 'open' | 'scheduled' | 'closed' =
    status === 'scheduled' ? 'scheduled' : isExpired ? 'closed' : 'open';
  const winning = data.scheduledOptionId ? options.find((o) => o.id === data.scheduledOptionId) : null;

  const tally: Record<string, { yes: number; maybe: number; no: number; score: number }> = {};
  for (const o of options) {
    const yes = participants.filter((p) => p.responses[o.id] === 'yes').length;
    const maybe = participants.filter((p) => p.responses[o.id] === 'maybe').length;
    const no = participants.filter((p) => p.responses[o.id] === 'no').length;
    tally[o.id] = { yes, maybe, no, score: yes * 2 + maybe - no * 2 };
  }
  let bestId: string | null = null;
  if (effectiveStatus === 'open' && participants.length > 0) {
    let best = -Infinity;
    for (const o of options) {
      const t = tally[o.id];
      if (t.yes > 0 && t.score > best) { best = t.score; bestId = o.id; }
    }
  }

  return (
    <main className="flex flex-1 justify-center px-6 py-10">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-2 mb-7">
          <svg viewBox="0 0 64 64" className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M32 4 L58 22 L48 54 L16 54 L6 22 Z" />
            <path d="M32 4 L32 28 M58 22 L32 28 M6 22 L32 28 M48 54 L32 28 M16 54 L32 28" opacity="0.5" />
          </svg>
          <span className="font-semibold text-zinc-100 text-sm">Tabletop</span>
        </div>

        <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-[0.12em] mb-2">
          You&apos;ve been invited to a poll
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-semibold text-zinc-50 tracking-tight">{data.title as string}</h1>
          {effectiveStatus === 'closed' && <span className="tag-rune !text-zinc-400">Closed</span>}
          {effectiveStatus === 'open' && closesAt && (
            <span className="text-[11px] text-amber-300 font-medium">{untilLabel(closesAt)}</span>
          )}
        </div>
        <p className="text-sm text-zinc-500 mt-1">
          {[data.system, data.venue, data.duration].filter(Boolean).join(' · ')}
          {(data.system || data.venue || data.duration) && ' · '}
          Hosted by {(data.hostName as string | null) ?? 'someone'}
        </p>
        {data.description && (
          <p className="mt-5 text-zinc-400 leading-relaxed border-l-2 border-amber-500/30 pl-4 italic">
            {data.description as string}
          </p>
        )}

        {effectiveStatus === 'scheduled' && winning ? (
          <div className="mt-8 space-y-5">
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/[0.05] p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-emerald-300 mb-1">Locked in</p>
              <p className="text-xl font-semibold text-zinc-50">{fmt(winning.startsAt)}</p>
            </div>
            <div>
              <h2 className="text-xs uppercase tracking-[0.12em] text-zinc-500 font-semibold mb-3">
                Will you be there? · {participants.length} responded
              </h2>
              <GuestForm
                pollId={id}
                options={[winning]}
                initialName={myPart?.displayName ?? ''}
                initialResponses={{ [winning.id]: myPart?.responses[winning.id] ?? null }}
                tally={{ [winning.id]: tally[winning.id] ?? { yes: 0, maybe: 0, no: 0 } }}
              />
            </div>
          </div>
        ) : effectiveStatus === 'closed' ? (
          <div className="mt-8 rounded-lg border border-black/[0.10] dark:border-white/[0.07] bg-white dark:bg-zinc-900/40 p-5">
            <p className="text-sm text-zinc-400">Voting is closed. Waiting on the host to pick a date.</p>
            <ul className="mt-4 space-y-2">
              {options.map((o) => {
                const t = tally[o.id];
                const isBest = bestId === o.id;
                return (
                  <li key={o.id} className={`rounded-md border p-3 ${
                    isBest ? 'border-amber-500/40 bg-amber-500/[0.04]' : 'border-black/[0.05] dark:border-white/[0.05]'
                  }`}>
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <p className="text-sm font-medium text-zinc-100">{fmt(o.startsAt)}</p>
                      {isBest && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">★ Best fit</span>
                      )}
                    </div>
                    <p className="text-xs mt-1">
                      <span className="text-lime-300">{t.yes} in</span> · <span className="text-amber-300">{t.maybe} maybe</span> · <span className="text-zinc-500">{t.no} out</span>
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="mt-8">
            <h2 className="text-xs uppercase tracking-[0.12em] text-zinc-500 font-semibold mb-3">
              Vote on the dates · {participants.length} responded
            </h2>
            <GuestForm
              pollId={id}
              options={options}
              initialName={myPart?.displayName ?? ''}
              initialResponses={Object.fromEntries(options.map((o) => [o.id, myPart?.responses[o.id] ?? null]))}
              tally={tally}
            />
          </div>
        )}

        <div className="mt-10">
          <h2 className="text-xs uppercase tracking-[0.12em] text-zinc-500 font-semibold mb-3">
            Discussion · {comments.length}
          </h2>
          {comments.length > 0 ? (
            <ul className="space-y-3 mb-5">
              {comments.map((cmt) => (
                <li key={cmt.id} className="rounded-lg border border-black/[0.10] dark:border-white/[0.07] bg-white dark:bg-zinc-900/40 p-4">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <p className="text-sm font-medium text-zinc-100">
                      {cmt.displayName}
                      {cmt.isGuest && <span className="ml-2 text-[10px] text-zinc-500 uppercase tracking-wider">Guest</span>}
                    </p>
                    <span className="text-xs text-zinc-500">{relTime(cmt.createdAt)}</span>
                  </div>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">{cmt.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500 mb-5 italic">No comments yet. Start the conversation.</p>
          )}
          <PollCommentForm pollId={id} mode="guest" defaultName={myPart?.displayName ?? ''} />
        </div>

        <div className="mt-12 pt-8 border-t border-black/[0.08] dark:border-white/[0.06] text-center">
          <p className="text-sm text-zinc-500">Want to host your own polls and campaigns?</p>
          <Link href="/signup" className="btn-gold inline-block mt-3">
            Create a free account
          </Link>
        </div>
      </div>
    </main>
  );
}
