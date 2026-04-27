import { notFound, redirect } from 'next/navigation';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import CampaignDetailsForm from '@/app/app/_components/campaign-details-form';
import ColorPicker from '@/app/app/_components/color-picker';
import BannerUpload from '@/app/app/_components/banner-upload';
import DeleteCampaignDialog from '@/app/app/_components/delete-campaign-dialog';
import LeaveCampaignButton from '@/app/app/_components/leave-campaign-button';

type Props = { params: Promise<{ id: string }> };
type Role = 'owner' | 'editor' | 'viewer';

function SettingsCard({ title, description, children, danger }: {
  title: string;
  description?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <section className={`rounded-lg border p-6 ${
      danger ? 'border-red-900/30 bg-red-950/10' : 'border-white/[0.07] bg-zinc-900/30'
    }`}>
      <h2 className={`text-base font-semibold ${danger ? 'text-red-300' : 'text-zinc-100'}`}>{title}</h2>
      {description && <p className="text-sm text-zinc-500 mt-1 mb-5">{description}</p>}
      {!description && <div className="mb-3" />}
      <div>{children}</div>
    </section>
  );
}

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
    <div className="space-y-4 max-w-2xl">
      <SettingsCard title="Campaign details" description={canEdit ? 'Anyone in the party can see these.' : 'Only the Game Master and Co-DMs can edit.'}>
        <CampaignDetailsForm campaignId={id} canEdit={canEdit} initial={{
          name: data.name as string,
          description: (data.description as string | null) ?? null,
          system: (data.system as string | null) ?? null,
          venue: (data.venue as string | null) ?? null,
        }} />
      </SettingsCard>

      <SettingsCard title="Banner" description="A wide image for the campaign hero and dashboard card.">
        {isOwner ? (
          <BannerUpload campaignId={id} currentUrl={(data.bannerUrl as string | null) ?? null} />
        ) : (
          <p className="text-sm text-zinc-500">Only the Game Master can change the banner.</p>
        )}
      </SettingsCard>

      <SettingsCard title="Color" description="Marks this campaign in the sidebar, dashboard, and session list.">
        {canEdit ? (
          <ColorPicker campaignId={id} current={(data.color as string | undefined) ?? 'amber'} />
        ) : (
          <p className="text-sm text-zinc-500">Only the Game Master and Co-DMs can change the color.</p>
        )}
      </SettingsCard>

      <SettingsCard
        title={isOwner ? 'Danger zone' : 'Leave campaign'}
        danger
        description={isOwner
          ? 'Deleting a campaign is permanent. Sessions, characters, and pending invites will all be lost.'
          : 'Leave at any time. The Game Master can re-invite you.'}>
        {isOwner ? (
          <DeleteCampaignDialog campaignId={id} campaignName={data.name as string} />
        ) : (
          <LeaveCampaignButton campaignId={id} campaignName={data.name as string} />
        )}
      </SettingsCard>
    </div>
  );
}
