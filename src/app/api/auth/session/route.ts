import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { SESSION_COOKIE } from '@/lib/firebase/server';

const SESSION_DURATION_MS = 60 * 60 * 24 * 5 * 1000;

async function migrateGuestVotes(guestId: string, realUid: string) {
  if (!guestId.startsWith('g_') || guestId === realUid) return;
  const db = getAdminDb();
  let partsSnap;
  try {
    partsSnap = await db.collectionGroup('participants').where('uid', '==', guestId).get();
  } catch {
    return; // index not ready or query failed — skip silently
  }
  for (const partDoc of partsSnap.docs) {
    const pollRef = partDoc.ref.parent.parent;
    if (!pollRef) continue;
    const guestData = partDoc.data();
    const realPartRef = pollRef.collection('participants').doc(realUid);
    const existingReal = await realPartRef.get();
    const merged = {
      uid: realUid,
      displayName: existingReal.exists
        ? existingReal.data()?.displayName
        : guestData.displayName,
      responses: {
        ...(guestData.responses ?? {}),
        ...(existingReal.data()?.responses ?? {}),
      },
      respondedAt: new Date().toISOString(),
      isGuest: false,
    };
    await realPartRef.set(merged, { merge: true });
    await partDoc.ref.delete();
    await pollRef.update({ memberIds: FieldValue.arrayUnion(realUid) });
    try {
      await pollRef.update({ memberIds: FieldValue.arrayRemove(guestId) });
    } catch {}
  }
}

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

  // Migrate any guest votes from this device into the new account
  const guestId = request.cookies.get('guestId')?.value;
  if (guestId) {
    try {
      await migrateGuestVotes(guestId, decodedUid);
    } catch {}
    store.delete('guestId');
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
