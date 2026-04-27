import { notFound, redirect } from 'next/navigation';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import AddSessionForm from '@/app/app/_components/add-session-form';
import SessionRow from '@/app/app/_components/session-row';
import { getCampaignColor } from '@/lib/campaign-colors';
import { LocalShortDate } from '@/app/app/_components/local-time';

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

  const rsvpsBySession = new Map<string, { uid: string; status: 'yes' | 'no' | 'maybe' }[]>();
  await Promise.all(sessions.map(async (s) => {
    const r = await db.collection('campaigns').doc(id).collection('sessions').doc(s.id).collection('rsvps').get();
    rsvpsBySession.set(s.id, r.docs.map((d) => ({ uid: d.id, status: d.data().status as 'yes' | 'no' | 'maybe' })));
  }));

  return (
    <div className="space-y-10">
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
            {canEdit && <p className="text-sm text-zinc-500 mt-1">Schedule the first one below.</p>}
          </div>
        )}
        {canEdit && (
          <div className="mt-5">
            <AddSessionForm campaignId={id} defaultVenue={data.venue ?? undefined} />
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <details>
            <summary className="cursor-pointer list-none text-sm text-zinc-500 hover:text-zinc-300 transition mb-3">
              Past sessions ({past.length})
            </summary>
            <ul className="divide-y divide-white/[0.05] border-y border-white/[0.05]">
              {past.slice().reverse().slice(0, 10).map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-zinc-300">{s.title || 'Session'}</span>
                  <span className="text-zinc-500"><LocalShortDate iso={s.startsAt} /></span>
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}
    </div>
  );
}
