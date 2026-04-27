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
      <button type="button" onClick={() => setOpen(true)} className="btn-danger">
        Leave campaign
      </button>
    );
  }
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
      <div className="card-mystic rounded-xl p-6 max-w-sm w-full">
        <h3 className="text-xl font-semibold text-zinc-100">Leave this campaign?</h3>
        <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
          You&apos;ll lose access to <span className="text-zinc-100">{campaignName}</span>. The Game Master can re-invite you.
        </p>
        <div className="flex gap-2 mt-5">
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1">Stay</button>
          <button type="button" disabled={pending} onClick={handleLeave} className="btn-danger flex-1">
            {pending ? 'Leaving…' : 'Leave'}
          </button>
        </div>
      </div>
    </div>
  );
}
