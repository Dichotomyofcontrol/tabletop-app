'use client';

import { useTransition } from 'react';
import { setTheme } from '../actions';
import { useToast } from './toast';

export default function ThemeToggle({ current }: { current: 'light' | 'dark' }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function pick(theme: 'light' | 'dark') {
    if (theme === current) return;
    const fd = new FormData();
    fd.set('theme', theme);
    startTransition(async () => {
      try { await setTheme(fd); }
      catch (e) { toast(e instanceof Error ? e.message : 'Could not save', 'error'); }
    });
  }

  return (
    <div className="inline-flex rounded-lg border border-zinc-200 dark:border-white/[0.07] p-0.5 bg-zinc-100 dark:bg-zinc-900/40">
      <button type="button" onClick={() => pick('light')} disabled={pending}
        className={`px-4 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-2 ${
          current === 'light' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
        }`}>
        <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="currentColor">
          <path d="M10 2a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm0 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-4a1 1 0 0 1-1 1h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1ZM5 10a1 1 0 0 1-1 1H3a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1Zm10.07 5.07a1 1 0 0 1-1.41 0l-.71-.71a1 1 0 1 1 1.41-1.41l.71.71a1 1 0 0 1 0 1.41ZM7.05 7.05a1 1 0 0 1-1.41 0l-.71-.71a1 1 0 0 1 1.41-1.41l.71.71a1 1 0 0 1 0 1.41ZM10 18a1 1 0 0 1-1-1v-1a1 1 0 1 1 2 0v1a1 1 0 0 1-1 1Zm5.07-12.93a1 1 0 0 1 0 1.41l-.71.71a1 1 0 1 1-1.41-1.41l.71-.71a1 1 0 0 1 1.41 0ZM7.05 12.95a1 1 0 0 1 0 1.41l-.71.71a1 1 0 1 1-1.41-1.41l.71-.71a1 1 0 0 1 1.41 0Z"/>
        </svg>
        Light
      </button>
      <button type="button" onClick={() => pick('dark')} disabled={pending}
        className={`px-4 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-2 ${
          current === 'dark' ? 'bg-zinc-800 text-zinc-50 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
        }`}>
        <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="currentColor">
          <path d="M17.293 13.293A8 8 0 1 1 6.707 2.707a8.001 8.001 0 0 0 10.586 10.586Z"/>
        </svg>
        Dark
      </button>
    </div>
  );
}
