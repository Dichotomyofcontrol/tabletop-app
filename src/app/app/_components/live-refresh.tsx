'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Periodically calls router.refresh() so server-rendered pages reflect changes
 * other users make (RSVPs, votes, comments, etc.) without manual interaction.
 *
 * - Pauses while the tab is hidden (saves bandwidth + Firestore reads).
 * - Refreshes immediately when the tab regains focus.
 */
export default function LiveRefresh({ intervalMs = 12000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    function start() {
      stop();
      timer = setInterval(() => {
        if (!document.hidden) router.refresh();
      }, intervalMs);
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }
    function onVis() {
      if (document.hidden) {
        stop();
      } else {
        router.refresh();
        start();
      }
    }
    start();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [intervalMs, router]);
  return null;
}
