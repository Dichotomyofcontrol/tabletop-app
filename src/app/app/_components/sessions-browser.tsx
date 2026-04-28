'use client';

import { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { deleteSession } from '../actions';
import { useToast } from './toast';
import EditSessionPanel from './edit-session-panel';
import RsvpChip from './rsvp-chip';

export type BrowserSession = {
  id: string;
  campaignId: string;
  campaignName: string;
  campaignColor: string; // hex
  startsAt: string;
  title: string | null;
  venue: string | null;
  notes: string | null;
  gmName: string | null;
  seriesId: string | null;
  canEdit: boolean;
  rsvps: { uid: string; displayName: string; status: 'yes' | 'no' | 'maybe' }[];
  myRsvp: 'yes' | 'no' | 'maybe' | null;
};

type Filter = 'all' | 'upcoming' | 'past';
type Sort = 'asc' | 'desc';
type View = 'list' | 'calendar';

function pad2(n: number) { return n.toString().padStart(2, '0'); }
function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
}
function timeStr(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function dowStr(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
}
function dayNum(iso: string) { return new Date(iso).getDate(); }

export default function SessionsBrowser({ sessions }: { sessions: BrowserSession[] }) {
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [sort, setSort] = useState<Sort>('asc');
  const [view, setView] = useState<View>('list');
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const filtered = useMemo(() => {
    const now = Date.now();
    let xs = sessions.filter((s) => {
      const t = new Date(s.startsAt).getTime();
      if (filter === 'upcoming') return t >= now;
      if (filter === 'past') return t < now;
      return true;
    });
    xs.sort((a, b) =>
      sort === 'asc' ? a.startsAt.localeCompare(b.startsAt) : b.startsAt.localeCompare(a.startsAt)
    );
    return xs;
  }, [sessions, filter, sort]);

  const groups = useMemo(() => {
    const m = new Map<string, BrowserSession[]>();
    for (const s of filtered) {
      const k = monthKey(s.startsAt);
      const arr = m.get(k) ?? [];
      arr.push(s);
      m.set(k, arr);
    }
    return m;
  }, [filtered]);

  const allCollapsed = groups.size > 0 && Array.from(groups.keys()).every((k) => collapsedMonths.has(k));

  function toggleMonth(k: string) {
    const next = new Set(collapsedMonths);
    if (next.has(k)) next.delete(k); else next.add(k);
    setCollapsedMonths(next);
  }
  function toggleAll() {
    if (allCollapsed) setCollapsedMonths(new Set());
    else setCollapsedMonths(new Set(groups.keys()));
  }

  function handleDelete(s: BrowserSession) {
    if (!confirm(`Delete "${s.title || 'this session'}"? This can't be undone.`)) return;
    const fd = new FormData();
    fd.set('campaign_id', s.campaignId);
    fd.set('session_id', s.id);
    startTransition(async () => {
      try {
        await deleteSession(fd);
        toast('Session deleted.');
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Could not delete', 'error');
      }
    });
  }

  // Toolbar pill button styles
  const pill = (active: boolean) =>
    `px-3 py-1.5 rounded-md text-xs font-medium transition ${
      active
        ? 'bg-zinc-50 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
        : 'text-zinc-400 hover:text-zinc-100'
    }`;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 p-1 rounded-lg bg-zinc-900/60 border border-white/[0.06]">
          <button type="button" onClick={() => setView('list')} className={pill(view === 'list')}>List</button>
          <button type="button" onClick={() => setView('calendar')} className={pill(view === 'calendar')}>Calendar</button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 p-1 rounded-lg bg-zinc-900/60 border border-white/[0.06]">
            <button type="button" onClick={() => setFilter('all')} className={pill(filter === 'all')}>All</button>
            <button type="button" onClick={() => setFilter('upcoming')} className={pill(filter === 'upcoming')}>Upcoming</button>
            <button type="button" onClick={() => setFilter('past')} className={pill(filter === 'past')}>Past</button>
          </div>
          <button type="button" onClick={() => setSort(sort === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-white/[0.06] text-xs font-medium text-zinc-300 hover:text-zinc-50 transition inline-flex items-center gap-1.5">
            <span>{sort === 'asc' ? '↑' : '↓'}</span>
            {sort === 'asc' ? 'Soonest first' : 'Latest first'}
          </button>
          <button type="button" onClick={toggleAll}
            className="px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-white/[0.06] text-xs font-medium text-zinc-300 hover:text-zinc-50 transition">
            {allCollapsed ? 'Expand all' : 'Collapse all'}
          </button>
        </div>
      </div>

      {view === 'calendar' ? (
        <div className="rounded-xl border border-dashed border-white/[0.08] p-12 text-center">
          <p className="text-zinc-300">Calendar view is coming soon.</p>
          <p className="text-sm text-zinc-500 mt-1">For now, browse by month in list view.</p>
        </div>
      ) : groups.size === 0 ? (
        <div className="rounded-xl border border-dashed border-white/[0.08] p-12 text-center">
          <p className="text-zinc-300">
            {filter === 'past' ? 'Nothing in the past.' : filter === 'upcoming' ? 'Nothing scheduled.' : 'No sessions yet.'}
          </p>
          <p className="text-sm text-zinc-500 mt-1">
            Use Schedule a session in the sidebar to add one.
          </p>
        </div>
      ) : (
        Array.from(groups.entries()).map(([key, list]) => {
          const collapsed = collapsedMonths.has(key);
          return (
            <section key={key}>
              <button type="button" onClick={() => toggleMonth(key)}
                className="flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-zinc-500 hover:text-zinc-300 transition mb-3">
                <svg viewBox="0 0 12 12" className={`w-2.5 h-2.5 transition-transform ${collapsed ? '-rotate-90' : ''}`} fill="currentColor">
                  <path d="M2 4 L6 8 L10 4 Z" />
                </svg>
                <span className="font-semibold">{monthLabel(key)}</span>
                <span className="text-zinc-600">· {list.length}</span>
              </button>
              {!collapsed && (
                <ul className="space-y-2">
                  {list.map((s) => {
                    if (editingId === s.id) {
                      return (
                        <EditSessionPanel
                          key={s.id}
                          campaignId={s.campaignId}
                          session={{ id: s.id, startsAt: s.startsAt, title: s.title, venue: s.venue, notes: s.notes }}
                          seriesId={s.seriesId}
                          onCancel={() => setEditingId(null)}
                          onSaved={() => setEditingId(null)}
                        />
                      );
                    }
                    const isOpen = expandedRow === s.id;
                    const yes = s.rsvps.filter((r) => r.status === 'yes');
                    return (
                      <li key={s.id} className="rounded-lg border border-white/[0.07] bg-zinc-900/40 hover:border-white/[0.14] transition relative overflow-hidden">
                        <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: s.campaignColor }} />
                        <div className="flex items-center gap-4 px-5 py-3.5 pl-6">
                          <div className="text-center min-w-[44px] shrink-0">
                            <div className="text-2xl font-semibold leading-none" style={{ color: s.campaignColor }}>{dayNum(s.startsAt)}</div>
                            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-0.5">{dowStr(s.startsAt)}</div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link href={`/app/campaigns/${s.campaignId}`}
                              className="font-semibold text-zinc-50 hover:text-amber-200 transition truncate block">
                              {s.title || s.campaignName}
                            </Link>
                            <p className="text-xs text-zinc-500 mt-0.5 truncate">
                              {s.title && <><span className="text-zinc-400">{s.campaignName}</span> · </>}
                              {s.gmName && <>GM: {s.gmName} · </>}
                              {timeStr(s.startsAt)}
                              {s.venue && ` · ${s.venue}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <RsvpChip sessionId={s.id} campaignId={s.campaignId} current={s.myRsvp} />
                            {s.canEdit && (
                              <>
                                <button type="button" onClick={() => setEditingId(s.id)}
                                  className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-100 hover:bg-white/[0.06] transition"
                                  title="Edit">
                                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor"><path d="M11.6 2.4a1.4 1.4 0 0 1 2 2L6 12 2 13l1-4 8.6-6.6Z"/></svg>
                                </button>
                                <button type="button" onClick={() => handleDelete(s)} disabled={pending}
                                  className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-red-300 hover:bg-red-950/30 transition"
                                  title="Delete">
                                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor"><path d="M4.3 4.3a1 1 0 0 1 1.4 0L8 6.6l2.3-2.3a1 1 0 1 1 1.4 1.4L9.4 8l2.3 2.3a1 1 0 1 1-1.4 1.4L8 9.4l-2.3 2.3a1 1 0 1 1-1.4-1.4L6.6 8 4.3 5.7a1 1 0 0 1 0-1.4Z"/></svg>
                                </button>
                              </>
                            )}
                            <button type="button" onClick={() => setExpandedRow(isOpen ? null : s.id)}
                              className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-100 hover:bg-white/[0.06] transition"
                              title={isOpen ? 'Collapse' : 'Expand'}>
                              <svg viewBox="0 0 16 16" className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="currentColor">
                                <path d="M6 3 L11 8 L6 13 Z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        {isOpen && (
                          <div className="px-6 pb-4 pl-6 border-t border-white/[0.05] pt-3 space-y-3">
                            {s.notes && <p className="text-sm text-zinc-300 whitespace-pre-wrap">{s.notes}</p>}
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 font-semibold mb-1.5">
                                {yes.length} confirmed · {s.rsvps.length} responded
                              </p>
                              {s.rsvps.length === 0 ? (
                                <p className="text-xs text-zinc-500 italic">No responses yet.</p>
                              ) : (
                                <ul className="text-xs space-y-1">
                                  {s.rsvps.map((r) => (
                                    <li key={r.uid} className="flex items-center justify-between">
                                      <span className="text-zinc-300">{r.displayName}</span>
                                      <span className={r.status === 'yes' ? 'text-lime-300' : r.status === 'maybe' ? 'text-amber-300' : 'text-zinc-500'}>
                                        {r.status === 'yes' ? 'In' : r.status === 'maybe' ? 'Maybe' : 'Not coming'}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
