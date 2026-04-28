'use client';

import { useState, useTransition } from 'react';
import { createPoll } from '../actions';
import { useToast } from './toast';

type Slot = { date: string; time: string };

function pad(n: number) { return n.toString().padStart(2, '0'); }
function tomorrowAt(hour: number) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(hour)}:00` };
}

export default function PollForm({ campaignId }: { campaignId?: string }) {
  const [title, setTitle] = useState(campaignId ? '' : 'One-shot night');
  const [description, setDescription] = useState('');
  const [system, setSystem] = useState('');
  const [venue, setVenue] = useState('');
  const [duration, setDuration] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [slots, setSlots] = useState<Slot[]>([tomorrowAt(19), tomorrowAt(19)]);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function addSlot() {
    setSlots([...slots, tomorrowAt(19)]);
  }
  function removeSlot(i: number) {
    if (slots.length <= 2) return;
    setSlots(slots.filter((_, idx) => idx !== i));
  }
  function updateSlot(i: number, patch: Partial<Slot>) {
    setSlots(slots.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valid = slots.filter((s) => s.date && s.time);
    if (valid.length < 2) {
      toast('Add at least two date options.', 'error');
      return;
    }
    const fd = new FormData();
    fd.set('title', title);
    fd.set('description', description);
    fd.set('system', system);
    fd.set('venue', venue);
    fd.set('duration', duration);
    if (closesAt) fd.set('closes_at', closesAt);
    if (campaignId) fd.set('campaign_id', campaignId);
    for (const s of valid) {
      fd.append('option', new Date(`${s.date}T${s.time}:00`).toISOString());
    }
    startTransition(async () => {
      try {
        await createPoll(fd);
        // createPoll redirects on success
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Could not create poll', 'error');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="block">
        <span className="text-xs text-zinc-400 font-medium">Title</span>
        <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder={campaignId ? 'Session 14' : 'One-shot night'}
          className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
      </label>

      {!campaignId && (
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-zinc-400 font-medium">System</span>
            <input type="text" value={system} onChange={(e) => setSystem(e.target.value)}
              placeholder="D&D 5e, Blades, Pathfinder…"
              className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-400 font-medium">Duration</span>
            <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)}
              placeholder="3 hours"
              className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
          </label>
        </div>
      )}

      <label className="block">
        <span className="text-xs text-zinc-400 font-medium">Venue</span>
        <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)}
          placeholder="TPK Brewing, my place, Discord…"
          className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
      </label>

      <label className="block">
        <span className="text-xs text-zinc-400 font-medium">Pitch (optional)</span>
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="What's the vibe? What should they expect?"
          className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md resize-none" />
      </label>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs text-zinc-400 font-medium">Date options</span>
          <button type="button" onClick={addSlot} className="text-xs text-amber-300 hover:text-amber-200 transition">
            + Add another
          </button>
        </div>
        <ul className="space-y-2">
          {slots.map((s, i) => (
            <li key={i} className="flex gap-2 items-center">
              <input type="date" required value={s.date} onChange={(e) => updateSlot(i, { date: e.target.value })}
                className="input-mystic px-3 py-2 rounded-md flex-1" />
              <input type="time" required value={s.time} onChange={(e) => updateSlot(i, { time: e.target.value })}
                className="input-mystic px-3 py-2 rounded-md w-28" />
              <button type="button" onClick={() => removeSlot(i)} disabled={slots.length <= 2}
                className="text-xs text-zinc-500 hover:text-zinc-200 disabled:opacity-30 px-2 py-2 transition"
                aria-label="Remove option">
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>

      <label className="block">
        <span className="text-xs text-zinc-400 font-medium">Voting closes (optional)</span>
        <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)}
          className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
        <span className="text-[11px] text-zinc-500 mt-1 block">
          Leave blank to keep voting open until you pick a winner.
        </span>
      </label>

      <button type="submit" disabled={pending} className="btn-gold w-full">
        {pending ? 'Creating…' : campaignId ? 'Create campaign poll' : 'Create poll'}
      </button>
    </form>
  );
}
