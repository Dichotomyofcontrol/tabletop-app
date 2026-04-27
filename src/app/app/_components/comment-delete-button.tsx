'use client';

import { useTransition } from 'react';
import { deletePollComment } from '../actions';
import { useToast } from './toast';

export default function CommentDeleteButton({ pollId, commentId }: {
  pollId: string;
  commentId: string;
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  function handle() {
    if (!confirm('Delete this comment?')) return;
    const fd = new FormData();
    fd.set('poll_id', pollId);
    fd.set('comment_id', commentId);
    startTransition(async () => {
      try { await deletePollComment(fd); }
      catch (e) { toast(e instanceof Error ? e.message : 'Could not delete', 'error'); }
    });
  }
  return (
    <button type="button" onClick={handle} disabled={pending}
      className="text-[11px] text-zinc-500 hover:text-red-300 transition">
      Delete
    </button>
  );
}
