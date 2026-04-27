'use client';
import { useState, useTransition } from 'react';
import { updateSession, updateSessionSeries } from '../actions';
import { useToast } from './toast';

function pad(n: number) { return n.toString().padStart(2, '0'); }
function toDateField(iso: string) { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function toTimeField(iso: string) { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }

export default function EditSessionPanel({ campaignId, session, seriesId, onCancel, onSaved }: {
  campaignId: string;
  session: { id: string; startsAt: string; title: string | null; venue: string | null; notes: string | null };
  seriesId: string | null;
  onCancel: () => void; onSaved: () => void;
}) {
  const [date, setDate] = useState(toDateField(session.startsAt));
  const [time, setTime] = useState(toTimeField(session.startsAt));
  const [title, setTitle] = useState(session.title ?? '');
  const [venue, setVenue] = useState(session.venue ?? '');
  const [notes, setNotes] = useState(session.notes ?? '');
  const [scope, setScope] = useState<'this' | 'following'>('this');
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time) return;
    startTransition(async () => {
      try {
        if (scope === 'this' || !seriesId) {
          const startsAt = new Date(`${date}T${time}:00`).toISOString();
          const fd = new FormData();
          fd.set('campaign_id', campaignId);
          fd.set('session_id', session.id);
          fd.set('starts_at', startsAt);
          fd.set('title', title); fd.set('venue', venue); fd.set('notes', notes);
          await updateSession(fd);
          toast('Session updated.');
        } else {
          const fd = new FormData();
          fd.set('campaign_id', campaignId);
          fd.set('series_id', seriesId);
          fd.set('from_iso', session.startsAt);
          fd.set('time_only', time);
          fd.set('title', title); fd.set('venue', venue); fd.set('notes', notes);
          await updateSessionSeries(fd);
          toast('Series updated.');
        }
        onSaved();
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Could not save', 'error');
      }
    });
  }

  return (
    <li className="card-mystic rounded-lg p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-display text-zinc-100 text-lg">Edit session</h3>
        <button type="button" onClick={onCancel} className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 uppercase tracking-wide">Cancel</button>
      </div>

      {seriesId && (
        <div className="mb-5 p-3 rounded-md bg-amber-500/[0.06] border border-amber-500/20">
          <p className="text-xs text-zinc-500 mb-2">This session is part of a recurring series. Apply changes to:</p>
          <div className="flex gap-2">
            {(['this','following'] as const).map((s) => (
              <button key={s} type="button" onClick={() => setScope(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  scope === s ? 'bg-amber-500 text-zinc-900' : 'bg-transparent text-zinc-400 hover:text-zinc-100 border border-black/[0.10] dark:border-white/[0.10]'
                }`}>
                {s === 'this' ? 'This session only' : 'This and all upcoming'}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-zinc-500 font-medium">Date</span>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)}
              disabled={scope === 'following'}
              className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md disabled:opacity-50 disabled:cursor-not-allowed" />
            {scope === 'following' && <span className="text-[10px] text-zinc-500 mt-1 block">Date stays per-session; only time-of-day applies series-wide.</span>}
          </label>
          <label className="block">
            <span className="text-xs text-zinc-500 font-medium">Time</span>
            <input type="time" required value={time} onChange={(e) => setTime(e.target.value)}
              className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
          </label>
        </div>
        <label className="block">
          <span className="text-xs text-zinc-500 font-medium">Title</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
        </label>
        <label className="block">
          <span className="text-xs text-zinc-500 font-medium">Venue</span>
          <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)}
            className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
        </label>
        <label className="block">
          <span className="text-xs text-zinc-500 font-medium">Notes / recap</span>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="What happened, what to remember"
            className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md resize-none" />
        </label>
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className="btn-gold">
            {pending ? 'Saving…' : scope === 'following' ? 'Save series' : 'Save session'}
          </button>
        </div>
      </form>
    </li>
  );
}
