import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import PollForm from '@/app/app/_components/poll-form';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function NewCampaignPollPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const snap = await getAdminDb().collection('campaigns').doc(id).get();
  if (!snap.exists) return notFound();
  const data = snap.data()!;
  const roles = (data.roles ?? {}) as Record<string, string>;
  if (!['owner', 'editor'].includes(roles[user.uid] ?? '')) redirect(`/app/campaigns/${id}`);

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <Link href={`/app/campaigns/${id}`} className="text-xs text-zinc-500 hover:text-zinc-200 transition">
        ← {data.name as string}
      </Link>
      <h1 className="text-3xl font-semibold text-zinc-50 tracking-tight mt-4 mb-2">Schedule by poll</h1>
      <p className="text-zinc-500 mb-8 text-sm">
        Add a few candidate dates. The party votes. When you pick a winner, it lands on the campaign calendar automatically.
      </p>
      {sp.error && (
        <p className="mb-4 px-3 py-2 rounded-md bg-red-950/40 border border-red-900/40 text-sm text-red-300">{sp.error}</p>
      )}
      <PollForm campaignId={id} />
    </div>
  );
}
