'use client';
import { useState, useTransition } from 'react';
import { changeMemberRole, removeMember } from '../actions';
import { useToast } from './toast';
import { ROLE_LABELS } from '@/lib/roles';

function initials(name: string) { return name.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase(); }

export default function MemberRow({ campaignId, member, isOwnerView, isSelf }: {
  campaignId: string;
  member: { uid: string; displayName: string; role: 'owner' | 'editor' | 'viewer' };
  isOwnerView: boolean; isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  function handleRoleChange(role: string) {
    if (role === member.role) return;
    const fd = new FormData();
    fd.set('campaign_id', campaignId); fd.set('member_uid', member.uid); fd.set('role', role);
    startTransition(async () => {
      try {
        await changeMemberRole(fd);
        toast(`${member.displayName} is now ${ROLE_LABELS[role as keyof typeof ROLE_LABELS]}.`);
      } catch (e) { toast(e instanceof Error ? e.message : 'Could not change role', 'error'); }
    });
  }
  function handleRemove() {
    const fd = new FormData();
    fd.set('campaign_id', campaignId); fd.set('member_uid', member.uid);
    startTransition(async () => {
      try { await removeMember(fd); toast(`${member.displayName} removed.`); }
      catch (e) { toast(e instanceof Error ? e.message : 'Could not remove', 'error'); setConfirmingRemove(false); }
    });
  }

  return (
    <li className="card-mystic rounded-lg p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/25 to-violet-500/15 border border-amber-500/30 flex items-center justify-center font-display text-amber-100 text-sm flex-shrink-0">
        {initials(member.displayName)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-amber-50 truncate">
          {member.displayName}
          {isSelf && <span className="text-xs text-zinc-500 ml-2">(you)</span>}
        </p>
        {isOwnerView && member.role !== 'owner' && !isSelf ? (
          <select value={member.role} disabled={pending}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="mt-1 bg-transparent text-xs text-zinc-400 border-none p-0 focus:outline-none cursor-pointer hover:text-amber-200">
            <option value="editor" className="bg-zinc-900">{ROLE_LABELS.editor}</option>
            <option value="viewer" className="bg-zinc-900">{ROLE_LABELS.viewer}</option>
          </select>
        ) : (
          <p className="text-xs text-zinc-500">{ROLE_LABELS[member.role]}</p>
        )}
      </div>
      {isOwnerView && !isSelf && member.role !== 'owner' && (
        confirmingRemove ? (
          <div className="flex items-center gap-1">
            <button type="button" onClick={handleRemove} disabled={pending} className="btn-danger px-2.5 py-1 rounded text-xs uppercase tracking-wide">
              {pending ? '…' : 'Remove'}
            </button>
            <button type="button" onClick={() => setConfirmingRemove(false)} disabled={pending} className="text-xs text-zinc-400 hover:text-zinc-200 px-1">×</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmingRemove(true)} className="icon-btn icon-btn-danger" title={`Remove ${member.displayName}`}>
            <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"/>
            </svg>
          </button>
        )
      )}
    </li>
  );
}
