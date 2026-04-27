'use client';

import { useEffect, useState, type ReactNode } from 'react';

export default function AppShell({ sidebar, children, initialOpen }: {
  sidebar: ReactNode;
  children: ReactNode;
  initialOpen: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);

  useEffect(() => {
    document.cookie = `sidebarOpen=${open}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  }, [open]);

  return (
    <div className="flex min-h-screen relative">
      <aside
        aria-hidden={!open}
        className="shrink-0 transition-[width] duration-200 ease-out overflow-hidden"
        style={{ width: open ? 260 : 0 }}
      >
        <div className="w-[260px]">{sidebar}</div>
      </aside>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Hide sidebar' : 'Show sidebar'}
        className="fixed top-3 z-40 w-9 h-9 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition"
        style={{ left: open ? 268 : 12, transition: 'left 0.2s ease-out, color 0.15s, background-color 0.15s' }}
      >
        <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
          {open ? (
            <path d="M14.7 5.3a1 1 0 0 1 0 1.4L11.4 10l3.3 3.3a1 1 0 1 1-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 1 1-1.4-1.4L8.6 10 5.3 6.7a1 1 0 0 1 1.4-1.4L10 8.6l3.3-3.3a1 1 0 0 1 1.4 0Z"/>
          ) : (
            <path d="M3 5a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm0 5a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm0 5a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Z"/>
          )}
        </svg>
      </button>
      <main className="flex-1 min-w-0 page-fade">{children}</main>
    </div>
  );
}
