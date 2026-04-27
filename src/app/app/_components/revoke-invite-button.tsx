'use client';
import { useTransition } from 'react';
import { revokeInvite } from '../actions';
import { useToast } from './toast';

export default function RevokeInviteButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  function handle() {
    const fd = new FormData();
    fd.set('token', token);
    startTransition(async () => {
      try { await revokeInvite(fd); toast('Invite revoked.'); }
      catch (e) { toast(e instanceof Error ? e.message : 'Could not revoke', 'error'); }
    });
  }
  return (
    <button type="button" onClick={handle} disabled={pending} title="Revoke invite" className="icon-btn icon-btn-danger">
      <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="currentColor">
        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"/>
      </svg>
    </button>
  );
}
