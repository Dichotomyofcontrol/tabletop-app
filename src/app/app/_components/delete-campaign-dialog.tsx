'use client';
import { useState, useTransition } from 'react';
import { deleteCampaign } from '../actions';
import { useToast } from './toast';

export default function DeleteCampaignDialog({ campaignId, campaignName }: {
  campaignId: string; campaignName: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const matches = confirmText === campaignName;

  function handleDelete() {
    const fd = new FormData();
    fd.set('campaign_id', campaignId); fd.set('confirm_name', confirmText);
    startTransition(async () => {
      try { await deleteCampaign(fd); }
      catch (e) { toast(e instanceof Error ? e.message : 'Could not delete', 'error'); }
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-danger px-4 py-2 rounded-md text-sm uppercase tracking-wide">
        End the campaign
      </button>
    );
  }
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
      <div className="card-mystic rounded-xl p-6 max-w-md w-full" style={{borderColor: 'rgba(220, 38, 38, 0.4)'}}>
        <h3 className="font-display text-2xl text-red-300">End the campaign?</h3>
        <p className="mt-3 text-sm text-zinc-300 leading-relaxed">
          This will end <span className="font-display text-amber-100">{campaignName}</span> forever.
          Sessions, characters, and pending invites will all be lost. The party will be scattered.
        </p>
        <p className="mt-4 text-sm text-zinc-400">
          Type <span className="font-mono text-amber-200">{campaignName}</span> to confirm.
        </p>
        <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoFocus
          className="input-mystic mt-2 w-full px-3 py-2.5 rounded-md" />
        <div className="flex gap-2 mt-5">
          <button type="button" onClick={() => { setOpen(false); setConfirmText(''); }}
            className="btn-ghost px-4 py-2 rounded-md text-sm uppercase tracking-wide flex-1">
            Cancel
          </button>
          <button type="button" disabled={!matches || pending} onClick={handleDelete}
            className="btn-danger px-4 py-2 rounded-md text-sm uppercase tracking-wide flex-1">
            {pending ? 'Ending…' : 'End campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}
