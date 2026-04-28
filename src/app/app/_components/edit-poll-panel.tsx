'use client';

import { useState, useTransition } from 'react';
import { updatePoll } from '../actions';
import { useToast } from './toast';

function pad(n: number) { return n.toString().padStart(2, '0'); }
function toDateField(iso: string) { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function toTimeField(iso: string) { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }

type Props = {
  pollId: string;
  initial: {
    title: string;
    description: string | null;
    venue: string | null;
    system: string | null;
    duration: string | null;
    closesAt: string | null;
    isCampaignPoll: boolean;
    isSingleScheduled: boolean;
    scheduledStartsAt: string | null;
  };
};

export default function EditPollPanel({ pollId, initial }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? '');
  const [venue, setVenue] = useState(initial.venue ?? '');
  const [system, setSystem] = useState(initial.system ?? '');
  const [duration, setDuration] = useState(initial.duration ?? '');
  const [closesAt, setClosesAt] = useState(initial.closesAt ? initial.closesAt.slice(0, 16) : '');
  const [date, setDate] = useState(initial.scheduledStartsAt ? toDateField(initial.scheduledStartsAt) : '');
  const [time, setTime] = useState(initial.scheduledStartsAt ? toTimeField(initial.scheduledStartsAt) : '');
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast('Title is required.', 'error'); return; }
    const fd = new FormData();
    fd.set('poll_id', pollId);
    fd.set('title', title);
    fd.set('description', description);
    fd.set('venue', venue);
    fd.set('system', system);
    fd.set('duration', duration);
    if (closesAt && !initial.isSingleScheduled) fd.set('closes_at', closesAt);
    if (initial.isSingleScheduled && date && time) {
      fd.set('starts_at', new Date(`${date}T${time}:00`).toISOString());
    }
    startTransition(async () => {
      try {
        await updatePoll(fd);
        toast('Saved.');
        setOpen(false);
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Could not save', 'error');
      }
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="btn-ghost text-xs">
        Edit details
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-black/[0.10] dark:border-white/[0.07] bg-white dark:bg-zinc-900/40 p-5">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-sm font-semibold text-zinc-100">Edit details</p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-zinc-500 hover:text-zinc-300 transition">
          Cancel
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Title</span>
          <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
            className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
        </label>

        {initial.isSingleScheduled && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Date</span>
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)}
                className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
            </label>
            <label className="block">
              <span className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Time</span>
              <input type="time" required value={time} onChange={(e) => setTime(e.target.value)}
                className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
            </label>
          </div>
        )}

        <label className="block">
          <span className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Venue</span>
          <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)}
            placeholder="TPK Brewing, my place, Discord…"
            className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
        </label>

        {!initial.isCampaignPoll && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-zinc-400 font-medium uppercase tracking-wide">System</span>
              <input type="text" value={system} onChange={(e) => setSystem(e.target.value)}
                className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
            </label>
            <label className="block">
              <span className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Duration</span>
              <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)}
                className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
            </label>
          </div>
        )}

        <label className="block">
          <span className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Notes</span>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
            className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md resize-none" />
        </label>

        {!initial.isSingleScheduled && (
          <label className="block">
            <span className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Voting closes (optional)</span>
            <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)}
              className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
          </label>
        )}

        <button type="submit" disabled={pending} className="btn-gold w-full">
          {pending ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
