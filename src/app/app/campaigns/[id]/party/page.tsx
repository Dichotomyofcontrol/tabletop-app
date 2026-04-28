import { notFound, redirect } from 'next/navigation';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import MemberTile, { type Character, type Member } from '@/app/app/_components/member-tile';

type Props = { params: Promise<{ id: string }> };
type Role = 'owner' | 'editor' | 'viewer';

export default async function PartyPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const db = getAdminDb();
  const snap = await db.collection('campaigns').doc(id).get();
  if (!snap.exists) return notFound();
  const data = snap.data()!;
  const roles = (data.roles ?? {}) as Record<string, Role>;
  const myRole = roles[user.uid] ?? null;
  if (!myRole) return notFound();
  const isOwner = myRole === 'owner';
  const gmName = (data.gmName as string | null) ?? null;

  const memberIds = Object.keys(roles);

  // Fetch all members user docs in parallel
  const memberDocs = await Promise.all(memberIds.map((mid) => db.collection('users').doc(mid).get()));

  // Fetch characters for each member in parallel
  const charSnaps = await Promise.all(memberIds.map((mid) =>
    db.collection('campaigns').doc(id).collection('characters').where('userId', '==', mid).limit(1).get()
  ));

  const members: Member[] = memberIds.map((mid, i) => {
    const charDoc = charSnaps[i].empty ? null : charSnaps[i].docs[0];
    const character: Character | null = charDoc
      ? {
          id: charDoc.id,
          name: (charDoc.data().name as string) ?? '',
          class: (charDoc.data().class as string | null) ?? null,
          level: (charDoc.data().level as number | null) ?? null,
          sheetUrl: (charDoc.data().sheetUrl as string | null) ?? null,
          notes: (charDoc.data().notes as string | null) ?? null,
        }
      : null;
    return {
      uid: mid,
      role: roles[mid],
      displayName: (memberDocs[i].data()?.displayName as string | undefined) ?? '\u2014',
      character,
    };
  });

  // Sort: self first, then by role (owner > editor > viewer), then alphabetical
  const roleOrder: Record<Role, number> = { owner: 0, editor: 1, viewer: 2 };
  members.sort((a, b) => {
    if (a.uid === user.uid) return -1;
    if (b.uid === user.uid) return 1;
    if (roleOrder[a.role] !== roleOrder[b.role]) return roleOrder[a.role] - roleOrder[b.role];
    return a.displayName.localeCompare(b.displayName);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">Party</h2>
        <span className="text-xs text-zinc-500">{members.length} member{members.length === 1 ? '' : 's'}</span>
      </div>
      <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {members.map((m) => (
          <MemberTile key={m.uid} campaignId={id} member={m}
            isOwnerView={isOwner} isSelf={m.uid === user.uid}
            isGm={!!gmName && m.displayName.toLowerCase() === gmName.toLowerCase()} />
        ))}
      </ul>
    </div>
  );
}
