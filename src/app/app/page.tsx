import Link from 'next/link';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import { rsvp } from './actions';

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}
function countdown(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return 'now';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  if (d > 0) return `in ${d}d ${h}h`;
  if (h > 0) return `in ${h}h`;
  return `in ${Math.floor(ms / 60000)}m`;
}

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) return null;
  const db = getAdminDb();

  const campaignsSnap = await db.collection('campaigns')
    .where('memberIds', 'array-contains', user.uid).get();
  const campaigns = campaignsSnap.docs.map((d) => ({
    id: d.id,
    name: d.data().name as string,
    description: (d.data().description as string | null) ?? null,
    system: (d.data().system as string | null) ?? null,
    venue: (d.data().venue as string | null) ?? null,
  }));

  const nowIso = new Date().toISOString();
  const sessionLists = await Promise.all(campaigns.map(async (c) => {
    const snap = await db.collection('campaigns').doc(c.id).collection('sessions')
      .where('startsAt', '>=', nowIso).orderBy('startsAt', 'asc').limit(3).get();
    return snap.docs.map((d) => ({
      id: d.id,
      campaignId: c.id,
      campaignName: c.name,
      startsAt: d.data().startsAt as string,
      title: (d.data().title as string | null) ?? null,
      venue: (d.data().venue as string | null) ?? null,
    }));
  }));
  const upcoming = sessionLists.flat().sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const next = upcoming[0];

  let myRsvp: 'yes' | 'no' | 'maybe' | null = null;
  if (next) {
    const rsvpDoc = await db.collection('campaigns').doc(next.campaignId)
      .collection('sessions').doc(next.id).collection('rsvps').doc(user.uid).get();
    myRsvp = (rsvpDoc.data()?.status as 'yes' | 'no' | 'maybe' | null) ?? null;
  }

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <span className="tag-rune">Next session</span>
          {next && <span className="text-xs text-amber-200/60 font-mono">{countdown(next.startsAt)}</span>}
        </div>
        {next ? (
          <div className="card-mystic rounded-xl p-7 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <h2 className="font-display text-3xl md:text-4xl text-amber-50 leading-tight">
                {next.campaignName}
              </h2>
              {next.title && (
                <p className="font-display text-xl text-amber-200/70 mt-1 italic">— {next.title}</p>
              )}
              <p className="mt-4 text-zinc-300">
                {fmtWhen(next.startsAt)}
                {next.venue && <span className="text-zinc-500"> · {next.venue}</span>}
              </p>
              <div className="mt-6 flex flex-wrap gap-2 items-center">
                {(['yes', 'maybe', 'no'] as const).map((s) => (
                  <form key={s} action={rsvp}>
                    <input type="hidden" name="session_id" value={next.id} />
                    <input type="hidden" name="campaign_id" value={next.campaignId} />
                    <input type="hidden" name="status" value={s} />
                    <button type="submit"
                      className={`px-4 py-2 rounded-md text-sm font-medium uppercase tracking-wide transition ${
                        myRsvp === s
                          ? 'btn-gold'
                          : 'btn-ghost'
                      }`}>
                      {s === 'yes' ? "I'm in" : s === 'maybe' ? 'Maybe' : 'Out'}
                    </button>
                  </form>
                ))}
                <Link href={`/app/campaigns/${next.campaignId}`}
                  className="ml-auto text-sm text-amber-300/80 hover:text-amber-200">
                  View campaign →
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="card-mystic rounded-xl p-10 text-center">
            <p className="text-zinc-400">No upcoming sessions. Add one from a campaign page.</p>
          </div>
        )}
      </section>

      {/* Campaigns */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <span className="tag-rune">My campaigns</span>
          <Link href="/app/campaigns/new"
            className="text-sm text-amber-300 hover:text-amber-200 transition">
            + New campaign
          </Link>
        </div>
        {campaigns.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((c) => (
              <Link key={c.id} href={`/app/campaigns/${c.id}`}
                className="card-mystic rounded-lg p-5 block group">
                <h3 className="font-display text-amber-100 text-lg leading-snug group-hover:text-amber-50 transition">
                  {c.name}
                </h3>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {c.system && <span className="tag-rune !text-[10px] !py-0.5">{c.system}</span>}
                  {c.venue && <span className="tag-rune !text-[10px] !py-0.5 !bg-violet-500/8 !text-violet-300 !border-violet-500/20">{c.venue}</span>}
                </div>
                {c.description && (
                  <p className="text-sm text-zinc-400 mt-3 line-clamp-3 leading-relaxed">{c.description}</p>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="card-mystic rounded-xl p-10 text-center">
            <p className="text-zinc-400 mb-5">No campaigns yet — every legend starts somewhere.</p>
            <Link href="/app/campaigns/new" className="btn-gold inline-block px-6 py-2.5 rounded-md text-sm uppercase tracking-wide">
              Create your first campaign
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
