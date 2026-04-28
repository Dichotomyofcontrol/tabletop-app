import Link from 'next/link';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import RsvpChip from './_components/rsvp-chip';
import { getCampaignColor } from '@/lib/campaign-colors';
import { LocalTime, LocalFullDate, LocalDow, LocalDay } from './_components/local-time';

function fmtDow(iso: string) { return new Date(iso).toLocaleDateString('en-US', { weekday: 'short' }); }
function fmtDay(iso: string) { return new Date(iso).getDate(); }
function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
function fmtFullDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}
function countdown(min: number) {
  if (min < 0) return 'in progress';
  if (min < 60) return `in ${Math.floor(min)}m`;
  if (min < 24 * 60) { const h = Math.floor(min / 60); return `in ${h}h ${Math.floor(min - h * 60)}m`; }
  const d = Math.floor(min / (24 * 60));
  return `in ${d}d`;
}
function initials(name: string) { return name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase(); }

type Sess = {
  id: string; campaignId: string; campaignName: string;
  startsAt: string; title: string | null; venue: string | null;
  rsvps: { uid: string; status: 'yes' | 'no' | 'maybe' }[];
};

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
    memberIds: (d.data().memberIds as string[]) ?? [],
    color: (d.data().color as string | undefined) ?? 'amber',
    bannerUrl: (d.data().bannerUrl as string | null) ?? null,
  }));
  const allMemberIds = Array.from(new Set(campaigns.flatMap((c) => c.memberIds)));
  const memberDocs = allMemberIds.length === 0 ? [] : await Promise.all(allMemberIds.map((uid) => db.collection('users').doc(uid).get()));
  const nameLookup = new Map(memberDocs.map((d) => [d.id, (d.data()?.displayName as string | undefined) ?? '?']));

  const nowIso = new Date().toISOString();
  const sessLists = await Promise.all(campaigns.map(async (c) => {
    const snap = await db.collection('campaigns').doc(c.id).collection('sessions')
      .where('startsAt', '>=', nowIso).orderBy('startsAt', 'asc').limit(3).get();
    return Promise.all(snap.docs.map(async (d) => {
      const rs = await db.collection('campaigns').doc(c.id).collection('sessions').doc(d.id).collection('rsvps').get();
      return {
        id: d.id, campaignId: c.id, campaignName: c.name,
        startsAt: d.data().startsAt as string,
        title: (d.data().title as string | null) ?? null,
        venue: (d.data().venue as string | null) ?? null,
        rsvps: rs.docs.map((r) => ({ uid: r.id, status: r.data().status as 'yes' | 'no' | 'maybe' })),
      };
    }));
  }));
  const colorByCampaign = new Map(campaigns.map((c) => [c.id, getCampaignColor(c.color).hex]));
  const upcoming = sessLists.flat().sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const next: Sess | undefined = upcoming[0];
  const upNext = upcoming.slice(1, 6);

  const minutesUntil = next ? (new Date(next.startsAt).getTime() - Date.now()) / 60000 : null;
  const isUrgent = minutesUntil != null && minutesUntil < 60;
  const isTonight = minutesUntil != null && minutesUntil < 24 * 60;

  let myRsvp: 'yes' | 'no' | 'maybe' | null = null;
  if (next) myRsvp = next.rsvps.find((r) => r.uid === user.uid)?.status ?? null;

  const totalConfirmed = next ? next.rsvps.filter((r) => r.status === 'yes').length : 0;
  const totalRsvps = next ? next.rsvps.length : 0;

  return (
    <div className="max-w-[1100px] mx-auto px-8 py-10">
      {/* Page header */}
      <div className="mb-10 flex items-baseline justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-50 tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {next ? `Your next session is ${countdown(minutesUntil!)}.` : 'Nothing scheduled across your campaigns.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/app/campaigns/new" className="text-xs text-zinc-500 hover:text-zinc-200 transition whitespace-nowrap">
            New campaign
          </Link>
          <Link href="/app/schedule" className="btn-gold inline-flex items-center gap-1.5 whitespace-nowrap">
            <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 4 V16 M4 10 H16"/></svg>
            Schedule a session
          </Link>
        </div>
      </div>

      <section>
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
                  {[c.system, c.venue].filter(Boolean).join(' · ') || 'No details yet'}
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


      {next ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-12">
          {/* Hero card — 2/3 */}
          <div className="lg:col-span-2">
            <div className={`relative rounded-xl border bg-zinc-900/40 p-7 overflow-hidden ${isUrgent ? 'border-amber-500/40' : 'border-white/[0.07]'}`}>
              <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: colorByCampaign.get(next.campaignId) ?? '#f59e0b' }} />
              {isUrgent && (
                <span className="absolute top-5 right-5 inline-flex items-center gap-1.5 text-[11px] text-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Starting soon
                </span>
              )}
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500 mb-2">
                {isUrgent ? 'Now' : isTonight ? 'Tonight' : 'Next session'}
              </p>
              <h2 className="text-3xl md:text-4xl font-semibold text-zinc-50 leading-[1.1] tracking-tight">
                {next.campaignName}
              </h2>
              {next.title && <p className="text-lg text-zinc-400 mt-1.5">{next.title}</p>}
              <div className="mt-5 flex items-center gap-5 text-sm text-zinc-400">
                <span className="flex items-center gap-2">
                  <svg viewBox="0 0 16 16" className="w-4 h-4 opacity-60" fill="currentColor"><path d="M5 1a1 1 0 0 1 1 1v1h4V2a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h1V2a1 1 0 0 1 1-1Zm-2 6v7h10V7H3Z"/></svg>
                  <LocalFullDate iso={next.startsAt} />
                </span>
                <span className="flex items-center gap-2">
                  <svg viewBox="0 0 16 16" className="w-4 h-4 opacity-60" fill="currentColor"><path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm.75 3.5a.75.75 0 0 0-1.5 0v4c0 .2.08.39.22.53l2.5 2.5a.75.75 0 0 0 1.06-1.06L8.75 8.19V4.5Z"/></svg>
                  <LocalTime iso={next.startsAt} />
                </span>
                {next.venue && (
                  <span className="flex items-center gap-2">
                    <svg viewBox="0 0 16 16" className="w-4 h-4 opacity-60" fill="currentColor"><path d="M8 0a5 5 0 0 1 5 5c0 3.5-5 11-5 11S3 8.5 3 5a5 5 0 0 1 5-5Zm0 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg>
                    {next.venue}
                  </span>
                )}
              </div>
              <div className="mt-7 flex items-center gap-4 flex-wrap">
                <RsvpChip sessionId={next.id} campaignId={next.campaignId} current={myRsvp} />
                <Link href={`/app/campaigns/${next.campaignId}`} className="text-sm text-zinc-400 hover:text-zinc-100 transition">
                  Open campaign →
                </Link>
              </div>
            </div>
          </div>

          {/* Side panel — 1/3 — party preview */}
          <div className="rounded-xl border border-white/[0.07] bg-zinc-900/40 p-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500 mb-3">The party</p>
            {totalRsvps > 0 ? (
              <>
                <p className="text-2xl font-semibold text-zinc-50">
                  {totalConfirmed} <span className="text-zinc-500 text-base font-normal">confirmed</span>
                </p>
                <p className="text-xs text-zinc-500 mt-1">{totalRsvps} of {(campaigns.find(c => c.id === next.campaignId)?.memberIds.length) ?? 0} have responded</p>
                <ul className="mt-5 space-y-2">
                  {next.rsvps.slice().sort((a,b) => ({yes:0,maybe:1,no:2})[a.status] - ({yes:0,maybe:1,no:2})[b.status]).slice(0, 6).map(r => {
                    const name = nameLookup.get(r.uid) ?? '?';
                    return (
                      <li key={r.uid} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-6 h-6 rounded-full border border-white/10 flex items-center justify-center text-[10px] font-semibold shrink-0 ${
                            r.status === 'yes' ? 'bg-lime-500/15 text-lime-200' :
                            r.status === 'maybe' ? 'bg-amber-500/15 text-amber-200' :
                            'bg-zinc-800/50 text-zinc-500'
                          }`}>{initials(name)}</span>
                          <span className="text-zinc-200 truncate">{name}</span>
                        </span>
                        <span className={`text-xs ${
                          r.status === 'yes' ? 'text-lime-300' :
                          r.status === 'maybe' ? 'text-amber-300' :
                          'text-zinc-500'
                        }`}>
                          {r.status === 'yes' ? 'In' : r.status === 'maybe' ? 'Maybe' : 'Out'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <p className="text-sm text-zinc-500 mt-2">No one has responded yet.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/[0.08] p-16 text-center mb-12">
          <p className="text-zinc-300 text-lg">No sessions scheduled.</p>
          <p className="text-sm text-zinc-500 mt-1">Open a campaign to schedule one.</p>
        </div>
      )}

      {/* Coming up */}
      {upNext.length > 0 && (
        <section className="mb-12">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Coming up</h2>
            <span className="text-xs text-zinc-600">{upNext.length} more</span>
          </div>
          <ul className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
            {upNext.map((s) => {
              const myRsvp = s.rsvps.find((r) => r.uid === user.uid)?.status ?? null;
              const color = colorByCampaign.get(s.campaignId) ?? '#f59e0b';
              return (
                <li key={s.id} className="flex items-center gap-3 py-1">
                  <Link href={`/app/campaigns/${s.campaignId}`}
                    className="flex items-center gap-4 flex-1 min-w-0 px-3 py-2.5 -mx-3 rounded-md hover:bg-white/[0.04] transition group">
                    <div className="w-12 shrink-0 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium"><LocalDow iso={s.startsAt} /></p>
                      <p className="text-lg font-semibold leading-none mt-0.5" style={{ color }}><LocalDay iso={s.startsAt} /></p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-zinc-100 truncate group-hover:text-white transition">
                        <span className="font-medium">{s.campaignName}</span>
                        {s.title && <span className="text-zinc-500"> · {s.title}</span>}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5"><LocalTime iso={s.startsAt} />{s.venue && ` · ${s.venue}`}</p>
                    </div>
                    <span className="text-xs text-zinc-500 shrink-0">{s.rsvps.filter((r) => r.status === 'yes').length} in</span>
                  </Link>
                  <RsvpChip sessionId={s.id} campaignId={s.campaignId} current={myRsvp} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Campaigns */}
</div>
  );
}
