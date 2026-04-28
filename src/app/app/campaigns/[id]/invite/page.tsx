import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import { createInvite } from '@/app/app/actions';
import RevokeInviteButton from '@/app/app/_components/revoke-invite-button';
import CopyLinkButton from '@/app/app/_components/copy-link-button';
import { ROLE_LABELS } from '@/lib/roles';

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
  if (!camp.exists) return notFound();
  const roles = (camp.data()?.roles ?? {}) as Record<string, string>;
  if (roles[user.uid] !== 'owner') redirect(`/app/campaigns/${id}`);

  const invitesSnap = await db.collection('invitations').where('campaignId', '==', id).get();
  const invites = invitesSnap.docs.map((d) => ({
    token: d.id,
    email: (d.data().email as string | null) ?? null,
    role: d.data().role as 'editor' | 'viewer',
    acceptedAt: (d.data().acceptedAt as string | null) ?? null,
    expiresAt: (d.data().expiresAt as string | null) ?? null,
    createdAt: (d.data().createdAt as string) ?? '',
  })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const h = await headers();
  const host = h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const baseUrl = `${proto}://${host}`;

  return (
    <div className="space-y-10 max-w-2xl">
      <section>
        <h2 className="text-lg font-semibold text-zinc-100 mb-1">Invite players</h2>
        <p className="text-sm text-zinc-500 mb-6">Generate a link, share it however you like.</p>

        {sp.error && (
          <p className="mb-4 px-3 py-2 rounded-md bg-red-950/40 border border-red-900/40 text-sm text-red-300">
            {sp.error}
          </p>
        )}

        <form action={createInvite} className="space-y-5">
          <input type="hidden" name="campaign_id" value={id} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs text-zinc-400 font-medium">Email (optional)</span>
              <input type="email" name="email" placeholder="player@example.com"
                className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
            </label>
            <label className="block">
              <span className="text-xs text-zinc-400 font-medium">Role</span>
              <select name="role" defaultValue="viewer"
                className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md">
                <option value="viewer">{ROLE_LABELS.viewer} · read-only</option>
                <option value="editor">{ROLE_LABELS.editor} · can schedule</option>
              </select>
            </label>
          </div>
          <button type="submit" className="btn-gold">Generate link</button>
        </form>
      </section>

      <section className="border-t border-white/[0.06] pt-8">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">Pending invites</h2>
        {invites.length > 0 ? (
          <ul className="space-y-2">
            {invites.map((inv) => {
              const url = `${baseUrl}/invite/${inv.token}`;
              const used = !!inv.acceptedAt;
              const expired = !!inv.expiresAt && new Date(inv.expiresAt) < new Date();
              return (
                <li key={inv.token} className="rounded-lg border border-white/[0.07] bg-zinc-900/40 p-4">
                  <div className="flex justify-between items-baseline gap-3 flex-wrap">
                    <span className="text-xs text-zinc-400">
                      {ROLE_LABELS[inv.role]}{inv.email && <span className="text-zinc-600"> · {inv.email}</span>}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">
                        {used ? <span className="text-emerald-400">Accepted</span>
                          : expired ? <span className="text-red-400">Expired</span>
                          : <span className="text-zinc-500">Pending</span>}
                      </span>
                      {!used && !expired && <RevokeInviteButton token={inv.token} />}
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-start gap-2.5">
                    <code className="flex-1 text-xs text-zinc-300 font-mono bg-zinc-950/60 rounded px-2.5 py-2 border border-white/[0.05] break-all">
                      {url}
                    </code>
                    <div className="pt-1.5">
                      <CopyLinkButton url={url} label="Copy" />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">No invites sent yet.</p>
        )}
      </section>
    </div>
  );
}
