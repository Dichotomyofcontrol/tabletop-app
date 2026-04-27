import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="max-w-3xl w-full text-center">
        <div className="mx-auto mb-7 w-12 h-12 flex items-center justify-center">
          <svg viewBox="0 0 64 64" className="w-full h-full text-amber-400" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M32 4 L58 22 L48 54 L16 54 L6 22 Z" />
            <path d="M32 4 L32 28 M58 22 L32 28 M6 22 L32 28 M48 54 L32 28 M16 54 L32 28" opacity="0.5" />
          </svg>
        </div>

        <h1 className="font-display text-5xl md:text-6xl font-semibold tracking-tight text-zinc-50 mb-5 leading-[1.05]">
          Get your party in the same room.
        </h1>

        <p className="text-lg text-zinc-400 max-w-xl mx-auto mb-9 leading-relaxed">
          A schedule-first companion app for tabletop RPGs.
          Coordinate sessions, track RSVPs, and keep your campaign moving.
        </p>

        <div className="flex gap-2.5 justify-center">
          <Link href="/signup" className="btn-gold">
            Get started
          </Link>
          <Link href="/login" className="btn-ghost">
            Log in
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-24 text-left">
          {[
            { title: 'Schedule that sticks', body: 'A clear next-session view with party RSVPs at a glance. No more chasing Discord pings.' },
            { title: 'Multi-campaign ready', body: 'One home for every game you run or play in — Wednesday, Friday, Saturday, and on.' },
            { title: 'System-agnostic', body: 'Link any character sheet. D&D, Pathfinder, Daggerheart, Call of Cthulhu — bring your own.' },
          ].map((f) => (
            <div key={f.title} className="card-mystic rounded-lg p-5">
              <h3 className="text-zinc-100 text-sm font-semibold mb-1.5">{f.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
