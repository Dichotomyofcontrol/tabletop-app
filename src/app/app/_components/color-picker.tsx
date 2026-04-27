'use client';

import { useState, useTransition } from 'react';
import { CAMPAIGN_COLORS } from '@/lib/campaign-colors';
import { updateCampaignColor } from '../actions';
import { useToast } from './toast';

export default function ColorPicker({ campaignId, current }: { campaignId: string; current: string }) {
  const [selected, setSelected] = useState(current);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function pick(slug: string) {
    if (slug === selected) return;
    const prev = selected;
    setSelected(slug);
    const fd = new FormData();
    fd.set('campaign_id', campaignId);
    fd.set('color', slug);
    startTransition(async () => {
      try { await updateCampaignColor(fd); toast('Color updated.'); }
      catch (e) { setSelected(prev); toast(e instanceof Error ? e.message : 'Could not save', 'error'); }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {CAMPAIGN_COLORS.map((c) => (
        <button key={c.slug} type="button" onClick={() => pick(c.slug)}
          aria-label={c.label} title={c.label} disabled={pending}
          className={`w-9 h-9 rounded-md transition relative ${
            selected === c.slug ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-zinc-950 scale-105' : 'hover:scale-105'
          }`}
          style={{ background: c.hex }}>
          {selected === c.slug && (
            <svg viewBox="0 0 20 20" className="absolute inset-0 m-auto w-4 h-4 text-white drop-shadow" fill="currentColor">
              <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z"/>
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}
