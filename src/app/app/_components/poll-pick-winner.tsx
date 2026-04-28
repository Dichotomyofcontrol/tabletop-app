'use client';

import { useTransition } from 'react';
import { pickPollWinner, reopenPoll, deletePoll } from '../actions';
import { useToast } from './toast';

type Option = { id: string; startsAt: string; yes: number; maybe: number; no: number; score: number };

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export default function PollPickWinner({ pollId, status, options, bestId, isCampaignPoll }: {
  pollId: string;
  status: 'open' | 'scheduled' | 'closed';
  options: Option[];
  bestId: string | null;
  isCampaignPoll: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function pick(optionId: string) {
    if (!confirm(isCampaignPoll
      ? 'Lock this in? It will create a session on the campaign calendar.'
      : 'Lock this date in?')) return;
    const fd = new FormData();
    fd.set('poll_id', pollId);
    fd.set('option_id', optionId);
    startTransition(async () => {
      try { await pickPollWinner(fd); toast('Locked in.'); }
      catch (e) { toast(e instanceof Error ? e.message : 'Could not save', 'error'); }
    });
  }
  function reopen() {
    const fd = new FormData();
    fd.set('poll_id', pollId);
    startTransition(async () => {
      try { await reopenPoll(fd); toast('Poll reopened.'); }
      catch (e) { toast(e instanceof Error ? e.message : 'Could not reopen', 'error'); }
    });
  }
  function destroy() {
    if (!confirm('Delete this poll? This cannot be undone.')) return;
    const fd = new FormData();
    fd.set('poll_id', pollId);
    startTransition(async () => {
      try { await deletePoll(fd); }
      catch (e) { toast(e instanceof Error ? e.message : 'Could not delete', 'error'); }
    });
  }

  if (status === 'scheduled') {
    return (
      <div className="rounded-lg border border-black/[0.10] dark:border-white/[0.07] bg-white dark:bg-zinc-900/40 p-4">
        <p className="text-xs text-zinc-500 mb-3">Host actions</p>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={reopen} disabled={pending} className="btn-ghost text-xs">
            Reopen voting
          </button>
          <button type="button" onClick={destroy} disabled={pending}
            className="text-xs px-3 py-1.5 rounded-md text-red-300 hover:text-red-200 hover:bg-red-950/30 transition">
            Delete poll
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-black/[0.10] dark:border-white/[0.07] bg-white dark:bg-zinc-900/40 p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-3">
        Lock in a date
      </p>
      <ul className="space-y-2">
        {options.map((o) => (
          <li key={o.id} className={`flex items-center justify-between gap-3 rounded-md border p-3 ${
            bestId === o.id ? 'border-amber-500/40 bg-amber-500/[0.04]' : 'border-black/[0.05] dark:border-white/[0.05]'
          }`}>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <p className="text-sm font-medium text-zinc-100">{fmt(o.startsAt)}</p>
                {bestId === o.id && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">★ Best fit</span>
                )}
              </div>
              <p className="text-xs mt-0.5">
                <span className="text-lime-300">{o.yes} in</span> · <span className="text-amber-300">{o.maybe} maybe</span> · <span className="text-zinc-500">{o.no} out</span>
              </p>
            </div>
            <button type="button" onClick={() => pick(o.id)} disabled={pending}
              className="btn-gold text-xs whitespace-nowrap">
              Lock in
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.05] flex justify-end">
        <button type="button" onClick={destroy} disabled={pending}
          className="text-xs px-3 py-1.5 rounded-md text-red-300 hover:text-red-200 hover:bg-red-950/30 transition">
          Delete poll
        </button>
      </div>
    </div>
  );
}
