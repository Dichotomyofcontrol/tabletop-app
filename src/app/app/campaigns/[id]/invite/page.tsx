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
    <div className="max-w-2xl">
      <Link href={`/app/campaigns/${id}`} className="text-sm text-zinc-500 hover:text-amber-200 transition">
        ← {camp.data()?.name ?? 'Campaign'}
      </Link>
      <h1 className="font-display text-4xl gold-text mt-4 mb-2">Summon a player</h1>
      <p className="text-zinc-400 mb-8">Generate a one-time link, share it however you like.</p>

      {sp.error && (
        <p className="mb-4 px-3 py-2 rounded-md bg-red-950/50 border border-red-900/50 text-sm text-red-300">
          {sp.error}
        </p>
      )}

      <form action={createInvite} className="card-mystic rounded-xl p-6 space-y-4 mb-10">
        <input type="hidden" name="campaign_id" value={id} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-amber-200/70">Email (optional)</span>
            <input type="email" name="email" placeholder="player@example.com"
              className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-amber-200/70">Role</span>
            <select name="role" defaultValue="viewer"
              className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md">
              <option value="viewer">Viewer · read-only</option>
              <option value="editor">Editor · can schedule sessions</option>
            </select>
          </label>
        </div>
        <button type="submit" className="btn-gold px-5 py-2.5 rounded-md text-sm uppercase tracking-wide">
          Generate invite link
        </button>
        <p className="text-xs text-zinc-500">No emails sent automatically. Copy the link and share via Discord, text, raven, etc.</p>
      </form>

      <span className="tag-rune mb-3 inline-block">Existing invites</span>
      {invites.length > 0 ? (
        <ul className="space-y-2">
          {invites.map((inv) => {
            const url = `${baseUrl}/invite/${inv.token}`;
            const used = !!inv.acceptedAt;
            const expired = !!inv.expiresAt && new Date(inv.expiresAt) < new Date();
            return (
              <li key={inv.token} className="card-mystic rounded-lg p-3">
                <div className="flex justify-between items-baseline flex-wrap gap-2">
                  <span className="text-xs text-amber-200/70 uppercase tracking-wide">
                    {inv.role}{inv.email ? ` · ${inv.email}` : ''}
                  </span>
                  <span className="text-xs">
                    {used ? <span className="text-emerald-400">✓ Accepted</span>
                      : expired ? <span className="text-red-400">Expired</span>
                      : <span className="text-zinc-500">Pending</span>}
                  </span>
                </div>
                <code className="block mt-2 text-xs text-zinc-300 break-all font-mono bg-zinc-950/50 rounded px-2 py-1.5 border border-amber-500/10">
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
