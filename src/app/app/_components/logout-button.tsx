'use client';

import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase/client';

export default function LogoutButton() {
  const router = useRouter();
  async function handleLogout() {
    try { await signOut(getClientAuth()); } catch {}
    await fetch('/api/auth/session', { method: 'DELETE' });
    router.replace('/');
    router.refresh();
  }
  return (
    <button type="button" onClick={handleLogout}
      className="text-zinc-400 hover:text-amber-200 transition">
      Log out
    </button>
  );
}
