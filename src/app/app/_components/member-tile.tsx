'use client';

import { useState, useTransition } from 'react';
import { changeMemberRole, removeMember, upsertCharacter } from '../actions';
import { useToast } from './toast';
import { ROLE_LABELS } from '@/lib/roles';

function initials(s: string) { return s.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase(); }

export type Character = {
  id: string;
  name: string;
  class: string | null;
  level: number | null;
  sheetUrl: string | null;
  notes: string | null;
};

export type Member = {
  uid: string;
  displayName: string;
  role: 'owner' | 'editor' | 'viewer';
  character: Character | null;
};

export default function MemberTile({ campaignId, member, isOwnerView, isSelf, isGm }: {
  campaignId: string;
  member: Member;
  isOwnerView: boolean;
  isSelf: boolean;
  isGm: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [editing, setEditing] = useState(false);

  // Character form fields (only used in edit mode)
  const c = member.character;
  const [name, setName] = useState(c?.name ?? '');
  const [charClass, setCharClass] = useState(c?.class ?? '');
  const [level, setLevel] = useState(c?.level?.toString() ?? '');
  const [sheetUrl, setSheetUrl] = useState(c?.sheetUrl ?? '');
  const [notes, setNotes] = useState(c?.notes ?? '');

  function handleRoleChange(role: string) {
    if (role === member.role) return;
    const fd = new FormData();
    fd.set('campaign_id', campaignId);
    fd.set('member_uid', member.uid);
    fd.set('role', role);
    startTransition(async () => {
      try {
        await changeMemberRole(fd);
        toast(`${member.displayName} is now ${ROLE_LABELS[role as keyof typeof ROLE_LABELS]}.`);
      } catch (e) { toast(e instanceof Error ? e.message : 'Could not change role', 'error'); }
    });
  }
  function handleRemove() {
    const fd = new FormData();
    fd.set('campaign_id', campaignId);
    fd.set('member_uid', member.uid);
    startTransition(async () => {
      try { await removeMember(fd); toast(`${member.displayName} removed.`); }
      catch (e) { toast(e instanceof Error ? e.message : 'Could not remove', 'error'); setConfirmingRemove(false); }
    });
  }
  function handleSaveCharacter(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast('Name your character first.', 'error'); return; }
    const fd = new FormData();
    fd.set('campaign_id', campaignId);
    if (c?.id) fd.set('id', c.id);
    fd.set('name', name);
    fd.set('class', charClass);
    fd.set('level', level);
    fd.set('sheet_url', sheetUrl);
    fd.set('notes', notes);
    startTransition(async () => {
      try {
        await upsertCharacter(fd);
        toast('Character saved.');
        setEditing(false);
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Could not save', 'error');
      }
    });
  }

  const charInitials = name ? initials(name) : c?.name ? initials(c.name) : '?';
  const hasCharacter = !!c?.name;

  return (
    <li className="rounded-xl border border-white/[0.07] bg-zinc-900/30 overflow-hidden">
      {/* Header row: player avatar, name, role, owner controls */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.05]">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/25 to-violet-500/15 border border-amber-500/30 flex items-center justify-center text-sm font-semibold text-amber-100 shrink-0">
          {initials(member.displayName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-zinc-50 truncate">
            {member.displayName}
            {isSelf && <span className="text-[11px] text-zinc-500 ml-2">(you)</span>}
            {isGm && <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md px-1.5 py-0.5">GM</span>}
          </p>
          {isOwnerView && member.role !== 'owner' && !isSelf ? (
            <select value={member.role} disabled={pending}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="mt-0.5 bg-transparent text-xs text-zinc-400 border-none p-0 focus:outline-none cursor-pointer hover:text-amber-200">
              <option value="editor" className="bg-zinc-900">{ROLE_LABELS.editor}</option>
              <option value="viewer" className="bg-zinc-900">{ROLE_LABELS.viewer}</option>
            </select>
          ) : (
            <p className="text-xs text-zinc-500">{ROLE_LABELS[member.role]}</p>
          )}
        </div>
        {isOwnerView && !isSelf && member.role !== 'owner' && (
          confirmingRemove ? (
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={handleRemove} disabled={pending}
                className="px-2.5 py-1 rounded text-xs uppercase tracking-wide bg-red-950/40 border border-red-900/50 text-red-300 hover:bg-red-900/40 transition">
                {pending ? '…' : 'Remove'}
              </button>
              <button type="button" onClick={() => setConfirmingRemove(false)} disabled={pending}
                className="text-xs text-zinc-400 hover:text-zinc-200 px-1">×</button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmingRemove(true)}
              className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-red-300 hover:bg-red-950/30 transition shrink-0"
              title={`Remove ${member.displayName}`}>
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor"><path d="M4.3 4.3a1 1 0 0 1 1.4 0L8 6.6l2.3-2.3a1 1 0 1 1 1.4 1.4L9.4 8l2.3 2.3a1 1 0 1 1-1.4 1.4L8 9.4l-2.3 2.3a1 1 0 1 1-1.4-1.4L6.6 8 4.3 5.7a1 1 0 0 1 0-1.4Z"/></svg>
            </button>
          )
        )}
      </div>

      {/* Body: character */}
      <div className="px-5 py-4">
        {editing ? (
          <form onSubmit={handleSaveCharacter} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="block sm:col-span-1">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Name</span>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="input-mystic mt-1 w-full px-2.5 py-2 rounded-md text-sm" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Class</span>
                <input type="text" value={charClass} onChange={(e) => setCharClass(e.target.value)}
                  placeholder="Bard, Fighter…"
                  className="input-mystic mt-1 w-full px-2.5 py-2 rounded-md text-sm" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Level</span>
                <input type="number" min={0} max={99} value={level} onChange={(e) => setLevel(e.target.value)}
                  placeholder="any"
                  className="input-mystic mt-1 w-full px-2.5 py-2 rounded-md text-sm" />
              </label>
            </div>
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Sheet link</span>
              <input type="url" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://www.dndbeyond.com/characters/…"
                className="input-mystic mt-1 w-full px-2.5 py-2 rounded-md text-sm" />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Notes</span>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Quirks, goals, secrets…"
                className="input-mystic mt-1 w-full px-2.5 py-2 rounded-md text-sm resize-none" />
            </label>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={pending} className="btn-gold text-xs">
                {pending ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditing(false)} disabled={pending}
                className="btn-ghost text-xs">Cancel</button>
            </div>
          </form>
        ) : hasCharacter ? (
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-violet-500/15 border border-amber-500/30 flex items-center justify-center text-xs font-semibold text-amber-100 shrink-0">
              {charInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-amber-100 text-base leading-tight truncate">{c!.name}</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {[c!.class, c!.level && `Level ${c!.level}`].filter(Boolean).join(' · ') || (
                  <span className="italic text-zinc-600">Class and level not set</span>
                )}
              </p>
              {c!.sheetUrl && (
                <a href={c!.sheetUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-amber-300 hover:text-amber-200 transition truncate block mt-1.5">
                  {c!.sheetUrl.replace(/^https?:\/\//, '')} ↗
                </a>
              )}
              {c!.notes && (
                <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">{c!.notes}</p>
              )}
            </div>
            {isSelf && (
              <button type="button" onClick={() => setEditing(true)}
                className="text-[11px] text-amber-300 hover:text-amber-200 transition shrink-0"
                title="Edit character">
                Edit
              </button>
            )}
          </div>
        ) : isSelf ? (
          <div className="text-center py-2">
            <p className="text-sm text-zinc-500 mb-2.5 italic">No character yet.</p>
            <button type="button" onClick={() => setEditing(true)} className="btn-ghost text-xs">
              + Create your character
            </button>
          </div>
        ) : (
          <p className="text-xs text-zinc-600 italic">{member.displayName} hasn&apos;t added a character yet.</p>
        )}
      </div>
    </li>
  );
}
