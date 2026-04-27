import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import GuestForm from './guest-form';

type Props = { params: Promise<{ id: string }> };

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export default async function PublicPollPage({ params }: Props) {
  const { id } = await params;
  const db = getAdminDb();
  const snap = await db.collection('polls').doc(id).get();
  if (!snap.exists) return notFound();
  const data = snap.data()!;

  // Campaign polls aren't public — bounce to signed-in flow
  if (data.campaignId) {
    const user = await getCurrentUser();
    if (!user) redirect(`/login?next=${encodeURIComponent(`/app/polls/${id}`)}`);
    redirect(`/app/polls/${id}`);
  }

  // Logged-in users go to the canonical app URL
  const user = await getCurrentUser();
  if (user) redirect(`/app/polls/${id}`);

  const partsSnap = await db.collection('polls').doc(id).collection('participants').get();
  const participants = partsSnap.docs.map((d) => ({
    uid: d.id,
    displayName: (d.data().displayName as string) ?? 'Anon',
    isGuest: !!d.data().isGuest,
    responses: (d.data().responses as Record<string, 'yes' | 'no' | 'maybe'>) ?? {},
  }));

  const c = await cookies();
  const guestId = c.get('guestId')?.value;
  const myPart = guestId ? participants.find((p) => p.uid === guestId) : null;

  const options = (data.options as { id: string; startsAt: string }[]) ?? [];
  const status = (data.status as 'open' | 'scheduled') ?? 'open';
  const winning = data.scheduledOptionId
    ? options.find((o) => o.id === data.scheduledOptionId)
    : null;

  const tally: Record<string, { yes: number; maybe: number; no: number }> = {};
  for (const o of options) {
    tally[o.id] = {
      yes: participants.filter((p) => p.responses[o.id] === 'yes').length,
      maybe: participants.filter((p) => p.responses[o.id] === 'maybe').length,
      no: participants.filter((p) => p.responses[o.id] === 'no').length,
    };
  }

  return (
    <main className="flex flex-1 justify-center px-6 py-10">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-2 mb-7">
          <svg viewBox="0 0 64 64" className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M32 4 L58 22 L48 54 L16 54 L6 22 Z" />
            <path d="M32 4 L32 28 M58 22 L32 28 M6 22 L32 28 M48 54 L32 28 M16 54 L32 28" opacity="0.5" />
          </svg>
          <span className="font-semibold text-zinc-100 text-sm">Tabletop</span>
        </div>

        <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-[0.12em] mb-2">
          You&apos;ve been invited to a poll
        </p>
        <h1 className="text-3xl font-semibold text-zinc-50 tracking-tight mb-2">{data.title as string}</h1>
        <p className="text-sm text-zinc-500">
          {[data.system, data.venue, data.duration].filter(Boolean).join(' · ')}
          {(data.system || data.venue || data.duration) && ' · '}
          Hosted by {(data.hostName as string | null) ?? 'someone'}
        </p>
        {data.description && (
          <p className="mt-5 text-zinc-400 leading-relaxed border-l-2 border-amber-500/30 pl-4 italic">
            {data.description as string}
          </p>
        )}

        {status === 'scheduled' && winning ? (
          <div className="mt-8 rounded-lg border border-emerald-500/40 bg-emerald-500/[0.05] p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-emerald-300 mb-1">Locked in</p>
            <p className="text-xl font-semibold text-zinc-50">{fmt(winning.startsAt)}</p>
          </div>
        ) : (
          <div className="mt-8">
            <h2 className="text-xs uppercase tracking-[0.12em] text-zinc-500 font-semibold mb-3">
              Vote on the dates · {participants.length} responded
            </h2>
            <GuestForm
              pollId={id}
              options={options}
              initialName={myPart?.displayName ?? ''}
              initialResponses={Object.fromEntries(options.map((o) => [o.id, myPart?.responses[o.id] ?? null]))}
              tally={tally}
            />
          </div>
        )}

        <div className="mt-12 pt-8 border-t border-black/[0.08] dark:border-white/[0.06] text-center">
          <p className="text-sm text-zinc-500">Want to host your own polls and campaigns?</p>
          <Link href="/signup" className="btn-gold inline-block mt-3">
            Create a free account
          </Link>
        </div>
      </div>
    </main>
  );
}
