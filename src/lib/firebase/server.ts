import 'server-only';

import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from './admin';

export const SESSION_COOKIE = '__session';

export type CurrentUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
};

/** Read the session cookie and verify it. Returns null if not signed in. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const decoded = await getAdminAuth().verifySessionCookie(token, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      displayName: (decoded.name as string | undefined) ?? null,
    };
  } catch {
    return null;
  }
}

/** Read display_name from Firestore profile doc (with auth fallback). */
export async function getDisplayName(uid: string): Promise<string | null> {
  const snap = await getAdminDb().collection('users').doc(uid).get();
  const data = snap.data();
  return (data?.displayName as string | undefined) ?? null;
}
