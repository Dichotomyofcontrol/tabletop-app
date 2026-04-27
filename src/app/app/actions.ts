'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';

export type Role = 'owner' | 'editor' | 'viewer';

// --------- helpers ------------------------------------------------

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

async function getRole(uid: string, campaignId: string): Promise<Role | null> {
  const snap = await getAdminDb().collection('campaigns').doc(campaignId).get();
  if (!snap.exists) return null;
  const roles = (snap.data()?.roles ?? {}) as Record<string, Role>;
  return roles[uid] ?? null;
}

function canEdit(role: Role | null): boolean {
  return role === 'owner' || role === 'editor';
}

// --------- campaigns ----------------------------------------------

export async function createCampaign(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || null;
  const system = String(formData.get('system') ?? '').trim() || null;
  const venue = String(formData.get('venue') ?? '').trim() || null;

  if (!name) {
    return redirect('/app/campaigns/new?error=Name+is+required');
  }

  const ref = getAdminDb().collection('campaigns').doc();
  await ref.set({
    name,
    description,
    system,
    venue,
    ownerId: user.uid,
    memberIds: [user.uid],
    roles: { [user.uid]: 'owner' },
    createdAt: new Date().toISOString(),
  });

  revalidatePath('/app');
  redirect(`/app/campaigns/${ref.id}`);
}

// --------- sessions -----------------------------------------------

export async function createSession(formData: FormData) {
  const user = await requireUser();
  const campaignId = String(formData.get('campaign_id') ?? '');
  const startsAt = String(formData.get('starts_at') ?? '');
  const title = String(formData.get('title') ?? '').trim() || null;
  const venue = String(formData.get('venue') ?? '').trim() || null;
  const notes = String(formData.get('notes') ?? '').trim() || null;

  if (!campaignId || !startsAt) return;
  const role = await getRole(user.uid, campaignId);
  if (!canEdit(role)) return;

  await getAdminDb()
    .collection('campaigns')
    .doc(campaignId)
    .collection('sessions')
    .add({
      startsAt: new Date(startsAt).toISOString(),
      title,
      venue,
      notes,
      createdAt: new Date().toISOString(),
    });

  revalidatePath(`/app/campaigns/${campaignId}`);
  revalidatePath('/app');
}

export async function rsvp(formData: FormData) {
  const user = await requireUser();
  const sessionId = String(formData.get('session_id') ?? '');
  const status = String(formData.get('status') ?? '');
  const campaignId = String(formData.get('campaign_id') ?? '');
  if (!sessionId || !campaignId || !['yes', 'no', 'maybe'].includes(status)) return;

  const role = await getRole(user.uid, campaignId);
  if (!role) return;

  await getAdminDb()
    .collection('campaigns')
    .doc(campaignId)
    .collection('sessions')
    .doc(sessionId)
    .collection('rsvps')
    .doc(user.uid)
    .set({ status, respondedAt: new Date().toISOString() });

  revalidatePath(`/app/campaigns/${campaignId}`);
  revalidatePath('/app');
}

// --------- invitations --------------------------------------------

export async function createInvite(formData: FormData) {
  const user = await requireUser();
  const campaignId = String(formData.get('campaign_id') ?? '');
  const role = String(formData.get('role') ?? 'viewer') as 'editor' | 'viewer';
  const email = String(formData.get('email') ?? '').trim() || null;
  if (!campaignId) return;

  const myRole = await getRole(user.uid, campaignId);
  if (myRole !== 'owner') {
    return redirect(`/app/campaigns/${campaignId}?error=Owners+only`);
  }

  const token = randomBytes(16).toString('hex');
  await getAdminDb().collection('invitations').doc(token).set({
    campaignId,
    role,
    email,
    createdBy: user.uid,
    acceptedBy: null,
    acceptedAt: null,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  });

  revalidatePath(`/app/campaigns/${campaignId}/invite`);
  redirect(`/app/campaigns/${campaignId}/invite`);
}

export async function acceptInvite(formData: FormData) {
  const user = await requireUser();
  const token = String(formData.get('token') ?? '');
  if (!token) redirect('/app');

  const inviteRef = getAdminDb().collection('invitations').doc(token);
  const snap = await inviteRef.get();
  if (!snap.exists) redirect('/app?error=Invite+not+found');

  const data = snap.data()!;
  if (data.acceptedAt) redirect('/app?error=Invite+already+used');
  if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
    redirect('/app?error=Invite+expired');
  }

  const campaignId = data.campaignId as string;
  const role = data.role as 'editor' | 'viewer';

  // Add user to campaign roles + memberIds.
  const campaignRef = getAdminDb().collection('campaigns').doc(campaignId);
  await campaignRef.update({
    memberIds: FieldValue.arrayUnion(user.uid),
    [`roles.${user.uid}`]: role,
  });

  await inviteRef.update({
    acceptedBy: user.uid,
    acceptedAt: new Date().toISOString(),
  });

  revalidatePath('/app');
  redirect(`/app/campaigns/${campaignId}`);
}

// --------- characters ---------------------------------------------

export async function upsertCharacter(formData: FormData) {
  const user = await requireUser();
  const campaignId = String(formData.get('campaign_id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const charClass = String(formData.get('class') ?? '').trim() || null;
  const levelRaw = String(formData.get('level') ?? '').trim();
  const level = levelRaw ? Number(levelRaw) : null;
  const sheetUrl = String(formData.get('sheet_url') ?? '').trim() || null;
  const notes = String(formData.get('notes') ?? '').trim() || null;
  const id = String(formData.get('id') ?? '') || null;

  if (!campaignId || !name) return;
  const role = await getRole(user.uid, campaignId);
  if (!role) return;

  const charsRef = getAdminDb()
    .collection('campaigns')
    .doc(campaignId)
    .collection('characters');

  if (id) {
    const ref = charsRef.doc(id);
    const existing = await ref.get();
    if (existing.exists && existing.data()?.userId === user.uid) {
      await ref.update({ name, class: charClass, level, sheetUrl, notes });
    }
  } else {
    await charsRef.add({
      userId: user.uid,
      name,
      class: charClass,
      level,
      sheetUrl,
      notes,
      createdAt: new Date().toISOString(),
    });
  }

  revalidatePath(`/app/campaigns/${campaignId}`);
  redirect(`/app/campaigns/${campaignId}?saved=character`);
}

// --------- profile ------------------------------------------------

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  const displayName = String(formData.get('display_name') ?? '').trim();
  if (!displayName) {
    return redirect('/app/settings?error=Display+name+is+required');
  }
  await getAdminDb().collection('users').doc(user.uid).update({ displayName });
  revalidatePath('/app', 'layout');
  redirect('/app/settings?saved=1');
}
