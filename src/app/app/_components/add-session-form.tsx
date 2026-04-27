'use client';

import { useState, useTransition } from 'react';
import { createSession } from '../actions';

function nextWeekday(targetDow: number, hour: number) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  const delta = ((targetDow - d.getDay()) + 7) % 7 || 7;
  d.setDate(d.getDate() + delta);
  return d;
}
function tonight(hour: number) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
  return d;
}
function pad(n: number) { return n.toString().padStart(2, '0'); }
function toDateField(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function toTimeField(d: Date) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }

export default function AddSessionForm({ campaignId, defaultVenue }: { campaignId: string; defaultVenue?: string }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:00');
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [pending, startTransition] = useTransition();

  function applyPreset(d: Date) {
    setDate(toDateField(d));
    setTime(toTimeField(d));
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
    startTransition(async () => {
      await createSession(fd);
      setOpen(false);
      setDate(''); setTime('19:00'); setTitle(''); setVenue('');
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="btn-ghost px-5 py-2.5 rounded-md text-sm uppercase tracking-wide">
        + Schedule a session
      </button>
    );
  }

  return (
    <div className="card-mystic rounded-xl p-6 space-y-5">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-xl text-amber-100">Schedule a session</h3>
        <button type="button" onClick={() => setOpen(false)}
          className="text-xs text-zinc-500 hover:text-zinc-300 uppercase tracking-wide">
          Cancel
        </button>
      </div>

      <div>
        <span className="text-xs uppercase tracking-widest text-amber-200/70 block mb-2">Quick pick</span>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Tonight · 7pm', d: tonight(19) },
            { label: 'This Wed · 7pm', d: nextWeekday(3, 19) },
            { label: 'This Fri · 7pm', d: nextWeekday(5, 19) },
            { label: 'This Sat · 6pm', d: nextWeekday(6, 18) },
          ].map((p) => (
            <button key={p.label} type="button" onClick={() => applyPreset(p.d)}
              className="btn-ghost px-3 py-1.5 rounded-md text-xs">
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-amber-200/70">Date</span>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)}
              className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-amber-200/70">Time</span>
            <input type="time" required value={time} onChange={(e) => setTime(e.target.value)}
              className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
          </label>
        </div>

        <label className="block">
          <span className="text-xs uppercase tracking-widest text-amber-200/70">Title (optional)</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Session 12 — the long road"
            className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-widest text-amber-200/70">Venue</span>
          <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)}
            placeholder={defaultVenue ?? 'TPK Brewing'}
            className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
        </label>

        <button type="submit" disabled={pending}
          className="btn-gold w-full px-4 py-2.5 rounded-md text-sm uppercase tracking-wide">
          {pending ? 'Scheduling…' : 'Schedule session'}
        </button>
      </form>
    </div>
  );
}
