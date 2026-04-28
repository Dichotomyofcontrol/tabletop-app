'use client';

import { useTransition, useState } from 'react';
import { respondToPoll } from '../actions';
import { useToast } from './toast';

type Status = 'yes' | 'no' | 'maybe' | null;

export default function PollResponseButtons({ pollId, optionId, my, disabled }: {
  pollId: string;
  optionId: string;
  my: Status;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<Status>(my);
  const toast = useToast();
  const current = pending ? optimistic : my;

  function vote(s: 'yes' | 'maybe' | 'no') {
    setOptimistic(s);
    const fd = new FormData();
    fd.set('poll_id', pollId);
    fd.set('option_id', optionId);
    fd.set('status', s);
    startTransition(async () => {
      try { await respondToPoll(fd); }
      catch (e) {
        setOptimistic(my);
        toast(e instanceof Error ? e.message : 'Could not save', 'error');
      }
    });
  }

  return (
    <div className="flex gap-1.5">
      {(['yes', 'maybe', 'no'] as const).map((s) => (
        <button key={s} type="button" onClick={() => vote(s)} disabled={pending || disabled}
          className={`px-3 py-1.5 rounded-md text-xs font-medium uppercase tracking-wide border transition disabled:opacity-50 ${
            current === s
              ? s === 'yes' ? 'bg-lime-500/20 border-lime-500/50 text-lime-200'
              : s === 'maybe' ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
              : 'bg-zinc-700/40 border-zinc-600/50 text-zinc-300'
              : 'bg-transparent border-black/[0.10] dark:border-white/[0.10] text-zinc-500 hover:text-zinc-100'
          }`}>
          {s === 'yes' ? 'In' : s === 'maybe' ? 'Maybe' : 'Out'}
        </button>
      ))}
    </div>
  );
}
