'use client';
import { useState, useTransition } from 'react';
import { updateSession } from '../actions';
import { useToast } from './toast';

function pad(n: number) { return n.toString().padStart(2, '0'); }
function toDateField(iso: string) { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function toTimeField(iso: string) { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }

export default function EditSessionPanel({ campaignId, session, onCancel, onSaved }: {
  campaignId: string;
  session: { id: string; startsAt: string; title: string | null; venue: string | null; notes: string | null };
  onCancel: () => void; onSaved: () => void;
}) {
  const [date, setDate] = useState(toDateField(session.startsAt));
  const [time, setTime] = useState(toTimeField(session.startsAt));
  const [title, setTitle] = useState(session.title ?? '');
  const [venue, setVenue] = useState(session.venue ?? '');
  const [notes, setNotes] = useState(session.notes ?? '');
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time) return;
    const startsAt = new Date(`${date}T${time}:00`).toISOString();
    const fd = new FormData();
    fd.set('campaign_id', campaignId); fd.set('session_id', session.id); fd.set('starts_at', startsAt);
    fd.set('title', title); fd.set('venue', venue); fd.set('notes', notes);
    startTransition(async () => {
      try { await updateSession(fd); toast('Session updated.'); onSaved(); }
      catch (e) { toast(e instanceof Error ? e.message : 'Could not save', 'error'); }
    });
  }

  return (
    <li className="card-mystic rounded-lg p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-display text-amber-100 text-lg">Edit session</h3>
        <button type="button" onClick={onCancel} className="text-xs text-zinc-500 hover:text-zinc-300 uppercase tracking-wide">Cancel</button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-amber-200/70">Date</span>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-amber-200/70">Time</span>
            <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
          </label>
        </div>
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-amber-200/70">Title</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-amber-200/70">Venue</span>
          <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-amber-200/70">Notes / recap</span>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What happened, what to remember" className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md resize-none" />
        </label>
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className="btn-gold px-5 py-2 rounded-md text-sm uppercase tracking-wide">
            {pending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </li>
  );
}
