'use client';
import { useState, useTransition } from 'react';
import { deleteSession, deleteSessionSeries } from '../actions';
import { useToast } from './toast';

export default function DeleteSessionButton({ campaignId, sessionId, sessionTitle, seriesId, startsAt }: {
  campaignId: string; sessionId: string; sessionTitle: string;
  seriesId?: string | null;
  startsAt?: string;
}) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<'this' | 'following'>('this');
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function doDelete() {
    startTransition(async () => {
      try {
        if (scope === 'this' || !seriesId || !startsAt) {
          const fd = new FormData();
          fd.set('campaign_id', campaignId); fd.set('session_id', sessionId);
          await deleteSession(fd);
          toast('Session removed.');
        } else {
          const fd = new FormData();
          fd.set('campaign_id', campaignId);
          fd.set('series_id', seriesId);
          fd.set('from_iso', startsAt);
          await deleteSessionSeries(fd);
          toast('Series removed.');
        }
        setOpen(false);
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Could not delete', 'error');
      }
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} title={`Delete ${sessionTitle}`} className="icon-btn icon-btn-danger">
        <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
          <path d="M7 3a1 1 0 0 0-1 1v1H3.5a.75.75 0 0 0 0 1.5h.62l.78 9.34A2 2 0 0 0 6.9 17.5h6.2a2 2 0 0 0 2-1.66l.78-9.34h.62a.75.75 0 0 0 0-1.5H14V4a1 1 0 0 0-1-1H7Zm1.5 2.5V4.5h3v1H8.5Zm-.5 3a.5.5 0 0 1 1 0v6a.5.5 0 0 1-1 0v-6Zm3 0a.5.5 0 0 1 1 0v6a.5.5 0 0 1-1 0v-6Z"/>
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
      <div className="card-mystic rounded-xl p-6 max-w-sm w-full" style={{borderColor: 'var(--danger-border)'}}>
        <h3 className="text-xl font-semibold" style={{color: 'var(--danger-text)'}}>Delete session?</h3>
        {seriesId && startsAt ? (
          <>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">This session is part of a recurring series.</p>
            <div className="flex gap-2 mt-4">
              {(['this','following'] as const).map((s) => (
                <button key={s} type="button" onClick={() => setScope(s)}
                  className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition ${
                    scope === s ? 'bg-amber-500 text-zinc-900' : 'bg-transparent border border-black/[0.10] dark:border-white/[0.10] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}>
                  {s === 'this' ? 'This session' : 'This + all upcoming'}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">This action can&apos;t be undone.</p>
        )}
        <div className="flex gap-2 mt-5">
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1">Cancel</button>
          <button type="button" disabled={pending} onClick={doDelete} className="btn-danger flex-1">
            {pending ? 'Deleting…' : scope === 'following' ? 'Delete series' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
