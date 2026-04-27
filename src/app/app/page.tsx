import Link from 'next/link';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import RsvpChip from './_components/rsvp-chip';

function fmtFullDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function countdown(min: number) {
  if (min < 0) return 'now';
  if (min < 60) return `in ${Math.floor(min)}m`;
  if (min < 24*60) { const h = Math.floor(min/60); return `in ${h}h ${Math.floor(min - h*60)}m`; }
  return `in ${Math.floor(min/(24*60))}d`;
}
function initials(name: string) { return name.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase(); }

type Next = {
  id: string; campaignId: string; campaignName: string;
  startsAt: string; title: string | null; venue: string | null;
  rsvps: { uid: string; status: 'yes'|'no'|'maybe' }[];
};

function PartyFaces({ rsvps, nameLookup }: { rsvps: Next['rsvps']; nameLookup: Map<string, string> }) {
  const order = { yes: 0, maybe: 1, no: 2 };
  const sorted = [...rsvps].sort((a, b) => order[a.status] - order[b.status]);
  const visible = sorted.slice(0, 6);
  const extra = sorted.length - visible.length;
  if (visible.length === 0) return <p className="text-sm text-zinc-500">No RSVPs yet.</p>;
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {visible.map(r => {
          const name = nameLookup.get(r.uid) ?? '?';
          return <span key={r.uid} title={`${name} \u00b7 ${r.status}`} className={`avatar avatar-${r.status}`}>{initials(name)}</span>;
        })}
        {extra > 0 && <span className="avatar text-zinc-300">+{extra}</span>}
      </div>
      <span className="text-xs text-zinc-500 ml-1">{rsvps.filter(r => r.status === 'yes').length} confirmed</span>
    </div>
  );
}

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) return null;
  const db = getAdminDb();

  const campaignsSnap = await db.collection('campaigns').where('memberIds', 'array-contains', user.uid).get();
  const campaigns = campaignsSnap.docs.map(d => ({
    id: d.id,
    name: d.data().name as string,
    description: (d.data().description as string | null) ?? null,
    system: (d.data().system as string | null) ?? null,
    venue: (d.data().venue as string | null) ?? null,
    memberIds: (d.data().memberIds as string[]) ?? [],
  }));
  const allMemberIds = Array.from(new Set(campaigns.flatMap(c => c.memberIds)));
  const memberDocs = allMemberIds.length === 0 ? [] : await Promise.all(allMemberIds.map(uid => db.collection('users').doc(uid).get()));
  const nameLookup = new Map(memberDocs.map(d => [d.id, (d.data()?.displayName as string | undefined) ?? '?']));

  const nowIso = new Date().toISOString();
  const sessionLists = await Promise.all(campaigns.map(async c => {
    const snap = await db.collection('campaigns').doc(c.id).collection('sessions')
      .where('startsAt', '>=', nowIso).orderBy('startsAt', 'asc').limit(2).get();
    return Promise.all(snap.docs.map(async d => {
      const rsvpsSnap = await db.collection('campaigns').doc(c.id).collection('sessions').doc(d.id).collection('rsvps').get();
      return {
        id: d.id, campaignId: c.id, campaignName: c.name,
        startsAt: d.data().startsAt as string,
        title: (d.data().title as string | null) ?? null,
        venue: (d.data().venue as string | null) ?? null,
        rsvps: rsvpsSnap.docs.map(r => ({ uid: r.id, status: r.data().status as 'yes'|'no'|'maybe' })),
      };
    }));
  }));
  const upcoming = sessionLists.flat().sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const next: Next | undefined = upcoming[0];
  const minutesUntil = next ? (new Date(next.startsAt).getTime() - Date.now()) / 60000 : null;
  const state = next == null ? 'empty' : minutesUntil! < 60 ? 'urgent' : minutesUntil! < 24*60 ? 'focused' : 'calm';
  let myRsvp: 'yes'|'no'|'maybe'|null = null;
  if (next) myRsvp = next.rsvps.find(r => r.uid === user.uid)?.status ?? null;

  return (
    <div className="space-y-12">
      {state === 'urgent' && next && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <span className="tag-rune !text-red-300 !bg-red-500/10 !border-red-500/30">Starting soon</span>
            <span className="text-xs text-amber-200 font-mono">{countdown(minutesUntil!)}</span>
          </div>
          <div className="card-mystic urgent-glow rounded-xl p-7 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <h2 className="font-display text-3xl md:text-4xl text-amber-50 leading-tight">{next.campaignName}</h2>
              {next.title && <p className="font-display text-xl text-amber-200/70 mt-1 italic">— {next.title}</p>}
              <p className="mt-3 text-zinc-200 text-lg">
                {fmtTime(next.startsAt)}{next.venue && <span className="text-zinc-500"> \u00b7 {next.venue}</span>}
              </p>
              <div className="mt-5"><PartyFaces rsvps={next.rsvps} nameLookup={nameLookup} /></div>
              <div className="mt-6 flex items-center gap-3 flex-wrap">
                <RsvpChip sessionId={next.id} campaignId={next.campaignId} current={myRsvp} />
                <Link href={`/app/campaigns/${next.campaignId}`} className="ml-auto text-sm text-amber-300 hover:text-amber-200 transition">View campaign \u2192</Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {state === 'focused' && next && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <span className="tag-rune">Tonight</span>
            <span className="text-xs text-amber-200/70 font-mono">{countdown(minutesUntil!)}</span>
          </div>
          <div className="card-mystic rounded-xl p-7 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <h2 className="font-display text-3xl md:text-4xl text-amber-50 leading-tight">{next.campaignName}</h2>
              {next.title && <p className="font-display text-xl text-amber-200/70 mt-1 italic">— {next.title}</p>}
              <p className="mt-3 text-zinc-300">{fmtFullDate(next.startsAt)} at {fmtTime(next.startsAt)}{next.venue && <span className="text-zinc-500"> \u00b7 {next.venue}</span>}</p>
              <div className="mt-5"><PartyFaces rsvps={next.rsvps} nameLookup={nameLookup} /></div>
              <div className="mt-6 flex items-center gap-3 flex-wrap">
                <RsvpChip sessionId={next.id} campaignId={next.campaignId} current={myRsvp} />
                <Link href={`/app/campaigns/${next.campaignId}`} className="ml-auto text-sm text-amber-300 hover:text-amber-200 transition">View campaign \u2192</Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {state === 'calm' && next && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <span className="tag-rune">Next session</span>
            <span className="text-xs text-zinc-500 font-mono">{countdown(minutesUntil!)}</span>
          </div>
          <div className="card-mystic rounded-xl p-7">
            <h2 className="font-display text-2xl md:text-3xl text-amber-50">{next.campaignName}</h2>
            {next.title && <p className="font-display text-lg text-amber-200/70 mt-1 italic">— {next.title}</p>}
            <p className="mt-3 text-zinc-300">{fmtFullDate(next.startsAt)} at {fmtTime(next.startsAt)}{next.venue && <span className="text-zinc-500"> \u00b7 {next.venue}</span>}</p>
            <div className="mt-4"><PartyFaces rsvps={next.rsvps} nameLookup={nameLookup} /></div>
            <div className="mt-5 flex items-center gap-3 flex-wrap">
              <RsvpChip sessionId={next.id} campaignId={next.campaignId} current={myRsvp} />
              <Link href={`/app/campaigns/${next.campaignId}`} className="ml-auto text-sm text-amber-300 hover:text-amber-200 transition">View campaign \u2192</Link>
            </div>
          </div>
        </section>
      )}

      {state === 'empty' && (
        <section>
          <span className="tag-rune mb-3 inline-block">Next session</span>
          <div className="card-mystic rounded-xl p-12 text-center">
            <p className="text-zinc-400 text-lg">The calendar is empty. Quiet, for now.</p>
            <p className="text-sm text-zinc-500 mt-2">Schedule a session from any campaign.</p>
          </div>
        </section>
      )}

      <section>
        <div className="flex items-baseline justify-between mb-4">
          <span className="tag-rune">My campaigns</span>
          <Link href="/app/campaigns/new" className="text-sm text-amber-300 hover:text-amber-200 transition">+ New campaign</Link>
        </div>
        {campaigns.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map(c => (
              <Link key={c.id} href={`/app/campaigns/${c.id}`} className="card-mystic card-lift rounded-lg p-5 block group">
                <h3 className="font-display text-amber-100 text-lg leading-snug group-hover:text-amber-50 transition">{c.name}</h3>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {c.system && <span className="tag-rune !text-[10px] !py-0.5">{c.system}</span>}
                  {c.venue && <span className="tag-rune !text-[10px] !py-0.5 !bg-violet-500/8 !text-violet-300 !border-violet-500/20">{c.venue}</span>}
                </div>
                {c.description && <p className="text-sm text-zinc-400 mt-3 line-clamp-3 leading-relaxed">{c.description}</p>}
              </Link>
            ))}
          </div>
        ) : (
          <div className="card-mystic rounded-xl p-12 text-center">
            <div className="mx-auto mb-5 w-12 h-12 flex items-center justify-center opacity-60">
              <svg viewBox="0 0 64 64" className="w-full h-full text-amber-400" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M32 4 L58 22 L48 54 L16 54 L6 22 Z" />
                <path d="M32 4 L32 28 M58 22 L32 28 M6 22 L32 28 M48 54 L32 28 M16 54 L32 28" opacity="0.55" />
              </svg>
            </div>
            <p className="font-display text-amber-100 text-xl">Every legend starts somewhere.</p>
            <p className="text-zinc-400 mt-2 mb-6">Your tale awaits.</p>
            <Link href="/app/campaigns/new" className="btn-gold inline-block px-6 py-2.5 rounded-md text-sm uppercase tracking-wide">Begin your first campaign</Link>
          </div>
        )}
      </section>
    </div>
  );
}
