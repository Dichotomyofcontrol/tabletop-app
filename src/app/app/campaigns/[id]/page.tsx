import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import { createSession, rsvp, upsertCharacter } from '@/app/app/actions';

type Props = { params: Promise<{ id: string }> };

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

type Role = 'owner' | 'editor' | 'viewer';

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
  if (!myRole) return notFound(); // not a member → pretend it doesn't exist

  const isOwner = myRole === 'owner';
  const canEdit = myRole === 'owner' || myRole === 'editor';

  // Members: look up display names.
  const memberIds = Object.keys(roles);
  const memberDocs = await Promise.all(
    memberIds.map((mid) => db.collection('users').doc(mid).get())
  );
  const members = memberIds.map((mid, i) => ({
    uid: mid,
    role: roles[mid],
    displayName: (memberDocs[i].data()?.displayName as string | undefined) ?? '—',
  }));

  // Sessions.
  const sessionsSnap = await db
    .collection('campaigns')
    .doc(id)
    .collection('sessions')
    .orderBy('startsAt', 'asc')
    .get();
  const sessions = sessionsSnap.docs.map((d) => ({
    id: d.id,
    startsAt: d.data().startsAt as string,
    title: (d.data().title as string | null) ?? null,
    venue: (d.data().venue as string | null) ?? null,
  }));
  const now = new Date().toISOString();
  const upcoming = sessions.filter((s) => s.startsAt >= now);
  const past = sessions.filter((s) => s.startsAt < now);

  // My RSVPs.
  const rsvpDocs = await Promise.all(
    sessions.map((s) =>
      db
        .collection('campaigns')
        .doc(id)
        .collection('sessions')
        .doc(s.id)
        .collection('rsvps')
        .doc(user.uid)
        .get()
    )
  );
  const myRsvpFor = new Map<string, 'yes' | 'no' | 'maybe'>();
  rsvpDocs.forEach((d, i) => {
    const status = d.data()?.status as 'yes' | 'no' | 'maybe' | undefined;
    if (status) myRsvpFor.set(sessions[i].id, status);
  });

  // My character.
  const myCharSnap = await db
    .collection('campaigns')
    .doc(id)
    .collection('characters')
    .where('userId', '==', user.uid)
    .limit(1)
    .get();
  const myCharacter = myCharSnap.empty
    ? null
    : {
        id: myCharSnap.docs[0].id,
        name: (myCharSnap.docs[0].data().name as string) ?? '',
        class: (myCharSnap.docs[0].data().class as string | null) ?? null,
        level: (myCharSnap.docs[0].data().level as number | null) ?? null,
        sheetUrl: (myCharSnap.docs[0].data().sheetUrl as string | null) ?? null,
        notes: (myCharSnap.docs[0].data().notes as string | null) ?? null,
      };

  return (
    <div className="space-y-10">
      <header>
        <Link
          href="/app"
          className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          ← Dashboard
        </Link>
        <div className="mt-3 flex items-baseline justify-between flex-wrap gap-2">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {data.name}
          </h1>
          {isOwner && (
            <Link
              href={`/app/campaigns/${id}/invite`}
              className="px-4 py-2 rounded-md bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 text-sm font-medium"
            >
              Invite players
            </Link>
          )}
        </div>
        <p className="text-sm text-zinc-500 mt-1">
          {[data.system, data.venue].filter(Boolean).join(' · ')}
        </p>
        {data.description && (
          <p className="mt-3 text-zinc-700 dark:text-zinc-300">{data.description}</p>
        )}
      </header>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 mb-3">
          Upcoming sessions
        </h2>
        {upcoming.length > 0 ? (
          <ul className="space-y-3">
            {upcoming.map((s) => {
              const my = myRsvpFor.get(s.id);
              return (
                <li
                  key={s.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 flex justify-between items-center flex-wrap gap-3"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      {s.title || 'Session'}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {fmt(s.startsAt)}
                      {s.venue ? ` · ${s.venue}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {(['yes', 'maybe', 'no'] as const).map((st) => (
                      <form key={st} action={rsvp}>
                        <input type="hidden" name="session_id" value={s.id} />
                        <input type="hidden" name="campaign_id" value={id} />
                        <input type="hidden" name="status" value={st} />
                        <button
                          type="submit"
                          className={`px-3 py-1.5 rounded text-xs font-medium border ${
                            my === st
                              ? 'bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 border-zinc-900 dark:border-zinc-50'
                              : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                          }`}
                        >
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
          <p className="text-sm text-zinc-500">No upcoming sessions.</p>
        )}

        {canEdit && (
          <details className="mt-4">
            <summary className="text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer">
              + Add session
            </summary>
            <form
              action={createSession}
              className="mt-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3"
            >
              <input type="hidden" name="campaign_id" value={id} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-zinc-500">When</span>
                  <input
                    type="datetime-local"
                    name="starts_at"
                    required
                    className="mt-1 w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-zinc-500">Title (optional)</span>
                  <input
                    type="text"
                    name="title"
                    placeholder="Session 12 — the long road"
                    className="mt-1 w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-zinc-500">Venue</span>
                  <input
                    type="text"
                    name="venue"
                    placeholder={(data.venue as string | undefined) ?? 'TPK Brewing'}
                    className="mt-1 w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50"
                  />
                </label>
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 text-sm font-medium"
              >
                Add session
              </button>
            </form>
          </details>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 mb-3">
            Past sessions
          </h2>
          <ul className="space-y-2 text-sm">
            {past
              .slice()
              .reverse()
              .slice(0, 5)
              .map((s) => (
                <li key={s.id} className="text-zinc-600 dark:text-zinc-400">
                  {fmt(s.startsAt)} — {s.title || 'Session'}
                </li>
              ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 mb-3">
          Party
        </h2>
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {members.map((m) => (
            <li
              key={m.uid}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm"
            >
              <div className="font-medium text-zinc-900 dark:text-zinc-50">
                {m.displayName}
              </div>
              <div className="text-xs text-zinc-500 capitalize">{m.role}</div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 mb-3">
          My character
        </h2>
        <form
          action={upsertCharacter}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3"
        >
          <input type="hidden" name="campaign_id" value={id} />
          {myCharacter && <input type="hidden" name="id" value={myCharacter.id} />}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs text-zinc-500">Name</span>
              <input
                type="text"
                name="name"
                required
                defaultValue={myCharacter?.name ?? ''}
                className="mt-1 w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50"
              />
            </label>
            <label className="block">
              <span className="text-xs text-zinc-500">Class</span>
              <input
                type="text"
                name="class"
                defaultValue={myCharacter?.class ?? ''}
                className="mt-1 w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50"
              />
            </label>
            <label className="block">
              <span className="text-xs text-zinc-500">Level</span>
              <input
                type="number"
                name="level"
                min={1}
                max={20}
                defaultValue={myCharacter?.level ?? ''}
                className="mt-1 w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs text-zinc-500">
              Sheet link (D&D Beyond, Google Drive, anything)
            </span>
            <input
              type="url"
              name="sheet_url"
              defaultValue={myCharacter?.sheetUrl ?? ''}
              placeholder="https://…"
              className="mt-1 w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50"
            />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-500">Notes</span>
            <textarea
              name="notes"
              rows={2}
              defaultValue={myCharacter?.notes ?? ''}
              className="mt-1 w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50"
            />
          </label>
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 text-sm font-medium"
          >
            {myCharacter ? 'Save changes' : 'Create character'}
          </button>
        </form>
      </section>
    </div>
  );
}
