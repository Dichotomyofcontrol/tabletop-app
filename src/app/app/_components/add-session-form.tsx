'use client';

import { useState, useTransition } from 'react';
import { createSession } from '../actions';
import { useToast } from './toast';

type Frequency = 'once' | 'weekly' | 'biweekly' | 'monthly';

export default function AddSessionForm({ campaignId, defaultVenue }: {
  campaignId: string;
  defaultVenue?: string;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:00');
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('once');
  const [occurrences, setOccurrences] = useState(8);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function reset() {
    setDate(''); setTime('19:00'); setTitle(''); setVenue('');
    setFrequency('once'); setOccurrences(8);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time) return;
    const startsAt = new Date(`${date}T${time}:00`).toISOString();
    const fd = new FormData();
    fd.set('campaign_id', campaignId);
    fd.set('starts_at', startsAt);
    fd.set('title', title);
    fd.set('venue', venue);
    fd.set('frequency', frequency);
    fd.set('occurrences', String(occurrences));
    startTransition(async () => {
      try {
        await createSession(fd);
        const count = frequency === 'once' ? 1 : occurrences;
        toast(count === 1 ? 'Session scheduled.' : `${count} sessions scheduled.`);
        setOpen(false);
        reset();
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Could not save', 'error');
      }
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost">
        + Schedule a session
      </button>
    );
  }

  const submitLabel = pending
    ? 'Scheduling…'
    : frequency === 'once' ? 'Schedule session' : `Schedule ${occurrences} sessions`;

  return (
    <div className="rounded-xl border border-white/[0.07] bg-zinc-900/40 p-6">
      <div className="flex items-baseline justify-between mb-5">
        <h3 className="text-base font-semibold text-zinc-100">Schedule a session</h3>
        <button type="button" onClick={() => { setOpen(false); reset(); }}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition">
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-zinc-400 font-medium">Date</span>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)}
              className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-400 font-medium">Time</span>
            <input type="time" required value={time} onChange={(e) => setTime(e.target.value)}
              className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
          </label>
        </div>

        <label className="block">
          <span className="text-xs text-zinc-400 font-medium">Title (optional)</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Session 12 — the long road"
            className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
        </label>

        <label className="block">
          <span className="text-xs text-zinc-400 font-medium">Venue</span>
          <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)}
            placeholder={defaultVenue ?? 'Where you play'}
            className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
        </label>

        <div className="pt-3 border-t border-white/[0.05]">
          <div className={`grid gap-3 ${frequency === 'once' ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <label className="block">
              <span className="text-xs text-zinc-400 font-medium">Repeats</span>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}
                className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md">
                <option value="once">Doesn&apos;t repeat</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every 2 weeks</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            {frequency !== 'once' && (
              <label className="block">
                <span className="text-xs text-zinc-400 font-medium">Number of sessions</span>
                <input type="number" min={2} max={52} value={occurrences}
                  onChange={(e) => setOccurrences(Math.max(2, Math.min(52, parseInt(e.target.value) || 2)))}
                  className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
              </label>
            )}
          </div>
          {frequency !== 'once' && date && time && (
            <p className="mt-2 text-[11px] text-zinc-500">
              First on {new Date(`${date}T${time}:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, then {frequency === 'weekly' ? 'every week' : frequency === 'biweekly' ? 'every two weeks' : 'every month'} for {occurrences - 1} more.
            </p>
          )}
        </div>

        <button type="submit" disabled={pending} className="btn-gold w-full">
          {submitLabel}
        </button>
      </form>
    </div>
  );
}
