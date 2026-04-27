import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="max-w-3xl w-full text-center">
        {/* d20 mark */}
        <div className="mx-auto mb-8 w-16 h-16 flex items-center justify-center">
          <svg viewBox="0 0 64 64" className="w-full h-full text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M32 4 L58 22 L48 54 L16 54 L6 22 Z" />
            <path d="M32 4 L32 28 M58 22 L32 28 M6 22 L32 28 M48 54 L32 28 M16 54 L32 28" opacity="0.55" />
          </svg>
        </div>

        <span className="tag-rune mb-6">Tabletop Scheduler</span>

        <h1 className="font-display text-5xl md:text-6xl font-semibold tracking-tight mt-4 mb-6 gold-text leading-tight">
          Get your party in the same room.
        </h1>

        <p className="text-lg text-zinc-300 max-w-xl mx-auto mb-10 leading-relaxed">
          A schedule-first coordination tool for tabletop RPG campaigns.
          Built by players who got tired of chasing Discord pings.
        </p>

        <div className="flex gap-3 justify-center">
          <Link href="/signup" className="btn-gold px-7 py-3 rounded-md text-sm tracking-wide uppercase">
            Begin your tale
          </Link>
          <Link href="/login" className="btn-ghost px-7 py-3 rounded-md text-sm tracking-wide uppercase">
            Log in
          </Link>
        </div>

        <div className="divider-rune mt-20 mb-8 max-w-md mx-auto" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {[
            { title: 'Schedule with no excuses', body: 'Hero-card "next session" view, party RSVP, and venue-aware planning.' },
            { title: 'Multi-campaign hub', body: 'Wednesday Frostmaiden, Friday Strahd, Saturday Saltmarsh — one home for all of it.' },
            { title: 'Lightweight & system-agnostic', body: 'Link any character sheet. D&D, Pathfinder, Daggerheart, anything.' },
          ].map((f) => (
            <div key={f.title} className="card-mystic rounded-lg p-5">
              <h3 className="font-display text-amber-200 text-base mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
