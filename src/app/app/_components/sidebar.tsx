'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from './logout-button';

function initials(s: string) {
  return s.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

type Campaign = { id: string; name: string };

export default function Sidebar({ campaigns, displayName, email }: {
  campaigns: Campaign[];
  displayName: string;
  email: string;
}) {
  const path = usePathname() ?? '';
  const isDashboard = path === '/app';
  const isInCampaign = (id: string) => path === `/app/campaigns/${id}` || path.startsWith(`/app/campaigns/${id}/`);
  const isSettings = path.startsWith('/app/settings');

  return (
    <aside className="w-[260px] shrink-0 border-r border-white/[0.06] bg-zinc-950/60 backdrop-blur-md flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <Link href="/app" className="flex items-center gap-2.5 group">
          <svg viewBox="0 0 64 64" className="w-6 h-6 text-amber-400 group-hover:text-amber-300 transition" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M32 4 L58 22 L48 54 L16 54 L6 22 Z" />
            <path d="M32 4 L32 28 M58 22 L32 28 M6 22 L32 28 M48 54 L32 28 M16 54 L32 28" opacity="0.5" />
          </svg>
          <span className="font-semibold text-zinc-100 text-sm tracking-tight">Tabletop</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <Link href="/app"
          className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition ${
            isDashboard ? 'bg-white/[0.07] text-zinc-50' : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
          }`}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4 opacity-80">
            <path d="M3 10 L10 3 L17 10 M5 9 V16 H8 V12 H12 V16 H15 V9" />
          </svg>
          Dashboard
        </Link>

        <div className="mt-7">
          <div className="flex items-center justify-between px-2.5 mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Campaigns</span>
            <span className="text-[10px] text-zinc-600">{campaigns.length}</span>
          </div>
          <div className="space-y-0.5">
            {campaigns.map((c) => {
              const active = isInCampaign(c.id);
              return (
                <Link key={c.id} href={`/app/campaigns/${c.id}`}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition group ${
                    active ? 'bg-white/[0.07] text-zinc-50' : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-amber-400' : 'bg-zinc-600 group-hover:bg-zinc-400'}`} />
                  <span className="truncate">{c.name}</span>
                </Link>
              );
            })}
            <Link href="/app/campaigns/new"
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm text-zinc-500 hover:text-amber-300 hover:bg-white/[0.04] transition">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 shrink-0" />
              New campaign
            </Link>
          </div>
        </div>
      </nav>

      <div className="border-t border-white/[0.06] p-3 space-y-1">
        <Link href="/app/settings"
          className={`flex items-center gap-3 px-2 py-2 rounded-md text-sm transition ${
            isSettings ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'
          }`}>
          <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[10px] font-semibold text-amber-200 shrink-0">
            {initials(displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-zinc-100 text-[13px] font-medium">{displayName}</p>
            <p className="truncate text-[11px] text-zinc-500">{email}</p>
          </div>
        </Link>
        <div className="px-2"><LogoutButton /></div>
      </div>
    </aside>
  );
}
