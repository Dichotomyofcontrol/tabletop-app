import Link from 'next/link';
import { createCampaign } from '@/app/app/actions';

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewCampaignPage({ searchParams }: Props) {
  const sp = await searchParams;
  return (
    <div className="max-w-xl">
      <Link href="/app" className="text-sm text-zinc-500 hover:text-amber-200 transition">
        ← Dashboard
      </Link>
      <h1 className="font-display text-4xl gold-text mt-4 mb-2">A new campaign begins</h1>
      <p className="text-zinc-400 mb-8">Some lines you can change later. The name is the only one that matters today.</p>

      {sp.error && (
        <p className="mb-4 px-3 py-2 rounded-md bg-red-950/50 border border-red-900/50 text-sm text-red-300">
          {sp.error}
        </p>
      )}

      <form action={createCampaign} className="card-mystic rounded-xl p-6 space-y-5">
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-amber-200/70">Name</span>
          <input type="text" name="name" required placeholder="Curse of Strahd"
            className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-widest text-amber-200/70">Description</span>
          <textarea name="description" rows={3} placeholder="The pitch. Tone. House rules."
            className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md resize-none" />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-amber-200/70">System</span>
            <input type="text" name="system" placeholder="D&D 5e, Pathfinder 2e…"
              className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-amber-200/70">Venue</span>
            <input type="text" name="venue" placeholder="TPK Brewing, my place, online"
              className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
          </label>
        </div>

        <button type="submit" className="btn-gold px-6 py-2.5 rounded-md text-sm uppercase tracking-wide">
          Begin the campaign
        </button>
      </form>
    </div>
  );
}
