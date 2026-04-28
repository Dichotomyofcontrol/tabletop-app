import Link from 'next/link';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import { getCampaignColor } from '@/lib/campaign-colors';
import LiveRefresh from './_components/live-refresh';
import SessionsBrowser, { type BrowserSession } from './_components/sessions-browser';

type Role = 'owner' | 'editor' | 'viewer';

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) return null;
  const db = getAdminDb();

  const campaignsSnap = await db.collection('campaigns').where('memberIds', 'array-contains', user.uid).get();
  const campaigns = campaignsSnap.docs.map((d) => ({
    id: d.id,
    name: d.data().name as string,
    description: (d.data().description as string | null) ?? null,
    system: (d.data().system as string | null) ?? null,
    venue: (d.data().venue as string | null) ?? null,
    gmName: (d.data().gmName as string | null) ?? null,
    memberIds: (d.data().memberIds as string[]) ?? [],
    roles: (d.data().roles ?? {}) as Record<string, Role>,
    color: (d.data().color as string | undefined) ?? 'amber',
    bannerUrl: (d.data().bannerUrl as string | null) ?? null,
  }));

  // Resolve display names for everyone in any campaign
  const allMemberIds = Array.from(new Set(campaigns.flatMap((c) => c.memberIds)));
  const memberDocs = allMemberIds.length === 0
    ? []
    : await Promise.all(allMemberIds.map((uid) => db.collection('users').doc(uid).get()));
  const nameLookup = new Map(memberDocs.map((d) => [d.id, (d.data()?.displayName as string | undefined) ?? '?']));

  // Pull every session in every campaign + RSVPs (filtered to current members)
  const sessLists = await Promise.all(campaigns.map(async (c) => {
    const sessSnap = await db.collection('campaigns').doc(c.id).collection('sessions')
      .orderBy('startsAt', 'asc').get();
    const memberSet = new Set(c.memberIds);
    return Promise.all(sessSnap.docs.map(async (d) => {
      const rs = await db.collection('campaigns').doc(c.id).collection('sessions').doc(d.id).collection('rsvps').get();
      const rsvps = rs.docs
        .filter((r) => memberSet.has(r.id))
        .map((r) => ({
          uid: r.id,
          displayName: nameLookup.get(r.id) ?? '?',
          status: r.data().status as 'yes' | 'no' | 'maybe',
        }));
      const myRsvp = rsvps.find((r) => r.uid === user.uid)?.status ?? null;
      const myRole = c.roles[user.uid];
      const sess: BrowserSession = {
        id: d.id,
        campaignId: c.id,
        campaignName: c.name,
        campaignColor: getCampaignColor(c.color).hex,
        startsAt: d.data().startsAt as string,
        title: (d.data().title as string | null) ?? null,
        venue: (d.data().venue as string | null) ?? null,
        notes: (d.data().notes as string | null) ?? null,
        gmName: c.gmName,
        seriesId: (d.data().seriesId as string | null) ?? null,
        canEdit: myRole === 'owner' || myRole === 'editor',
        rsvps,
        myRsvp,
      };
      return sess;
    }));
  }));
  const allSessions = sessLists.flat();

  return (
    <div className="max-w-[1100px] mx-auto px-8 py-10">
      <LiveRefresh />

      {/* Page header */}
      <div className="mb-10">
        <h1 className="text-3xl font-semibold text-zinc-50 tracking-tight">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {allSessions.filter((s) => new Date(s.startsAt).getTime() >= Date.now()).length === 0
            ? 'Nothing scheduled across your campaigns.'
            : `Across ${campaigns.length} campaign${campaigns.length === 1 ? '' : 's'}.`}
        </p>
      </div>

      {/* All campaigns rail */}
      <section className="mb-10">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">All campaigns</h2>
          <Link href="/app/campaigns/new" className="text-xs text-amber-300 hover:text-amber-200 transition">+ New campaign</Link>
        </div>
        {campaigns.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((c) => (
              <Link key={c.id} href={`/app/campaigns/${c.id}`}
                className="group rounded-lg border border-white/[0.07] bg-zinc-900/40 hover:border-white/[0.14] transition relative overflow-hidden color-bar block" style={{ ['--c' as string]: getCampaignColor(c.color).hex }}>
                {c.bannerUrl && (
                  <div className="aspect-[3/1] w-full overflow-hidden border-b border-white/[0.06]">
                    <img src={c.bannerUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  </div>
                )}
                <div className="p-5">
                  <h3 className="text-zinc-100 font-medium leading-tight group-hover:text-white transition">{c.name}</h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    {[c.system, c.venue].filter(Boolean).join(' \u00b7 ') || 'No details yet'}
                  </p>
                  {c.description && (
                    <p className="text-sm text-zinc-400 mt-3 line-clamp-2 leading-relaxed">{c.description}</p>
                  )}
                  <p className="text-xs text-zinc-500 mt-4 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-zinc-600" />
                    {c.memberIds.length} player{c.memberIds.length === 1 ? '' : 's'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/[0.08] p-12 text-center">
            <p className="text-zinc-300">No campaigns yet.</p>
            <p className="text-sm text-zinc-500 mt-1 mb-5">Create your first one to get started.</p>
            <Link href="/app/campaigns/new" className="btn-gold inline-block">Create campaign</Link>
          </div>
        )}
      </section>

      <div className="my-10 h-px bg-black/[0.08] dark:bg-white/[0.06]" />

      {/* Sessions browser */}
      <section>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="text-lg font-semibold text-zinc-100">Sessions</h2>
        </div>
        <SessionsBrowser sessions={allSessions} />
      </section>
    </div>
  );
}
