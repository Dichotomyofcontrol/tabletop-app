'use client';

import { useState } from 'react';
import { useToast } from './toast';

export default function CopyLinkButton({ url, label }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  function copy() {
    navigator.clipboard.writeText(url)
      .then(() => {
        setCopied(true);
        toast('Link copied.');
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast('Could not copy', 'error'));
  }

  return (
    <button type="button" onClick={copy}
      className="text-xs text-amber-300 hover:text-amber-200 transition inline-flex items-center gap-1.5 whitespace-nowrap"
      title="Copy to clipboard">
      {copied ? (
        <>
          <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="currentColor"><path d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z"/></svg>
          Copied
        </>
      ) : (
        <>
          <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="currentColor"><path d="M9 2a3 3 0 0 0-3 3v1H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V5a3 3 0 0 0-3-3H9Zm0 2h4a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-1V8a2 2 0 0 0-2-2H8V5a1 1 0 0 1 1-1ZM5 8h6v8H5V8Z"/></svg>
          {label ?? 'Copy'}
        </>
      )}
    </button>
  );
}
