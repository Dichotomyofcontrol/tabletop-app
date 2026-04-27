import Link from 'next/link';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';

function initials(s: string) {
  return s.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

type Character = {
  id: string;
  campaignId: string;
  campaignName: string;
  campaignSystem: string | null;
  name: string;
  class: string | null;
  level: number | null;
  sheetUrl: string | null;
  notes: string | null;
};

export default async function CharactersPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const db = getAdminDb();

  const campaignsSnap = await db.collection('campaigns')
    .where('memberIds', 'array-contains', user.uid).get();

  const lists = await Promise.all(campaignsSnap.docs.map(async (campDoc) => {
    const charsSnap = await db.collection('campaigns').doc(campDoc.id)
      .collection('characters').where('userId', '==', user.uid).get();
    return charsSnap.docs.map((d) => ({
      id: d.id,
      campaignId: campDoc.id,
      campaignName: campDoc.data().name as string,
      campaignSystem: (campDoc.data().system as string | null) ?? null,
      name: (d.data().name as string) ?? 'Unnamed',
      class: (d.data().class as string | null) ?? null,
      level: (d.data().level as number | null) ?? null,
      sheetUrl: (d.data().sheetUrl as string | null) ?? null,
      notes: (d.data().notes as string | null) ?? null,
    } satisfies Character));
  }));
  const characters = lists.flat().sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="max-w-[1100px] mx-auto px-8 py-10">
      <div className="mb-10 flex items-baseline justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-50 tracking-tight">Characters</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {characters.length === 0
              ? 'You haven\u2019t created any characters yet.'
              : `${characters.length} across ${campaignsSnap.size} campaign${campaignsSnap.size === 1 ? '' : 's'}.`}
          </p>
        </div>
      </div>

      {characters.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/[0.08] p-16 text-center">
          <p className="text-zinc-300">No characters yet.</p>
          <p className="text-sm text-zinc-500 mt-1 mb-5">
            Open a campaign and add a character from the Party tab.
          </p>
          {campaignsSnap.size > 0 && (
            <Link href={`/app/campaigns/${campaignsSnap.docs[0].id}/party`} className="btn-gold inline-block">
              Add a character
            </Link>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((c) => (
            <li key={`${c.campaignId}-${c.id}`}>
              <Link href={`/app/campaigns/${c.campaignId}/party`}
                className="group block rounded-lg border border-white/[0.07] bg-zinc-900/40 p-5 hover:border-amber-500/30 transition h-full">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500/20 to-violet-500/15 border border-amber-500/30 flex items-center justify-center text-base font-semibold text-amber-100 shrink-0">
                    {initials(c.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-zinc-50 font-semibold leading-tight truncate group-hover:text-white transition">
                      {c.name}
                    </h3>
                    <p className="text-sm text-zinc-400 mt-0.5 truncate">
                      {[c.class, c.level && `Level ${c.level}`].filter(Boolean).join(' \u00b7 ') || (
                        <span className="italic text-zinc-600">Class and level not set</span>
                      )}
                    </p>
                  </div>
                </div>

                {c.notes && (
                  <p className="mt-3 text-sm text-zinc-400 line-clamp-2 leading-relaxed">{c.notes}</p>
                )}

                <div className="mt-4 pt-4 border-t border-white/[0.05] flex items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Playing in</p>
                    <p className="text-sm text-zinc-200 mt-0.5 truncate group-hover:text-amber-200 transition">
                      {c.campaignName}
                    </p>
                  </div>
                  {c.campaignSystem && (
                    <span className="text-[11px] text-zinc-500 shrink-0">{c.campaignSystem}</span>
                  )}
                </div>

                {c.sheetUrl && (
                  <p className="mt-3 text-[11px] text-zinc-500 truncate">
                    <span className="text-zinc-600">Sheet:</span>{' '}
                    <span className="text-zinc-400">{c.sheetUrl.replace(/^https?:\/\//, '')}</span>
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
