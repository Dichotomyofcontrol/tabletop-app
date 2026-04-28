'use client';

import { useState, useTransition } from 'react';
import { updateCampaign } from '../actions';
import { useToast } from './toast';

type Props = {
  campaignId: string;
  canEdit: boolean;
  initial: {
    name: string;
    description: string | null;
    system: string | null;
    venue: string | null;
    gmName: string | null;
  };
};

function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-3">
      <dt className="text-zinc-500 text-sm">{label}</dt>
      <dd className="col-span-2 text-zinc-200 text-sm">{value}</dd>
    </div>
  );
}

export default function CampaignDetailsForm({ campaignId, canEdit, initial }: Props) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? '');
  const [system, setSystem] = useState(initial.system ?? '');
  const [venue, setVenue] = useState(initial.venue ?? '');
  const [gmName, setGmName] = useState(initial.gmName ?? '');
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const isDirty =
    name !== initial.name ||
    description !== (initial.description ?? '') ||
    system !== (initial.system ?? '') ||
    venue !== (initial.venue ?? '') ||
    gmName !== (initial.gmName ?? '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set('campaign_id', campaignId);
    fd.set('name', name);
    fd.set('description', description);
    fd.set('system', system);
    fd.set('venue', venue);
    fd.set('gm_name', gmName);
    startTransition(async () => {
      try { await updateCampaign(fd); toast('Saved.'); }
      catch (e) { toast(e instanceof Error ? e.message : 'Could not save', 'error'); }
    });
  }

  return (
    <section className="rounded-lg border border-white/[0.07] bg-zinc-900/30 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">Campaign details</h2>
          <p className="text-sm text-zinc-500 mt-1">
            {canEdit ? 'Anyone in the party can see these.' : 'Only the organizer and editors can edit.'}
          </p>
        </div>
        {canEdit && (
          <button type="submit" form="campaign-details-form" disabled={!isDirty || pending}
            className="btn-gold shrink-0">
            {pending ? 'Saving…' : 'Save changes'}
          </button>
        )}
      </div>

      {canEdit ? (
        <form id="campaign-details-form" onSubmit={handleSubmit} className="space-y-5 mt-6">
          <label className="block">
            <span className="text-xs text-zinc-400 font-medium">Name</span>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
              className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-400 font-medium">Description</span>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
              className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md resize-none" />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-400 font-medium">Game Master name</span>
            <input type="text" value={gmName} onChange={(e) => setGmName(e.target.value)}
              placeholder="What the party calls you at the table"
              className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
            <span className="block mt-1.5 text-xs text-zinc-500">Shown on the campaign hero and in invites.</span>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs text-zinc-400 font-medium">System</span>
              <input type="text" value={system} onChange={(e) => setSystem(e.target.value)}
                className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
            </label>
            <label className="block">
              <span className="text-xs text-zinc-400 font-medium">Venue</span>
              <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)}
                className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
            </label>
          </div>
        </form>
      ) : (
        <dl className="divide-y divide-white/[0.05] border-y border-white/[0.05] mt-5">
          <ReadRow label="Name" value={initial.name} />
          {initial.description && <ReadRow label="Description" value={initial.description} />}
          {initial.gmName && <ReadRow label="Game Master" value={initial.gmName} />}
          {initial.system && <ReadRow label="System" value={initial.system} />}
          {initial.venue && <ReadRow label="Venue" value={initial.venue} />}
        </dl>
      )}
    </section>
  );
}
