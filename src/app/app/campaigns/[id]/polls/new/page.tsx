import { redirect } from 'next/navigation';

type Props = { params: Promise<{ id: string }> };

export default async function CampaignPollsNewRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/app/schedule?campaign=${id}&mode=poll&lock=1`);
}
