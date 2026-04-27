import { notFound, redirect } from 'next/navigation';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import MemberRow from '@/app/app/_components/member-row';
import CharacterForm from '@/app/app/_components/character-form';

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

  const memberIds = Object.keys(roles);
  const memberDocs = await Promise.all(memberIds.map((mid) => db.collection('users').doc(mid).get()));
  const members = memberIds.map((mid, i) => ({
    uid: mid, role: roles[mid],
    displayName: (memberDocs[i].data()?.displayName as string | undefined) ?? '—',
  }));

  const myCharSnap = await db.collection('campaigns').doc(id).collection('characters')
    .where('userId', '==', user.uid).limit(1).get();
  const myCharacter = myCharSnap.empty ? null : {
    id: myCharSnap.docs[0].id,
    name: (myCharSnap.docs[0].data().name as string) ?? '',
    class: (myCharSnap.docs[0].data().class as string | null) ?? null,
    level: (myCharSnap.docs[0].data().level as number | null) ?? null,
    sheetUrl: (myCharSnap.docs[0].data().sheetUrl as string | null) ?? null,
    notes: (myCharSnap.docs[0].data().notes as string | null) ?? null,
  };

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-100">Members</h2>
          <span className="text-xs text-zinc-500">{members.length}</span>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {members.map((m) => (
            <MemberRow key={m.uid} campaignId={id} member={m} isOwnerView={isOwner} isSelf={m.uid === user.uid} />
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">My character</h2>
        <CharacterForm campaignId={id} character={myCharacter} />
      </section>
    </div>
  );
}
