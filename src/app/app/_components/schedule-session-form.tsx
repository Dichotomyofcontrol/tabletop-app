'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createSession, createPoll } from '../actions';
import { useToast } from './toast';

type Campaign = { id: string; name: string; venue: string | null };
type Mode = 'date' | 'poll';
type Frequency = 'once' | 'weekly' | 'biweekly' | 'monthly';
type Slot = { date: string; time: string };

function pad(n: number) { return n.toString().padStart(2, '0'); }
function tomorrowAt(hour: number) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(hour)}:00` };
}

export default function ScheduleSessionForm({
  userCampaigns,
  initialCampaignId,
  initialMode,
  lockCampaign,
}: {
  userCampaigns: Campaign[];
  initialCampaignId?: string | null;
  initialMode?: Mode;
  lockCampaign?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();

  const [campaignId, setCampaignId] = useState<string>(initialCampaignId ?? '');
  const [mode, setMode] = useState<Mode>(initialMode ?? 'date');
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [notes, setNotes] = useState('');

  // Date mode
  const first = tomorrowAt(19);
  const [date, setDate] = useState(first.date);
  const [time, setTime] = useState(first.time);
  const [frequency, setFrequency] = useState<Frequency>('once');
  const [occurrences, setOccurrences] = useState(8);

  // Poll mode
  const [slots, setSlots] = useState<Slot[]>([tomorrowAt(19), tomorrowAt(19)]);
  const [closesAt, setClosesAt] = useState('');
  const [system, setSystem] = useState('');
  const [duration, setDuration] = useState('');

  const [pending, startTransition] = useTransition();

  const selectedCampaign = useMemo(
    () => userCampaigns.find((c) => c.id === campaignId) ?? null,
    [userCampaigns, campaignId]
  );
  const isOneShot = !campaignId;
  const placeholderVenue = selectedCampaign?.venue ?? '';

  function addSlot() { setSlots([...slots, tomorrowAt(19)]); }
  function removeSlot(i: number) {
    if (slots.length <= 2) return;
    setSlots(slots.filter((_, idx) => idx !== i));
  }
  function updateSlot(i: number, patch: Partial<Slot>) {
    setSlots(slots.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast('Give it a title.', 'error');
      return;
    }

    if (mode === 'date') {
      if (!date || !time) { toast('Pick a date and time.', 'error'); return; }
      const startsAt = new Date(`${date}T${time}:00`).toISOString();

      if (campaignId) {
        // Campaign + Pick a date  →  createSession (supports recurring)
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
            router.push(`/app/campaigns/${campaignId}`);
            router.refresh();
          } catch (e) { toast(e instanceof Error ? e.message : 'Could not save', 'error'); }
        });
      } else {
        // One-shot + Pick a date  →  createPoll with single option (auto-locks + redirects to /app/polls/[id])
        const fd = new FormData();
        fd.set('title', title);
        fd.set('description', notes);
        fd.set('venue', venue);
        if (system) fd.set('system', system);
        if (duration) fd.set('duration', duration);
        fd.append('option', startsAt);
        startTransition(async () => {
          try { await createPoll(fd); }
          catch (e) { toast(e instanceof Error ? e.message : 'Could not save', 'error'); }
        });
      }
    } else {
      // Poll mode
      const valid = slots.filter((s) => s.date && s.time);
      if (valid.length < 2) { toast('Add at least two date options.', 'error'); return; }
      const fd = new FormData();
      fd.set('title', title);
      fd.set('description', notes);
      fd.set('venue', venue);
      if (campaignId) fd.set('campaign_id', campaignId);
      if (isOneShot && system) fd.set('system', system);
      if (isOneShot && duration) fd.set('duration', duration);
      if (closesAt) fd.set('closes_at', closesAt);
      for (const s of valid) {
        fd.append('option', new Date(`${s.date}T${s.time}:00`).toISOString());
      }
      startTransition(async () => {
        try { await createPoll(fd); }
        catch (e) { toast(e instanceof Error ? e.message : 'Could not save', 'error'); }
      });
    }
  }

  const submitLabel = pending
    ? 'Saving…'
    : mode === 'date'
      ? campaignId
        ? frequency === 'once' ? 'Schedule session' : `Schedule ${occurrences} sessions`
        : 'Lock in date'
      : 'Open the vote';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Campaign context */}
      {lockCampaign && selectedCampaign ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.04] px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-300 shrink-0">Scheduling for</span>
          <span className="text-sm font-semibold text-zinc-100 truncate">{selectedCampaign.name}</span>
          <span className="ml-auto text-[11px] text-zinc-500">Goes on this campaign\u2019s calendar.</span>
        </div>
      ) : (
        <div>
          <label className="block">
            <span className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Campaign</span>
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md">
              <option value="">One-shot — no campaign</option>
              {userCampaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <p className="text-[11px] text-zinc-500 mt-1.5">
            {isOneShot
              ? 'A standalone event. You\u2019ll get a public link to share with anyone.'
              : `Adds to ${selectedCampaign?.name ?? 'the campaign'}\u2019s calendar.`}
          </p>
        </div>
      )}

      {/* Mode toggle */}
      <div>
        <span className="text-xs text-zinc-400 font-medium uppercase tracking-wide block mb-2">When</span>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setMode('date')}
            className={`text-left px-4 py-3 rounded-lg border transition ${
              mode === 'date'
                ? 'border-amber-500/50 bg-amber-500/[0.07] text-zinc-50'
                : 'border-black/[0.10] dark:border-white/[0.07] hover:border-amber-500/30 text-zinc-400'
            }`}>
            <p className="text-sm font-semibold">Pick a date</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">You already know when.</p>
          </button>
          <button type="button" onClick={() => setMode('poll')}
            className={`text-left px-4 py-3 rounded-lg border transition ${
              mode === 'poll'
                ? 'border-amber-500/50 bg-amber-500/[0.07] text-zinc-50'
                : 'border-black/[0.10] dark:border-white/[0.07] hover:border-amber-500/30 text-zinc-400'
            }`}>
            <p className="text-sm font-semibold">Vote on dates</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Let the party pick.</p>
          </button>
        </div>
      </div>

      {/* Common fields */}
      <label className="block">
        <span className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Title</span>
        <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder={isOneShot ? 'One-shot night' : 'Session 14 — the long road'}
          className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
      </label>

      <label className="block">
        <span className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Venue</span>
        <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)}
          placeholder={placeholderVenue || 'TPK Brewing, my place, Discord…'}
          className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
      </label>

      {isOneShot && mode === 'poll' && (
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-zinc-400 font-medium uppercase tracking-wide">System</span>
            <input type="text" value={system} onChange={(e) => setSystem(e.target.value)}
              placeholder="D&D 5e, Blades…"
              className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Duration</span>
            <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)}
              placeholder="3 hours"
              className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
          </label>
        </div>
      )}

      <label className="block">
        <span className="text-xs text-zinc-400 font-medium uppercase tracking-wide">
          {mode === 'poll' ? 'Pitch (optional)' : 'Notes (optional)'}
        </span>
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder={mode === 'poll' ? "What's the vibe? What should they expect?" : "Anything to flag — pre-reading, prep, what's brewing…"}
          className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md resize-none" />
      </label>

      {/* Date mode: single date + recurring */}
      {mode === 'date' && (
        <div className="space-y-4 pt-2 border-t border-black/[0.06] dark:border-white/[0.05]">
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
          {!isOneShot && (
            <div className={`grid gap-3 ${frequency === 'once' ? 'grid-cols-1' : 'grid-cols-2'}`}>
              <label className="block">
                <span className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Repeats</span>
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
                  <span className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Count</span>
                  <input type="number" min={2} max={52} value={occurrences}
                    onChange={(e) => setOccurrences(Math.max(2, Math.min(52, parseInt(e.target.value) || 2)))}
                    className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
                </label>
              )}
            </div>
          )}
        </div>
      )}

      {/* Poll mode: multiple slots + deadline */}
      {mode === 'poll' && (
        <div className="space-y-4 pt-2 border-t border-black/[0.06] dark:border-white/[0.05]">
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Date options</span>
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
                    aria-label="Remove option">×</button>
                </li>
              ))}
            </ul>
          </div>
          <label className="block">
            <span className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Voting closes (optional)</span>
            <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)}
              className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
            <span className="text-[11px] text-zinc-500 mt-1 block">
              Leave blank to keep voting open until you pick a winner.
            </span>
          </label>
        </div>
      )}

      <button type="submit" disabled={pending} className="btn-gold w-full">
        {submitLabel}
      </button>
    </form>
  );
}
