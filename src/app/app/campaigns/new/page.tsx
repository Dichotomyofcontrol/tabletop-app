import Link from 'next/link';
import { createCampaign } from '@/app/app/actions';

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewCampaignPage({ searchParams }: Props) {
  const sp = await searchParams;
  return (
    <div className="max-w-xl mx-auto px-8 py-10">
      <Link href="/app" className="text-xs text-zinc-500 hover:text-zinc-200 transition">
        ← Dashboard
      </Link>
      <h1 className="text-3xl font-semibold text-zinc-50 tracking-tight mt-4 mb-2">New campaign</h1>
      <p className="text-zinc-500 mb-8 text-sm">Just a name to start. Everything else is editable later.</p>

      {sp.error && (
        <p className="mb-4 px-3 py-2 rounded-md bg-red-950/40 border border-red-900/40 text-sm text-red-300">
          {sp.error}
        </p>
      )}

      <form action={createCampaign} className="space-y-5">
        <label className="block">
          <span className="text-xs text-zinc-400 font-medium">Name</span>
          <input type="text" name="name" required placeholder="Curse of Strahd"
            className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
        </label>
        <label className="block">
          <span className="text-xs text-zinc-400 font-medium">Description</span>
          <textarea name="description" rows={3} placeholder="The pitch, tone, house rules…"
            className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md resize-none" />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs text-zinc-400 font-medium">System</span>
            <input type="text" name="system" placeholder="D&D 5e, Pathfinder…"
              className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-400 font-medium">Venue</span>
            <input type="text" name="venue" placeholder="TPK Brewing, online…"
              className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
          </label>
        </div>
        <button type="submit" className="btn-gold">Create campaign</button>
      </form>
    </div>
  );
}
