'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function CampaignTabs({ campaignId }: { campaignId: string }) {
  const path = usePathname() ?? '';
  const base = `/app/campaigns/${campaignId}`;
  const tabs = [
    { href: base, label: 'Sessions' },
    { href: `${base}/party`, label: 'Party' },
    { href: `${base}/settings`, label: 'Settings' },
  ];

  return (
    <nav className="flex gap-7 -mb-px">
      {tabs.map((t) => {
        const active = t.href === base ? path === base : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href}
            className={`pb-3 text-sm transition border-b-2 ${
              active ? 'text-zinc-50 border-amber-400' : 'text-zinc-500 hover:text-zinc-200 border-transparent'
            }`}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
