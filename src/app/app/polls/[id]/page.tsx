import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import PollResponseButtons from '@/app/app/_components/poll-response-buttons';
import PollPickWinner from '@/app/app/_components/poll-pick-winner';
import PollCommentForm from '@/app/app/_components/poll-comment-form';
import CommentDeleteButton from '@/app/app/_components/comment-delete-button';
import ShareButtons from '@/app/app/_components/share-buttons';
import EditPollPanel from '@/app/app/_components/edit-poll-panel';

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

export default async function AuthPollPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/app/polls/${id}`)}`);

  const db = getAdminDb();
  const snap = await db.collection('polls').doc(id).get();
  if (!snap.exists) return notFound();
  const data = snap.data()!;
  const isHost = data.hostId === user.uid;

  // For campaign polls, gate on campaign membership
  if (data.campaignId) {
    const camp = await db.collection('campaigns').doc(data.campaignId as string).get();
    const roles = (camp.data()?.roles ?? {}) as Record<string, string>;
    if (!roles[user.uid] && !isHost) redirect('/app/polls');
  }

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
    uid: d.data().uid as string,
    displayName: (d.data().displayName as string) ?? 'Anon',
    text: d.data().text as string,
    createdAt: d.data().createdAt as string,
    isGuest: !!d.data().isGuest,
  }));

  const myPart = participants.find((p) => p.uid === user.uid);
  const options = (data.options as { id: string; startsAt: string }[]) ?? [];
  const status = (data.status as 'open' | 'scheduled') ?? 'open';
  const closesAt = (data.closesAt as string | null) ?? null;
  const isExpired = !!(closesAt && new Date(closesAt) < new Date());
  const effectiveStatus: 'open' | 'scheduled' | 'closed' =
    status === 'scheduled' ? 'scheduled' : isExpired ? 'closed' : 'open';

  // Score / best-fit
  const tally = options.map((o) => {
    const yes = participants.filter((p) => p.responses[o.id] === 'yes').length;
    const maybe = participants.filter((p) => p.responses[o.id] === 'maybe').length;
    const no = participants.filter((p) => p.responses[o.id] === 'no').length;
    return { ...o, yes, maybe, no, score: yes * 2 + maybe - no * 2 };
  });
  let bestId: string | null = null;
  if (effectiveStatus === 'open' && participants.length > 0) {
    let best = -Infinity;
    for (const t of tally) {
      if (t.yes > 0 && t.score > best) { best = t.score; bestId = t.id; }
    }
  }

  const winning = (data.winnerOptionId as string | null)
    ? options.find((o) => o.id === (data.winnerOptionId as string))
    : null;

  const isCampaignPoll = !!data.campaignId;
  const publicShareUrl = `/p/${id}`;
  const shareSubjectV2 = effectiveStatus === 'scheduled'
    ? (isCampaignPoll ? `${data.title as string} — campaign session` : `You’re invited: ${data.title as string}`)
    : (isCampaignPoll ? `Vote on a date: ${data.title as string}` : `Help pick a date: ${data.title as string}`);
  const shareBodyV2 = effectiveStatus === 'scheduled'
    ? `${data.title as string} is locked in${winning ? ` for ${fmt(winning.startsAt)}` : ''}. RSVP here: ${publicShareUrl}`
    : `Help pick a date for ${data.title as string}: ${publicShareUrl}`;

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <Link href={isCampaignPoll ? `/app/campaigns/${data.campaignId}` : '/app/polls'}
        className="text-xs text-zinc-500 hover:text-zinc-200 transition">
        ← {isCampaignPoll ? 'Campaign' : 'Polls'}
      </Link>

      <div className="mt-4 flex items-baseline gap-3 flex-wrap">
        <h1 className="text-3xl font-semibold text-zinc-50 tracking-tight">{data.title as string}</h1>
        {effectiveStatus === 'scheduled' && (
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">Scheduled</span>
        )}
        {effectiveStatus === 'closed' && (
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Closed</span>
        )}
        {effectiveStatus === 'open' && closesAt && (
          <span className="text-[11px] text-amber-300 font-medium">{untilLabel(closesAt)}</span>
        )}
      </div>
      <p className="text-sm text-zinc-500 mt-1">
        {[data.system, data.venue, data.duration].filter(Boolean).join(' · ')}
        {(data.system || data.venue || data.duration) && ' · '}
        Hosted by {(data.hostName as string | null) ?? 'someone'}
      </p>
      {data.description ? (
        <p className="mt-5 text-zinc-400 leading-relaxed border-l-2 border-amber-500/30 pl-4 italic">
          {data.description as string}
        </p>
      ) : null}

      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <ShareButtons url={publicShareUrl} subject={shareSubjectV2} body={shareBodyV2} />
        <span className="text-[11px] text-zinc-500">
          {effectiveStatus === 'scheduled'
            ? (isCampaignPoll
                ? 'Anyone with this link can RSVP — campaign members sign in.'
                : 'Anyone with this link can RSVP. No signup needed.')
            : (isCampaignPoll
                ? 'Drop this in your party’s chat. Members sign in to vote.'
                : 'Anyone with this link can vote — no signup needed.')}
        </span>
      </div>

      {effectiveStatus === 'scheduled' && winning ? (
        <div className="mt-8 space-y-4">
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/[0.05] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-300 mb-1">Locked in</p>
            <p className="text-xl font-semibold text-zinc-50">{fmt(winning.startsAt)}</p>
            {isCampaignPoll && (
              <p className="text-xs text-zinc-400 mt-2">Added to the campaign calendar.</p>
            )}
          </div>
          {(() => {
            const yesC = participants.filter((p) => p.responses[winning.id] === 'yes').length;
            const maybeC = participants.filter((p) => p.responses[winning.id] === 'maybe').length;
            const noC = participants.filter((p) => p.responses[winning.id] === 'no').length;
            const myR = (myPart?.responses[winning.id] ?? null) as 'yes' | 'no' | 'maybe' | null;
            return (
              <div className="rounded-lg border border-black/[0.10] dark:border-white/[0.07] bg-white dark:bg-zinc-900/40 p-5">
                <div className="flex items-baseline justify-between flex-wrap gap-3 mb-3">
                  <p className="text-sm font-semibold text-zinc-100">Will you be there?</p>
                  <p className="text-xs">
                    <span className="text-lime-300">{yesC} in</span>
                    <span className="mx-2">·</span>
                    <span className="text-amber-300">{maybeC} maybe</span>
                    <span className="mx-2">·</span>
                    <span className="text-zinc-500">{noC} out</span>
                  </p>
                </div>
                <PollResponseButtons pollId={id} optionId={winning.id} my={myR} />
                {participants.length > 0 && (
                  <ul className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.05] space-y-1.5">
                    {participants.map((p) => {
                      const r = p.responses[winning.id];
                      const tone = r === 'yes' ? 'text-lime-300' : r === 'maybe' ? 'text-amber-300' : r === 'no' ? 'text-zinc-500' : 'text-zinc-600';
                      const label = r === 'yes' ? 'In' : r === 'maybe' ? 'Maybe' : r === 'no' ? 'Out' : '—';
                      return (
                        <li key={p.uid} className="flex items-center justify-between text-xs">
                          <span className="text-zinc-300">{p.displayName}{p.isGuest && <span className="ml-2 text-[10px] text-zinc-500 uppercase tracking-wider">Guest</span>}</span>
                          <span className={tone}>{label}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="mt-8">
          <h2 className="text-xs uppercase tracking-[0.12em] text-zinc-500 font-semibold mb-3">
            {effectiveStatus === 'closed' ? 'Final tallies' : `Vote · ${participants.length} responded`}
          </h2>
          <ul className="space-y-3">
            {tally.map((t) => {
              const my = (myPart?.responses[t.id] ?? null) as 'yes' | 'no' | 'maybe' | null;
              const isBest = bestId === t.id;
              return (
                <li key={t.id} className={`rounded-lg border p-4 ${
                  isBest ? 'border-amber-500/40 bg-amber-500/[0.04]' : 'border-black/[0.10] dark:border-white/[0.07] bg-white dark:bg-zinc-900/40'
                }`}>
                  <div className="flex items-baseline justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <p className="text-base font-semibold text-zinc-50">{fmt(t.startsAt)}</p>
                        {isBest && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">★ Best fit</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        <span className="text-lime-300">{t.yes} in</span>
                        <span className="mx-2">·</span>
                        <span className="text-amber-300">{t.maybe} maybe</span>
                        <span className="mx-2">·</span>
                        <span className="text-zinc-500">{t.no} out</span>
                      </p>
                    </div>
                    {effectiveStatus === 'open' && (
                      <PollResponseButtons pollId={id} optionId={t.id} my={my} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {isHost && effectiveStatus !== 'closed' && (
        <div className="mt-8">
          <PollPickWinner
            pollId={id}
            status={effectiveStatus}
            options={tally}
            bestId={bestId}
            isCampaignPoll={isCampaignPoll}
          />
        </div>
      )}
      {isHost && effectiveStatus === 'closed' && (
        <div className="mt-8">
          <PollPickWinner
            pollId={id}
            status="open"
            options={tally}
            bestId={bestId}
            isCampaignPoll={isCampaignPoll}
          />
          <p className="text-xs text-zinc-500 mt-2 text-center">
            The deadline passed but you can still lock in any date.
          </p>
        </div>
      )}

      {isHost && (
        <div className="mt-8 flex justify-end">
          <EditPollPanel pollId={id} initial={{
            title: data.title as string,
            description: (data.description as string | null) ?? null,
            venue: (data.venue as string | null) ?? null,
            system: (data.system as string | null) ?? null,
            duration: (data.duration as string | null) ?? null,
            closesAt: (data.closesAt as string | null) ?? null,
            isCampaignPoll,
            isSingleScheduled: effectiveStatus === 'scheduled' && options.length === 1,
            scheduledStartsAt: winning ? winning.startsAt : null,
          }} />
        </div>
      )}

      <div className="mt-12">
        <h2 className="text-xs uppercase tracking-[0.12em] text-zinc-500 font-semibold mb-3">
          Discussion · {comments.length}
        </h2>
        {comments.length > 0 ? (
          <ul className="space-y-3 mb-5">
            {comments.map((cmt) => {
              const canDelete = isHost || cmt.uid === user.uid;
              return (
                <li key={cmt.id} className="rounded-lg border border-black/[0.10] dark:border-white/[0.07] bg-white dark:bg-zinc-900/40 p-4">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <p className="text-sm font-medium text-zinc-100">
                      {cmt.displayName}
                      {cmt.isGuest && <span className="ml-2 text-[10px] text-zinc-500 uppercase tracking-wider">Guest</span>}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-500">{relTime(cmt.createdAt)}</span>
                      {canDelete && <CommentDeleteButton pollId={id} commentId={cmt.id} />}
                    </div>
                  </div>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">{cmt.text}</p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500 mb-5 italic">No comments yet. Start the conversation.</p>
        )}
        <PollCommentForm pollId={id} mode="auth" disabled={effectiveStatus === 'closed' && !isHost} />
      </div>
    </div>
  );
}
