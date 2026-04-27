import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import { rsvp } from '@/app/app/actions';
import AddSessionForm from '@/app/app/_components/add-session-form';
import CharacterForm from '@/app/app/_components/character-form';

type Props = { params: Promise<{ id: string }> };
type Role = 'owner' | 'editor' | 'viewer';

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default async function CampaignPage({ params }: Props) {
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
  const isOwner = myRole === 'owner';
  const canEdit = myRole === 'owner' || myRole === 'editor';

  const memberIds = Object.keys(roles);
  const memberDocs = await Promise.all(memberIds.map((mid) => db.collection('users').doc(mid).get()));
  const members = memberIds.map((mid, i) => ({
    uid: mid, role: roles[mid],
    displayName: (memberDocs[i].data()?.displayName as string | undefined) ?? '—',
  }));

  const sessionsSnap = await db.collection('campaigns').doc(id).collection('sessions')
    .orderBy('startsAt', 'asc').get();
  const sessions = sessionsSnap.docs.map((d) => ({
    id: d.id,
    startsAt: d.data().startsAt as string,
    title: (d.data().title as string | null) ?? null,
    venue: (d.data().venue as string | null) ?? null,
  }));
  const now = new Date().toISOString();
  const upcoming = sessions.filter((s) => s.startsAt >= now);
  const past = sessions.filter((s) => s.startsAt < now);

  const rsvpDocs = sessions.length === 0 ? [] : await Promise.all(
    sessions.map((s) =>
      db.collection('campaigns').doc(id).collection('sessions').doc(s.id)
        .collection('rsvps').doc(user.uid).get()
    )
  );
  const myRsvpFor = new Map<string, 'yes' | 'no' | 'maybe'>();
  rsvpDocs.forEach((d, i) => {
    const status = d.data()?.status as 'yes' | 'no' | 'maybe' | undefined;
    if (status) myRsvpFor.set(sessions[i].id, status);
  });

  const myCharSnap = await db.collection('campaigns').doc(id).collection('characters')
    .where('userId', '==', user.uid).limit(1).get();
  const myCharacter = myCharSnap.empty ? null : {
    id: myCharSnap.docs[0].id,
    name: (myCharSnap.docs[0].data().name as string) ?? '',
    class: (myCharSnap.docs[0].data().class as string | null) ?? null,
    level: (myCharSnap.docs[0].data().level as number | null) ?? null,
    sheetUrl: (myCharSnap.docs[0].data().sheetUrl as string | null) ?? null,
    notes: (myCharSnap.docs[0].data().notes as string | null) ?? null,
  };

  return (
    <div className="space-y-12">
      <Link href="/app" className="text-sm text-zinc-500 hover:text-amber-200 transition">
        ← Dashboard
      </Link>

      {/* Campaign header */}
      <header className="card-mystic rounded-xl p-7 relative overflow-hidden">
        <div className="absolute -top-32 -right-24 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-4xl md:text-5xl gold-text leading-tight">
                {data.name}
              </h1>
              <div className="flex flex-wrap gap-2 mt-3">
                {data.system && <span className="tag-rune">{data.system}</span>}
                {data.venue && (
                  <span className="tag-rune !bg-violet-500/8 !text-violet-300 !border-violet-500/20">
                    {data.venue}
                  </span>
                )}
                <span className="tag-rune !bg-zinc-500/10 !text-zinc-400 !border-zinc-500/20 capitalize">
                  {myRole}
                </span>
              </div>
            </div>
            {isOwner && (
              <Link href={`/app/campaigns/${id}/invite`}
                className="btn-gold px-5 py-2.5 rounded-md text-sm uppercase tracking-wide whitespace-nowrap">
                Invite players
              </Link>
            )}
          </div>
          {data.description && (
            <p className="mt-5 text-zinc-300 leading-relaxed border-l-2 border-amber-500/30 pl-4 italic">
              {data.description}
            </p>
          )}
        </div>
      </header>

      {/* Sessions */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <span className="tag-rune">Upcoming sessions</span>
          {upcoming.length > 0 && (
            <span className="text-xs text-zinc-500">{upcoming.length} scheduled</span>
          )}
        </div>

        {upcoming.length > 0 ? (
          <ul className="space-y-3 mb-5">
            {upcoming.map((s) => {
              const my = myRsvpFor.get(s.id);
              return (
                <li key={s.id} className="card-mystic rounded-lg p-4 flex items-center justify-between flex-wrap gap-4">
                  <div className="min-w-0">
                    <p className="font-display text-amber-100 text-lg leading-snug">
                      {s.title || 'Session'}
                    </p>
                    <p className="text-sm text-zinc-400 mt-0.5">
                      {fmt(s.startsAt)}
                      {s.venue && <span className="text-zinc-500"> · {s.venue}</span>}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {(['yes', 'maybe', 'no'] as const).map((st) => (
                      <form key={st} action={rsvp}>
                        <input type="hidden" name="session_id" value={s.id} />
                        <input type="hidden" name="campaign_id" value={id} />
                        <input type="hidden" name="status" value={st} />
                        <button type="submit"
                          className={`px-3 py-1.5 rounded text-xs font-medium uppercase tracking-wide transition ${
                            my === st ? 'btn-gold' : 'btn-ghost'
                          }`}>
                          {st === 'yes' ? 'In' : st === 'maybe' ? 'Maybe' : 'Out'}
                        </button>
                      </form>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="card-mystic rounded-lg p-8 text-center mb-5">
            <p className="text-zinc-400">No sessions on the calendar yet.</p>
          </div>
        )}

        {canEdit && (
          <AddSessionForm campaignId={id} defaultVenue={data.venue ?? undefined} />
        )}
      </section>

      {/* Past sessions */}
      {past.length > 0 && (
        <section>
          <span className="tag-rune mb-3 inline-block">Past sessions</span>
          <ul className="space-y-2">
            {past.slice().reverse().slice(0, 5).map((s) => (
              <li key={s.id} className="text-sm text-zinc-500 flex justify-between border-b border-amber-500/5 py-2">
                <span>{s.title || 'Session'}</span>
                <span className="text-zinc-600">{fmt(s.startsAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Party */}
      <section>
        <span className="tag-rune mb-4 inline-block">The party</span>
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {members.map((m) => {
            const initials = m.displayName.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();
            return (
              <li key={m.uid}
                className="card-mystic rounded-lg p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/25 to-violet-500/15 border border-amber-500/30 flex items-center justify-center font-display text-amber-100 text-sm flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-amber-50 truncate">{m.displayName}</p>
                  <p className="text-xs text-zinc-500 capitalize">{m.role}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* My character */}
      <section>
        <span className="tag-rune mb-4 inline-block">My character</span>
        <CharacterForm campaignId={id} character={myCharacter} />
      </section>
    </div>
  );
}
