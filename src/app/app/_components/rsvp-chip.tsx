'use client';
import { useState, useTransition, useRef, useEffect } from 'react';
import { rsvp } from '../actions';
import { useToast } from './toast';

type Status = 'yes' | 'no' | 'maybe' | null;

export default function RsvpChip({ sessionId, campaignId, current }: {
  sessionId: string; campaignId: string; current: Status;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [local, setLocal] = useState<Status>(current);
  const ref = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => setLocal(current), [current]);
  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  function set(status: 'yes' | 'no' | 'maybe') {
    setLocal(status); setOpen(false);
    const fd = new FormData();
    fd.set('session_id', sessionId);
    fd.set('campaign_id', campaignId);
    fd.set('status', status);
    startTransition(async () => {
      try {
        await rsvp(fd);
        toast(status === 'yes' ? "You're in." : status === 'maybe' ? 'Tentatively logged.' : 'Marked out.');
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Could not save', 'error');
      }
    });
  }

  const label = local === 'yes' ? "You're in" : local === 'maybe' ? "Maybe" : local === 'no' ? "Out" : 'Will you make it?';
  const cls = local === 'yes' ? 'bg-lime-900/30 border-lime-700/50 text-lime-200'
            : local === 'maybe' ? 'bg-amber-900/30 border-amber-700/50 text-amber-200'
            : local === 'no' ? 'bg-zinc-900/50 border-zinc-700/50 text-zinc-400'
            : 'bg-amber-500/10 border-amber-500/40 text-amber-200';
  const dot = local === 'yes' ? 'bg-lime-400' : local === 'maybe' ? 'bg-amber-400' : local === 'no' ? 'bg-zinc-500' : 'bg-amber-300';

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(!open)} disabled={pending}
        className={`inline-flex items-center gap-2 rounded-full border ${cls} px-3 py-1.5 text-sm font-medium transition active:translate-y-px disabled:opacity-60`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        {label}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-44 card-mystic rounded-lg p-1.5 text-sm shadow-2xl">
          {(['yes','maybe','no'] as const).map((s) => (
            <button key={s} type="button" onClick={() => set(s)}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left hover:bg-amber-500/10 transition ${local === s ? 'text-amber-200' : 'text-zinc-300'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s === 'yes' ? 'bg-lime-400' : s === 'maybe' ? 'bg-amber-400' : 'bg-zinc-500'}`} />
              {s === 'yes' ? "I'm in" : s === 'maybe' ? 'Maybe' : "I can't make it"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
