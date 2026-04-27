import Link from 'next/link';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import { createInvite } from '@/app/app/actions';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function InvitePage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const db = getAdminDb();
  const camp = await db.collection('campaigns').doc(id).get();
  if (!camp.exists) redirect('/app');

  const roles = (camp.data()?.roles ?? {}) as Record<string, string>;
  if (roles[user.uid] !== 'owner') redirect(`/app/campaigns/${id}`);

  const invitesSnap = await db
    .collection('invitations')
    .where('campaignId', '==', id)
    .orderBy('createdAt', 'desc')
    .get();
  const invites = invitesSnap.docs.map((d) => ({
    token: d.id,
    email: (d.data().email as string | null) ?? null,
    role: d.data().role as 'editor' | 'viewer',
    acceptedAt: (d.data().acceptedAt as string | null) ?? null,
    expiresAt: (d.data().expiresAt as string | null) ?? null,
  }));

  const h = await headers();
  const host = h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const baseUrl = `${proto}://${host}`;

  return (
    <div className="max-w-2xl">
      <Link
        href={`/app/campaigns/${id}`}
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
      >
        ← {camp.data()?.name ?? 'Campaign'}
      </Link>
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-3 mb-6">
        Invite players
      </h1>

      {sp.error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{sp.error}</p>
      )}

      <form
        action={createInvite}
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3 mb-8"
      >
        <input type="hidden" name="campaign_id" value={id} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-zinc-500">Email (optional)</span>
            <input
              type="email"
              name="email"
              placeholder="player@example.com"
              className="mt-1 w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50"
            />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-500">Role</span>
            <select
              name="role"
              defaultValue="viewer"
              className="mt-1 w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50"
            >
              <option value="viewer">Viewer (read-only)</option>
              <option value="editor">Editor (can add sessions, etc.)</option>
            </select>
          </label>
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-md bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 text-sm font-medium"
        >
          Generate invite link
        </button>
        <p className="text-xs text-zinc-500">
          We don&apos;t send the email automatically yet — copy the link and share it however you like.
        </p>
      </form>

      <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 mb-3">
        Invite links
      </h2>
      {invites.length > 0 ? (
        <ul className="space-y-2">
          {invites.map((inv) => {
            const url = `${baseUrl}/invite/${inv.token}`;
            const used = !!inv.acceptedAt;
            const expired = !!inv.expiresAt && new Date(inv.expiresAt) < new Date();
            return (
              <li
                key={inv.token}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-3"
              >
                <div className="flex justify-between items-baseline flex-wrap gap-2">
                  <span className="text-xs text-zinc-500 capitalize">
                    {inv.role}
                    {inv.email ? ` · ${inv.email}` : ''}
                  </span>
                  <span className="text-xs">
                    {used ? (
                      <span className="text-green-600 dark:text-green-400">
                        Accepted
                      </span>
                    ) : expired ? (
                      <span className="text-red-600 dark:text-red-400">Expired</span>
                    ) : (
                      <span className="text-zinc-500">Pending</span>
                    )}
                  </span>
                </div>
                <code className="block mt-2 text-xs text-zinc-700 dark:text-zinc-300 break-all">
                  {url}
                </code>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">No invites yet.</p>
      )}
    </div>
  );
}
