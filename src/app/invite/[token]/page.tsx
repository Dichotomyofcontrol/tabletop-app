import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import { acceptInvite } from '@/app/app/actions';

type Props = { params: Promise<{ token: string }> };

export default async function AcceptInvitePage({ params }: Props) {
  const { token } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/signup?next=${encodeURIComponent(`/invite/${token}`)}`);

  const db = getAdminDb();
  const inv = await db.collection('invitations').doc(token).get();

  if (!inv.exists) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="card-mystic rounded-xl p-8 text-center max-w-sm">
          <p className="text-zinc-300">That invite doesn&apos;t exist.</p>
          <Link href="/app" className="text-amber-300 hover:text-amber-200 underline mt-3 inline-block">
            Back to app
          </Link>
        </div>
      </main>
    );
  }

  const data = inv.data()!;
  const camp = await db.collection('campaigns').doc(data.campaignId).get();
  const expired = data.expiresAt && new Date(data.expiresAt as string) < new Date();
  const used = !!data.acceptedAt;
  const campaignName = (camp.data()?.name as string | undefined) ?? 'A campaign';

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="card-mystic rounded-xl p-8 text-center max-w-md w-full">
        <div className="mx-auto mb-6 w-12 h-12 flex items-center justify-center">
          <svg viewBox="0 0 64 64" className="w-full h-full text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M32 4 L58 22 L48 54 L16 54 L6 22 Z" />
            <path d="M32 4 L32 28 M58 22 L32 28 M6 22 L32 28 M48 54 L32 28 M16 54 L32 28" opacity="0.55" />
          </svg>
        </div>
        <span className="tag-rune mb-3 inline-block">You are summoned</span>
        <h1 className="font-display text-3xl gold-text mt-2">{campaignName}</h1>
        <p className="mt-3 text-sm text-zinc-400">
          Role: <span className="capitalize text-amber-200">{String(data.role)}</span>
        </p>

        {used ? (
          <p className="mt-6 text-sm text-zinc-500">This invite has already been used.</p>
        ) : expired ? (
          <p className="mt-6 text-sm text-red-400">Expired. Ask the owner for a new one.</p>
        ) : (
          <form action={acceptInvite} className="mt-6">
            <input type="hidden" name="token" value={token} />
            <button type="submit" className="btn-gold w-full px-4 py-2.5 rounded-md text-sm uppercase tracking-wide">
              Join the campaign
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
