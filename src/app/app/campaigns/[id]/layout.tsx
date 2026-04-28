import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import { roleLabel } from '@/lib/roles';
import CampaignTabs from '@/app/app/_components/campaign-tabs';
import { getCampaignColor } from '@/lib/campaign-colors';

type Props = { params: Promise<{ id: string }>; children: React.ReactNode };
type Role = 'owner' | 'editor' | 'viewer';

export default async function CampaignLayout({ params, children }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const snap = await getAdminDb().collection('campaigns').doc(id).get();
  if (!snap.exists) return notFound();
  const data = snap.data()!;
  const roles = (data.roles ?? {}) as Record<string, Role>;
  const myRole = roles[user.uid] ?? null;
  if (!myRole) return notFound();
  const isOwner = myRole === 'owner';
  const color = getCampaignColor(data.color as string | undefined);
  const bannerUrl = (data.bannerUrl as string | null) ?? null;
  let gmName = (data.gmName as string | null) ?? null;
  if (!gmName && data.ownerId) {
    const ownerSnap = await getAdminDb().collection('users').doc(data.ownerId as string).get();
    gmName = (ownerSnap.data()?.displayName as string | undefined) ?? null;
  }

  return (
    <div>
      <div className="border-b border-white/[0.06] relative overflow-hidden" style={{ background: bannerUrl ? undefined : `linear-gradient(180deg, ${color.soft} 0%, transparent 60%)` }}>
        {bannerUrl && (
          <div className="absolute inset-0 z-0 pointer-events-none">
            <img src={bannerUrl} alt="" className="w-full h-full object-cover opacity-40" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(11,11,15,0.55) 0%, rgba(11,11,15,0.88) 55%, rgba(11,11,15,0.98) 90%, rgba(11,11,15,1) 100%)` }} />
          </div>
        )}
        <span className="absolute top-0 left-0 right-0 h-[2px] z-10" style={{ background: color.hex }} />
        <div className="max-w-[1100px] mx-auto px-8 pt-8 relative z-10">
          <Link href="/app" className="text-xs text-zinc-500 hover:text-zinc-200 transition">
            ← Dashboard
          </Link>
          <div className="flex items-end justify-between mt-4 flex-wrap gap-4">
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold text-zinc-50 tracking-tight truncate">{data.name as string}</h1>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-sm text-zinc-400">
                {data.system && <span>{data.system as string}</span>}
                {data.venue && (
                  <span className="before:content-['·'] before:mr-3 before:text-zinc-700">{data.venue as string}</span>
                )}
                {gmName && (
                  <span className="before:content-['·'] before:mr-3 before:text-zinc-700">GM: {gmName}</span>
                )}
                {!isOwner && (
                  <span className="before:content-['·'] before:mr-3 before:text-zinc-700">
                    You&apos;re the {roleLabel(myRole)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {(myRole === 'owner' || myRole === 'editor') && (
                <Link href={`/app/schedule?campaign=${id}&lock=1`}
                  className="btn-gold whitespace-nowrap inline-flex items-center gap-1.5">
                  <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 4 V16 M4 10 H16"/></svg>
                  Schedule a session
                </Link>
              )}
              {isOwner && (
                <Link href={`/app/campaigns/${id}/invite`} className="btn-ghost text-sm whitespace-nowrap">
                  Invite players
                </Link>
              )}
            </div>
          </div>
          {data.description && (
            <p className="mt-5 text-zinc-400 leading-relaxed max-w-2xl">{data.description as string}</p>
          )}
          <div className="mt-7">
            <CampaignTabs campaignId={id} />
          </div>
        </div>
      </div>
      <div className="max-w-[1100px] mx-auto px-8 py-8">{children}</div>
    </div>
  );
}
