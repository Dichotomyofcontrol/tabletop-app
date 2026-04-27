'use client';
import { useState, useTransition } from 'react';
import { updateCampaign } from '../actions';
import { useToast } from './toast';

export default function CampaignSettings({ campaignId, initial }: {
  campaignId: string;
  initial: { name: string; description: string | null; system: string | null; venue: string | null };
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? '');
  const [system, setSystem] = useState(initial.system ?? '');
  const [venue, setVenue] = useState(initial.venue ?? '');
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set('campaign_id', campaignId); fd.set('name', name); fd.set('description', description);
    fd.set('system', system); fd.set('venue', venue);
    startTransition(async () => {
      try { await updateCampaign(fd); toast('Campaign updated.'); setOpen(false); }
      catch (e) { toast(e instanceof Error ? e.message : 'Could not save', 'error'); }
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost px-4 py-2.5 rounded-md text-sm uppercase tracking-wide whitespace-nowrap">
        Edit details
      </button>
    );
  }
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
      <div className="card-mystic rounded-xl p-6 max-w-md w-full">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="font-display text-2xl text-amber-100">Campaign details</h3>
          <button type="button" onClick={() => setOpen(false)} className="text-xs text-zinc-500 hover:text-zinc-300 uppercase tracking-wide">Close</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-amber-200/70">Name</span>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-amber-200/70">Description</span>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md resize-none" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-amber-200/70">System</span>
              <input type="text" value={system} onChange={(e) => setSystem(e.target.value)} className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-amber-200/70">Venue</span>
              <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
            </label>
          </div>
          <button type="submit" disabled={pending} className="btn-gold w-full px-5 py-2.5 rounded-md text-sm uppercase tracking-wide">
            {pending ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
