'use client';
import { useState, useTransition } from 'react';
import { leaveCampaign } from '../actions';
import { useToast } from './toast';

export default function LeaveCampaignButton({ campaignId, campaignName }: {
  campaignId: string; campaignName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  function handleLeave() {
    const fd = new FormData();
    fd.set('campaign_id', campaignId);
    startTransition(async () => {
      try { await leaveCampaign(fd); }
      catch (e) { toast(e instanceof Error ? e.message : 'Could not leave', 'error'); }
    });
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="text-sm text-zinc-500 hover:text-red-300 transition">
        Leave the party
      </button>
    );
  }
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
      <div className="card-mystic rounded-xl p-6 max-w-sm w-full">
        <h3 className="font-display text-xl text-amber-100">Leave the party?</h3>
        <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
          You&apos;ll lose access to <span className="text-amber-200">{campaignName}</span>. The Game Master can re-invite you.
        </p>
        <div className="flex gap-2 mt-5">
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-4 py-2 rounded-md text-sm uppercase tracking-wide flex-1">Stay</button>
          <button type="button" disabled={pending} onClick={handleLeave} className="btn-danger px-4 py-2 rounded-md text-sm uppercase tracking-wide flex-1">
            {pending ? 'Leaving…' : 'Leave'}
          </button>
        </div>
      </div>
    </div>
  );
}
