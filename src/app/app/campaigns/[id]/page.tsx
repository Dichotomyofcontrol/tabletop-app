import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import SessionRow from '@/app/app/_components/session-row';
import { getCampaignColor } from '@/lib/campaign-colors';
import { LocalShortDate } from '@/app/app/_components/local-time';
import LiveRefresh from '@/app/app/_components/live-refresh';
import { deleteSession } from '@/app/app/actions';

type Props = { params: Promise<{ id: string }> };
type Role = 'owner' | 'editor' | 'viewer';

export default async function SessionsPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const db = getAdminDb();
  const snap = await db.collection('campaigns').doc(id).get();
  if (!snap.exists) return notFound();
  const data = snap.data()!;
  const roles = (data.roles ?? {}) as Record<string, Role>;
  const myRole = roles[user.uid] ?? null;
  if (!myRole) return notFound();
  const canEdit = myRole === 'owner' || myRole === 'editor';
  const colorHex = getCampaignColor(data.color as string | undefined).hex;

  const memberIds = Object.keys(roles);
  const memberDocs = await Promise.all(memberIds.map((mid) => db.collection('users').doc(mid).get()));
  const nameLookup = new Map(memberIds.map((mid, i) => [mid, (memberDocs[i].data()?.displayName as string | undefined) ?? '—']));

  const sessionsSnap = await db.collection('campaigns').doc(id).collection('sessions').orderBy('startsAt', 'asc').get();
  const sessions = sessionsSnap.docs.map((d) => ({
    id: d.id,
    startsAt: d.data().startsAt as string,
    title: (d.data().title as string | null) ?? null,
    venue: (d.data().venue as string | null) ?? null,
    notes: (d.data().notes as string | null) ?? null,
    seriesId: (d.data().seriesId as string | null) ?? null,
  }));
  const now = new Date().toISOString();
  const upcoming = sessions.filter((s) => s.startsAt >= now);
  const past = sessions.filter((s) => s.startsAt < now);

  const memberSet = new Set(memberIds);
  const rsvpsBySession = new Map<string, { uid: string; status: 'yes' | 'no' | 'maybe' }[]>();
  await Promise.all(sessions.map(async (s) => {
    const r = await db.collection('campaigns').doc(id).collection('sessions').doc(s.id).collection('rsvps').get();
    // Only include RSVPs from people who are still in the campaign — filter out ex-member ghosts.
    rsvpsBySession.set(s.id, r.docs
      .filter((d) => memberSet.has(d.id))
      .map((d) => ({ uid: d.id, status: d.data().status as 'yes' | 'no' | 'maybe' }))
    );
  }));

  const pollsSnap = await db.collection('polls').where('campaignId', '==', id).where('status', '==', 'open').get();
  const openPolls = pollsSnap.docs.map((d) => {
    const data = d.data();
    const opts = (data.options as { id: string; startsAt: string }[]) ?? [];
    return {
      id: d.id,
      title: (data.title as string) ?? 'Poll',
      optionsCount: opts.length,
    };
  });

  return (
    <div className="space-y-10">
      <LiveRefresh />
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-100">Upcoming</h2>
          {upcoming.length > 0 && <span className="text-xs text-zinc-500">{upcoming.length} scheduled</span>}
        </div>
        {upcoming.length > 0 ? (
          <ul className="space-y-3">
            {upcoming.map((s) => {
              const all = rsvpsBySession.get(s.id) ?? [];
              const my = all.find((r) => r.uid === user.uid)?.status ?? null;
              const partyRsvps = all.map((r) => ({ uid: r.uid, status: r.status, displayName: nameLookup.get(r.uid) ?? '?' }));
              return <SessionRow key={s.id} campaignId={id} session={s} myRsvp={my} partyRsvps={partyRsvps} canEdit={canEdit} color={colorHex} />;
            })}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-white/[0.07] p-10 text-center">
            <p className="text-zinc-300">No sessions on the calendar.</p>
            {canEdit && <p className="text-sm text-zinc-500 mt-1">Use the Schedule button above to add one.</p>}
          </div>
        )}
      </section>

      {openPolls.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Open polls</h2>
          <ul className="space-y-2">
            {openPolls.map((p) => (
              <li key={p.id}>
                <Link href={`/app/polls/${p.id}`}
                  className="flex items-center justify-between px-4 py-3 rounded-lg border border-black/[0.10] dark:border-white/[0.07] bg-white dark:bg-zinc-900/40 hover:border-amber-500/30 transition">
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-100 truncate">{p.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{p.optionsCount} date option{p.optionsCount === 1 ? '' : 's'} · awaiting responses</p>
                  </div>
                  <span className="text-xs text-amber-300 shrink-0 ml-4">View poll →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <details>
            <summary className="cursor-pointer list-none text-sm text-zinc-500 hover:text-zinc-300 transition mb-3">
              Past sessions ({past.length})
            </summary>
            <ul className="divide-y divide-white/[0.05] border-y border-white/[0.05]">
              {past.slice().reverse().map((s) => (
                <li key={s.id} className="group flex items-center justify-between py-2.5 text-sm">
                  <span className="text-zinc-300 truncate">{s.title || 'Session'}</span>
                  <span className="flex items-center gap-3 shrink-0">
                    <span className="text-zinc-500"><LocalShortDate iso={s.startsAt} /></span>
                    {canEdit && (
                      <form action={deleteSession} className="opacity-0 group-hover:opacity-100 transition">
                        <input type="hidden" name="campaign_id" value={id} />
                        <input type="hidden" name="session_id" value={s.id} />
                        <button type="submit"
                          className="text-[11px] text-red-400 hover:text-red-300 transition px-1.5 py-0.5 rounded"
                          title="Delete session">
                          Delete
                        </button>
                      </form>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}
    </div>
  );
}
