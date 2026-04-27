'use client';

import { useState, useTransition } from 'react';
import { addPollComment } from '../actions';
import { useToast } from './toast';

export default function PollCommentForm({ pollId, mode, defaultName, disabled }: {
  pollId: string;
  mode: 'auth' | 'guest';
  defaultName?: string;
  disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const [name, setName] = useState(defaultName ?? '');
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    if (mode === 'guest' && !name.trim()) {
      toast('Enter your name first.', 'error');
      return;
    }
    const fd = new FormData();
    fd.set('poll_id', pollId);
    fd.set('text', text.trim());
    if (mode === 'guest') fd.set('display_name', name.trim());
    startTransition(async () => {
      try {
        await addPollComment(fd);
        setText('');
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Could not post', 'error');
      }
    });
  }

  if (disabled) {
    return <p className="text-sm text-zinc-500 italic">Comments are closed.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      {mode === 'guest' && !defaultName && (
        <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="input-mystic w-full px-3 py-2 rounded-md" />
      )}
      <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Add a comment…"
        className="input-mystic w-full px-3 py-2 rounded-md resize-none" />
      <div className="flex justify-end">
        <button type="submit" disabled={pending || !text.trim()} className="btn-gold text-xs">
          {pending ? 'Posting…' : 'Post'}
        </button>
      </div>
    </form>
  );
}
