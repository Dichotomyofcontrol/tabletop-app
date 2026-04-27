'use client';

import { useState } from 'react';
import { useToast } from './toast';

export default function ShareButtons({ url, subject, body }: {
  url: string;
  subject: string;
  body: string;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(url)
      .then(() => {
        setCopied(true);
        toast('Link copied.');
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast('Could not copy', 'error'));
  }

  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="flex gap-2">
      <button type="button" onClick={copy}
        className="btn-ghost text-xs inline-flex items-center gap-1.5">
        {copied ? (
          <>
            <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="currentColor"><path d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z"/></svg>
            Copied
          </>
        ) : (
          <>
            <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="currentColor"><path d="M9 2a3 3 0 0 0-3 3v1H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V5a3 3 0 0 0-3-3H9Zm0 2h4a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-1V8a2 2 0 0 0-2-2H8V5a1 1 0 0 1 1-1ZM5 8h6v8H5V8Z"/></svg>
            Copy link
          </>
        )}
      </button>
      <a href={mailto}
        className="btn-ghost text-xs inline-flex items-center gap-1.5">
        <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="currentColor"><path d="M3 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5Zm2-1a1 1 0 0 0-1 1v.4l6 4.2 6-4.2V5a1 1 0 0 0-1-1H5Zm11 2.4-5.7 4a1 1 0 0 1-.6 0L4 6.4V15a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6.4Z"/></svg>
        Email it
      </a>
    </div>
  );
}
