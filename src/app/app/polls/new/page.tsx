import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/firebase/server';
import PollForm from '@/app/app/_components/poll-form';

export default async function NewPollPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <Link href="/app/polls" className="text-xs text-zinc-500 hover:text-zinc-200 transition">
        ← Polls
      </Link>
      <h1 className="text-3xl font-semibold text-zinc-50 tracking-tight mt-4 mb-2">Start a one-shot poll</h1>
      <p className="text-zinc-500 mb-8 text-sm">
        Add candidate dates. Share the link. Pick a winner when the votes are in.
      </p>
      <PollForm />
    </div>
  );
}
