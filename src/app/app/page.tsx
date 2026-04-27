import Link from 'next/link';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import { rsvp } from './actions';

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function countdown(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return 'now';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h`;
  const mins = Math.floor(ms / 60000);
  return `in ${mins}m`;
}

type CampaignRow = {
  id: string;
  name: string;
  description: string | null;
  system: string | null;
  venue: string | null;
};

type UpcomingSession = {
  id: string;
  campaignId: string;
  campaignName: string;
  startsAt: string;
  title: string | null;
  venue: string | null;
};

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) return null;

  const db = getAdminDb();

  // Campaigns I'm in.
  const campaignsSnap = await db
    .collection('campaigns')
    .where('memberIds', 'array-contains', user.uid)
    .get();

  const campaigns: CampaignRow[] = campaignsSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      description: data.description ?? null,
      system: data.system ?? null,
      venue: data.venue ?? null,
    };
  });

  // Upcoming sessions across all my campaigns.
  const nowIso = new Date().toISOString();
  const sessionLists = await Promise.all(
    campaigns.map(async (c) => {
      const snap = await db
        .collection('campaigns')
        .doc(c.id)
        .collection('sessions')
        .where('startsAt', '>=', nowIso)
        .orderBy('startsAt', 'asc')
        .limit(3)
        .get();
      return snap.docs.map<UpcomingSession>((d) => ({
        id: d.id,
        campaignId: c.id,
        campaignName: c.name,
        startsAt: d.data().startsAt,
        title: d.data().title ?? null,
        venue: d.data().venue ?? null,
      }));
    })
  );
  const upcoming = sessionLists
    .flat()
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const next = upcoming[0];

  // My RSVP for next session.
  let myRsvp: 'yes' | 'no' | 'maybe' | null = null;
  if (next) {
    const rsvpDoc = await db
      .collection('campaigns')
      .doc(next.campaignId)
      .collection('sessions')
      .doc(next.id)
      .collection('rsvps')
      .doc(user.uid)
      .get();
    myRsvp = (rsvpDoc.data()?.status as 'yes' | 'no' | 'maybe' | null) ?? null;
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 mb-3">
          Next session
        </h2>
        {next ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {next.campaignName}
                {next.title ? (
                  <span className="text-zinc-400 font-normal"> — {next.title}</span>
                ) : null}
              </h3>
              <span className="text-sm text-zinc-500">
                {countdown(next.startsAt)}
              </span>
            </div>
            <p className="mt-2 text-zinc-700 dark:text-zinc-300">
              {formatWhen(next.startsAt)}
              {next.venue ? ` · ${next.venue}` : ''}
            </p>
            <div className="mt-5 flex gap-2">
              {(['yes', 'maybe', 'no'] as const).map((s) => (
                <form key={s} action={rsvp}>
                  <input type="hidden" name="session_id" value={next.id} />
                  <input type="hidden" name="campaign_id" value={next.campaignId} />
                  <input type="hidden" name="status" value={s} />
                  <button
                    type="submit"
                    className={`px-4 py-2 rounded-md text-sm font-medium border transition ${
                      myRsvp === s
                        ? 'bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 border-zinc-900 dark:border-zinc-50'
                        : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {s === 'yes' ? "I'm in" : s === 'maybe' ? 'Maybe' : 'Out'}
                  </button>
                </form>
              ))}
              <Link
                href={`/app/campaigns/${next.campaignId}`}
                className="ml-auto px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
              >
                View campaign →
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-8 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">
              No upcoming sessions. Add one from a campaign page.
            </p>
          </div>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            My campaigns
          </h2>
          <Link
            href="/app/campaigns/new"
            className="text-sm text-zinc-900 dark:text-zinc-50 underline"
          >
            New campaign
          </Link>
        </div>
        {campaigns.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((c) => (
              <Link
                key={c.id}
                href={`/app/campaigns/${c.id}`}
                className="block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 hover:border-zinc-400 dark:hover:border-zinc-600 transition"
              >
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {c.name}
                </h3>
                {c.system && <p className="text-xs text-zinc-500 mt-1">{c.system}</p>}
                {c.venue && <p className="text-xs text-zinc-500">{c.venue}</p>}
                {c.description && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-3 line-clamp-3">
                    {c.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-8 text-center">
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              You&apos;re not in any campaigns yet.
            </p>
            <Link
              href="/app/campaigns/new"
              className="inline-block px-4 py-2 rounded-md bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 font-medium"
            >
              Create your first campaign
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
