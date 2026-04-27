'use client';
import { useState, useTransition } from 'react';
import { deleteSession } from '../actions';
import { useToast } from './toast';

export default function DeleteSessionButton({ campaignId, sessionId, sessionTitle }: {
  campaignId: string; sessionId: string; sessionTitle: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function handleDelete() {
    const fd = new FormData();
    fd.set('campaign_id', campaignId); fd.set('session_id', sessionId);
    startTransition(async () => {
      try { await deleteSession(fd); toast('Session removed.'); }
      catch (e) { toast(e instanceof Error ? e.message : 'Could not delete', 'error'); setConfirming(false); }
    });
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1">
        <button type="button" onClick={handleDelete} disabled={pending}
          className="btn-danger px-2.5 py-1 rounded-md text-xs uppercase tracking-wide">
          {pending ? '…' : 'Confirm'}
        </button>
        <button type="button" onClick={() => setConfirming(false)} disabled={pending}
          className="text-xs text-zinc-400 hover:text-zinc-200 px-1.5">Cancel</button>
      </span>
    );
  }

  return (
    <button type="button" onClick={() => setConfirming(true)} title={`Delete ${sessionTitle}`}
      className="icon-btn icon-btn-danger">
      <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
        <path d="M7 3a1 1 0 0 0-1 1v1H3.5a.75.75 0 0 0 0 1.5h.62l.78 9.34A2 2 0 0 0 6.9 17.5h6.2a2 2 0 0 0 2-1.66l.78-9.34h.62a.75.75 0 0 0 0-1.5H14V4a1 1 0 0 0-1-1H7Zm1.5 2.5V4.5h3v1H8.5Zm-.5 3a.5.5 0 0 1 1 0v6a.5.5 0 0 1-1 0v-6Zm3 0a.5.5 0 0 1 1 0v6a.5.5 0 0 1-1 0v-6Z"/>
      </svg>
    </button>
  );
}
