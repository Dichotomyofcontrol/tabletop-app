import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import { acceptInvite } from '@/app/app/actions';

type Props = { params: Promise<{ token: string }> };

export default async function AcceptInvitePage({ params }: Props) {
  const { token } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/signup?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const db = getAdminDb();
  const inv = await db.collection('invitations').doc(token).get();

  if (!inv.exists) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="text-center">
          <p className="text-zinc-700 dark:text-zinc-300">
            That invite doesn&apos;t exist.
          </p>
          <Link href="/app" className="underline">
            Back to app
          </Link>
        </div>
      </main>
    );
  }

  const data = inv.data()!;
  const camp = await db.collection('campaigns').doc(data.campaignId).get();
  const expired =
    data.expiresAt && new Date(data.expiresAt as string) < new Date();
  const used = !!data.acceptedAt;

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-6">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm text-center">
        <p className="text-sm uppercase tracking-widest text-zinc-500 mb-2">
          You&apos;re invited
        </p>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {(camp.data()?.name as string | undefined) ?? 'A campaign'}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Role:{' '}
          <span className="capitalize font-medium text-zinc-900 dark:text-zinc-50">
            {String(data.role)}
          </span>
        </p>

        {used ? (
          <p className="mt-6 text-sm text-zinc-500">
            This invite has already been used.
          </p>
        ) : expired ? (
          <p className="mt-6 text-sm text-red-600 dark:text-red-400">
            This invite has expired. Ask the campaign owner for a new one.
          </p>
        ) : (
          <form action={acceptInvite} className="mt-6">
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              className="w-full px-4 py-2 rounded-md bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 font-medium"
            >
              Join campaign
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
