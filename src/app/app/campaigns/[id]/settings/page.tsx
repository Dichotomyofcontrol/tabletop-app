import { notFound, redirect } from 'next/navigation';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import CampaignDetailsForm from '@/app/app/_components/campaign-details-form';
import ColorPicker from '@/app/app/_components/color-picker';
import DeleteCampaignDialog from '@/app/app/_components/delete-campaign-dialog';
import LeaveCampaignButton from '@/app/app/_components/leave-campaign-button';

type Props = { params: Promise<{ id: string }> };
type Role = 'owner' | 'editor' | 'viewer';

export default async function CampaignSettingsPage({ params }: Props) {
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
  const canEdit = isOwner || myRole === 'editor';

  return (
    <div className="space-y-12 max-w-2xl">
      <section>
        <h2 className="text-lg font-semibold text-zinc-100 mb-1">Campaign details</h2>
        <p className="text-sm text-zinc-500 mb-6">
          {canEdit ? 'Anyone in the party can see these.' : 'Only the Game Master and Co-DMs can edit.'}
        </p>
        <CampaignDetailsForm campaignId={id} canEdit={canEdit} initial={{
          name: data.name as string,
          description: (data.description as string | null) ?? null,
          system: (data.system as string | null) ?? null,
          venue: (data.venue as string | null) ?? null,
        }} />
      </section>

      <section className="border-t border-white/[0.06] pt-8">
        <h2 className="text-lg font-semibold text-zinc-100 mb-1">Color</h2>
        <p className="text-sm text-zinc-500 mb-5">Pick a hue. It marks this campaign in the sidebar, dashboard, and session list.</p>
        {canEdit ? (
          <ColorPicker campaignId={id} current={(data.color as string | undefined) ?? 'amber'} />
        ) : (
          <p className="text-sm text-zinc-500">Only the Game Master and Co-DMs can change the color.</p>
        )}
      </section>

      <section className="border-t border-white/[0.06] pt-8">
        <h2 className="text-lg font-semibold text-red-300 mb-1">{isOwner ? 'Danger zone' : 'Leave campaign'}</h2>
        <p className="text-sm text-zinc-500 mb-5">
          {isOwner
            ? 'Deleting a campaign is permanent. Sessions, characters, and pending invites will all be lost.'
            : 'Leave at any time. The Game Master can re-invite you.'}
        </p>
        {isOwner ? (
          <DeleteCampaignDialog campaignId={id} campaignName={data.name as string} />
        ) : (
          <LeaveCampaignButton campaignId={id} campaignName={data.name as string} />
        )}
      </section>
    </div>
  );
}
