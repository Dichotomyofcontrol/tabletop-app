'use client';
import { useState } from 'react';
import RsvpChip from './rsvp-chip';
import EditSessionPanel from './edit-session-panel';
import DeleteSessionButton from './delete-session-button';
import { LocalTime } from './local-time';

export type PartyRsvp = { uid: string; displayName: string; status: 'yes' | 'no' | 'maybe' };

function dow(iso: string) { return new Date(iso).toLocaleDateString('en-US', { weekday: 'short' }); }
function day(iso: string) { return new Date(iso).getDate(); }
function initials(name: string) { return name.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase(); }

export default function SessionRow({ campaignId, session, myRsvp, partyRsvps, canEdit, color }: {
  campaignId: string;
  session: { id: string; startsAt: string; title: string | null; venue: string | null; notes: string | null };
  myRsvp: 'yes' | 'no' | 'maybe' | null;
  partyRsvps: PartyRsvp[];
  canEdit: boolean;
  color?: string;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return <EditSessionPanel campaignId={campaignId} session={session} onCancel={() => setEditing(false)} onSaved={() => setEditing(false)} />;
  }
  const order = { yes: 0, maybe: 1, no: 2 };
  const sorted = [...partyRsvps].sort((a, b) => order[a.status] - order[b.status]);
  const visible = sorted.slice(0, 5);
  const extra = sorted.length - visible.length;
  const c = color || '#f59e0b';

  return (
    <li className="session-row card-mystic rounded-lg p-4 flex items-start gap-4 group color-bar" style={{ ['--c' as string]: c }}>
      <div className="text-center min-w-[44px] pt-0.5">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">{dow(session.startsAt)}</p>
        <p className="text-2xl font-semibold leading-none mt-0.5" style={{ color: c }}>{day(session.startsAt)}</p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-zinc-50 leading-tight">{session.title || 'Session'}</p>
        <p className="text-sm text-zinc-400 mt-0.5">
          <LocalTime iso={session.startsAt} />
          {session.venue && <span className="text-zinc-500"> · {session.venue}</span>}
        </p>
        {sorted.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <div className="flex -space-x-2">
              {visible.map((p) => (
                <span key={p.uid} title={`${p.displayName} · ${p.status}`} className={`avatar avatar-${p.status}`}>{initials(p.displayName)}</span>
              ))}
              {extra > 0 && <span className="avatar text-zinc-300">+{extra}</span>}
            </div>
            <span className="text-xs text-zinc-500 ml-1">{sorted.filter(s => s.status === 'yes').length} confirmed</span>
          </div>
        )}
        {session.notes && (
          <p className="mt-3 text-sm text-zinc-400 italic border-l-2 border-white/[0.07] pl-3 leading-relaxed">{session.notes}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <RsvpChip sessionId={session.id} campaignId={campaignId} current={myRsvp} />
        {canEdit && (
          <div className="row-actions flex gap-1.5">
            <button type="button" onClick={() => setEditing(true)} title="Edit" className="icon-btn">
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
                <path d="M14.69 2.66a2.25 2.25 0 0 1 3.18 3.18l-9.93 9.93a3 3 0 0 1-1.27.76l-3.06.92a.75.75 0 0 1-.94-.94l.92-3.06a3 3 0 0 1 .76-1.27l9.93-9.93Z"/>
              </svg>
            </button>
            <DeleteSessionButton campaignId={campaignId} sessionId={session.id} sessionTitle={session.title || 'this session'} />
          </div>
        )}
      </div>
    </li>
  );
}
