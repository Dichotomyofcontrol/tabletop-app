import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import { acceptInvite } from '@/app/app/actions';
import { roleLabel } from '@/lib/roles';

type Props = { params: Promise<{ token: string }> };

export default async function AcceptInvitePage({ params }: Props) {
  const { token } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/signup?next=${encodeURIComponent(`/invite/${token}`)}`);

  const db = getAdminDb();
  const inv = await db.collection('invitations').doc(token).get();

  if (!inv.exists) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="card-mystic rounded-xl p-8 text-center max-w-sm w-full">
          <p className="text-zinc-300">This invite link doesn&apos;t exist.</p>
          <Link href="/app" className="mt-3 inline-block text-amber-300 hover:text-amber-200 underline">
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
      <div className="card-mystic rounded-xl p-8 max-w-md w-full">
        <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-[0.12em] mb-2">You&apos;ve been invited</p>
        <h1 className="text-3xl font-semibold text-zinc-50 tracking-tight">{campaignName}</h1>
        <p className="mt-2 text-sm text-zinc-400">
          You&apos;ll join as a <span className="text-amber-300">{roleLabel(data.role as string)}</span>.
        </p>

        {used ? (
          <p className="mt-7 text-sm text-zinc-500">This invite has already been used.</p>
        ) : expired ? (
          <p className="mt-7 text-sm text-red-400">This invite has expired. Ask the organizer for a new one.</p>
        ) : (
          <form action={acceptInvite} className="mt-7">
            <input type="hidden" name="token" value={token} />
            <button type="submit" className="btn-gold w-full">Join campaign</button>
          </form>
        )}
      </div>
    </main>
  );
}
