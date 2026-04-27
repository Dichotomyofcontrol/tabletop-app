import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { SESSION_COOKIE } from '@/lib/firebase/server';

const SESSION_DURATION_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

/** POST { idToken, displayName? } → mints a session cookie. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const idToken: string | undefined = body?.idToken;
  const displayName: string | undefined = body?.displayName;

  if (!idToken) {
    return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
  }

  let sessionCookie: string;
  let decodedUid: string;
  let decodedEmail: string | null = null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    decodedUid = decoded.uid;
    decodedEmail = (decoded.email as string | undefined) ?? null;
    sessionCookie = await getAdminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid idToken', detail: String(err) },
      { status: 401 }
    );
  }

  // Ensure a profile doc exists. Safe to call repeatedly.
  const userRef = getAdminDb().collection('users').doc(decodedUid);
  const existing = await userRef.get();
  if (!existing.exists) {
    await userRef.set({
      displayName: displayName ?? decodedEmail?.split('@')[0] ?? 'Unnamed',
      email: decodedEmail,
      createdAt: new Date().toISOString(),
    });
  } else if (displayName && existing.data()?.displayName !== displayName) {
    await userRef.update({ displayName });
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_MS / 1000,
  });

  return NextResponse.json({ ok: true });
}

/** DELETE → clear the cookie. */
export async function DELETE() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
