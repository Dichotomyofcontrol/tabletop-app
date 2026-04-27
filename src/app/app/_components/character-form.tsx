'use client';

import { useState, useTransition } from 'react';
import { upsertCharacter } from '../actions';

type Character = {
  id: string;
  name: string;
  class: string | null;
  level: number | null;
  sheetUrl: string | null;
  notes: string | null;
} | null;

export default function CharacterForm({ campaignId, character }: { campaignId: string; character: Character }) {
  const [name, setName] = useState(character?.name ?? '');
  const [charClass, setCharClass] = useState(character?.class ?? '');
  const [level, setLevel] = useState(character?.level?.toString() ?? '');
  const [sheetUrl, setSheetUrl] = useState(character?.sheetUrl ?? '');
  const [notes, setNotes] = useState(character?.notes ?? '');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set('campaign_id', campaignId);
    if (character?.id) fd.set('id', character.id);
    fd.set('name', name);
    fd.set('class', charClass);
    fd.set('level', level);
    fd.set('sheet_url', sheetUrl);
    fd.set('notes', notes);
    startTransition(async () => {
      await upsertCharacter(fd);
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2500);
    });
  }

  const initials = name ? name.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase() : '?';

  return (
    <div className="card-mystic rounded-xl p-6">
      <div className="flex items-start gap-4 mb-5 pb-5 border-b border-amber-500/10">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500/30 to-violet-500/20 border border-amber-500/30 flex items-center justify-center font-display text-amber-100 text-xl">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-xl text-amber-100 truncate">{name || 'Your character'}</h3>
          <p className="text-sm text-zinc-400">
            {charClass && <span>{charClass}</span>}
            {charClass && level && <span> · </span>}
            {level && <span>Level {level}</span>}
            {!charClass && !level && <span className="italic">Tell us who you are.</span>}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="block md:col-span-1">
            <span className="text-xs uppercase tracking-widest text-amber-200/70">Name</span>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
              className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-amber-200/70">Class</span>
            <input type="text" value={charClass} onChange={(e) => setCharClass(e.target.value)}
              placeholder="Bard, Fighter, …"
              className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-amber-200/70">Level</span>
            <input type="number" min={1} max={20} value={level} onChange={(e) => setLevel(e.target.value)}
              className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
          </label>
        </div>

        <label className="block">
          <span className="text-xs uppercase tracking-widest text-amber-200/70">Sheet link</span>
          <input type="url" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)}
            placeholder="https://www.dndbeyond.com/characters/…"
            className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md" />
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-widest text-amber-200/70">Notes</span>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Quirks, goals, secrets…"
            className="input-mystic mt-1.5 w-full px-3 py-2.5 rounded-md resize-none" />
        </label>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending}
            className="btn-gold px-5 py-2 rounded-md text-sm uppercase tracking-wide">
            {pending ? 'Saving…' : character ? 'Save changes' : 'Create character'}
          </button>
          {savedAt && (
            <span className="text-sm text-amber-300 animate-pulse">✓ Saved</span>
          )}
        </div>
      </form>
    </div>
  );
}
