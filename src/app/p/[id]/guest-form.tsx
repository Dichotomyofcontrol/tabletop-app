'use client';

import { useState, useTransition, useEffect } from 'react';
import { respondToPollGuest } from '@/app/app/actions';

type Option = { id: string; startsAt: string };
type Status = 'yes' | 'no' | 'maybe' | null;
type Tally = Record<string, { yes: number; maybe: number; no: number }>;

export default function GuestForm({ pollId, options, initialName, initialResponses, tally }: {
  pollId: string;
  options: Option[];
  initialName: string;
  initialResponses: Record<string, Status>;
  tally: Tally;
}) {
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [responses, setResponses] = useState<Record<string, Status>>(initialResponses);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Persist name to localStorage so cookie-less visits across browsers feel coherent
  useEffect(() => {
    if (!savedName) {
      const stored = localStorage.getItem('pollGuestName');
      if (stored) { setName(stored); setSavedName(stored); }
    }
  }, [savedName]);

  function fmt(iso: string) {
    return new Date(iso).toLocaleString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  }

  function pick(optionId: string, status: 'yes' | 'no' | 'maybe') {
    if (!name.trim()) {
      setError('Enter your name first.');
      return;
    }
    setError(null);
    if (!savedName) {
      localStorage.setItem('pollGuestName', name.trim());
      setSavedName(name.trim());
    }
    setResponses({ ...responses, [optionId]: status });

    const fd = new FormData();
    fd.set('poll_id', pollId);
    fd.set('option_id', optionId);
    fd.set('status', status);
    fd.set('display_name', name.trim());
    startTransition(async () => {
      try { await respondToPollGuest(fd); }
      catch (e) {
        setError(e instanceof Error ? e.message : 'Could not save');
        setResponses((prev) => ({ ...prev, [optionId]: initialResponses[optionId] ?? null }));
      }
    });
  }

  return (
    <div>
      <div className="rounded-lg border border-black/[0.10] dark:border-white/[0.07] bg-white dark:bg-zinc-900/40 p-5 mb-6">
        <label className="block">
          <span className="text-xs text-zinc-400 font-medium">Your name</span>
          <input type="text" required value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!!savedName}
            placeholder="What everyone calls you"
            className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md disabled:opacity-70" />
          {savedName ? (
            <span className="block mt-1.5 text-xs text-zinc-500">
              Voting as <span className="text-zinc-300">{savedName}</span>.
            </span>
          ) : (
            <span className="block mt-1.5 text-xs text-zinc-500">
              We&apos;ll remember this on your device.
            </span>
          )}
        </label>
      </div>

      {error && (
        <p className="mb-4 px-3 py-2 rounded-md bg-red-950/40 border border-red-900/40 text-sm text-red-300">
          {error}
        </p>
      )}

      <ul className="space-y-3">
        {options.map((o) => {
          const my = responses[o.id];
          const t = tally[o.id] ?? { yes: 0, maybe: 0, no: 0 };
          return (
            <li key={o.id} className="rounded-lg border border-black/[0.10] dark:border-white/[0.07] bg-white dark:bg-zinc-900/40 p-4">
              <div className="flex items-baseline justify-between flex-wrap gap-3">
                <div>
                  <p className="text-base font-semibold text-zinc-50">{fmt(o.startsAt)}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    <span className="text-lime-300">{t.yes} in</span>
                    <span className="mx-2">·</span>
                    <span className="text-amber-300">{t.maybe} maybe</span>
                    <span className="mx-2">·</span>
                    <span className="text-zinc-500">{t.no} out</span>
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {(['yes', 'maybe', 'no'] as const).map((s) => (
                    <button key={s} type="button" onClick={() => pick(o.id, s)} disabled={pending}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium uppercase tracking-wide border transition ${
                        my === s
                          ? s === 'yes' ? 'bg-lime-500/20 border-lime-500/50 text-lime-200'
                          : s === 'maybe' ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                          : 'bg-zinc-700/40 border-zinc-600/50 text-zinc-400'
                          : 'bg-transparent border-black/[0.10] dark:border-white/[0.10] text-zinc-500 hover:text-zinc-100'
                      }`}>
                      {s === 'yes' ? 'In' : s === 'maybe' ? 'Maybe' : 'Out'}
                    </button>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
