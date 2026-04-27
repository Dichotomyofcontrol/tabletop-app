'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, getAdminStorage } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server';
import { pickRandomColor } from '@/lib/campaign-colors';

export type Role = 'owner' | 'editor' | 'viewer';

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
async function requireOwner(uid: string, campaignId: string) {
  const role = await getRole(uid, campaignId);
  if (role !== 'owner') throw new Error('Game Masters only');
}
async function requireEditor(uid: string, campaignId: string) {
  const role = await getRole(uid, campaignId);
  if (role !== 'owner' && role !== 'editor') throw new Error('Permission denied');
}

// ---- Campaigns ----

export async function createCampaign(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || null;
  const system = String(formData.get('system') ?? '').trim() || null;
  const venue = String(formData.get('venue') ?? '').trim() || null;
  if (!name) return redirect('/app/campaigns/new?error=Name+is+required');
  const ref = getAdminDb().collection('campaigns').doc();
  await ref.set({
    name, description, system, venue,
    color: pickRandomColor(),
    ownerId: user.uid, memberIds: [user.uid],
    roles: { [user.uid]: 'owner' },
    createdAt: new Date().toISOString(),
  });
  revalidatePath('/app');
  redirect(`/app/campaigns/${ref.id}`);
}

export async function updateCampaign(formData: FormData) {
  const user = await requireUser();
  const campaignId = String(formData.get('campaign_id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || null;
  const system = String(formData.get('system') ?? '').trim() || null;
  const venue = String(formData.get('venue') ?? '').trim() || null;
  if (!campaignId || !name) throw new Error('Name is required');
  await requireEditor(user.uid, campaignId);
  await getAdminDb().collection('campaigns').doc(campaignId).update({ name, description, system, venue });
  revalidatePath(`/app/campaigns/${campaignId}`);
  revalidatePath('/app');
}

export async function updateCampaignColor(formData: FormData) {
  const user = await requireUser();
  const campaignId = String(formData.get('campaign_id') ?? '');
  const color = String(formData.get('color') ?? '').trim();
  if (!campaignId || !color) throw new Error('Missing fields');
  await requireEditor(user.uid, campaignId);
  await getAdminDb().collection('campaigns').doc(campaignId).update({ color });
  revalidatePath('/app', 'layout');
  revalidatePath(`/app/campaigns/${campaignId}`, 'layout');
}

export async function deleteCampaign(formData: FormData) {
  const user = await requireUser();
  const campaignId = String(formData.get('campaign_id') ?? '');
  const confirmName = String(formData.get('confirm_name') ?? '').trim();
  if (!campaignId) throw new Error('Missing campaign');
  await requireOwner(user.uid, campaignId);
  const db = getAdminDb();
  const campSnap = await db.collection('campaigns').doc(campaignId).get();
  if (!campSnap.exists) throw new Error('Campaign not found');
  const realName = (campSnap.data()?.name as string) ?? '';
  if (confirmName !== realName) throw new Error('Name does not match');

  const sessionsCol = db.collection('campaigns').doc(campaignId).collection('sessions');
  const sessionsSnap = await sessionsCol.get();
  for (const sessDoc of sessionsSnap.docs) {
    const rsvps = await sessDoc.ref.collection('rsvps').get();
    for (const r of rsvps.docs) await r.ref.delete();
    await sessDoc.ref.delete();
  }
  const charsSnap = await db.collection('campaigns').doc(campaignId).collection('characters').get();
  for (const c of charsSnap.docs) await c.ref.delete();
  const invitesSnap = await db.collection('invitations').where('campaignId', '==', campaignId).get();
  for (const inv of invitesSnap.docs) await inv.ref.delete();

  await db.collection('campaigns').doc(campaignId).delete();
  revalidatePath('/app');
  redirect('/app');
}

export async function leaveCampaign(formData: FormData) {
  const user = await requireUser();
  const campaignId = String(formData.get('campaign_id') ?? '');
  if (!campaignId) throw new Error('Missing campaign');
  const role = await getRole(user.uid, campaignId);
  if (!role) throw new Error('Not a member');
  if (role === 'owner') throw new Error('Game Masters cannot leave — delete the campaign instead');
  await getAdminDb().collection('campaigns').doc(campaignId).update({
    memberIds: FieldValue.arrayRemove(user.uid),
    [`roles.${user.uid}`]: FieldValue.delete(),
  });
  revalidatePath('/app');
  redirect('/app');
}

// ---- Members ----

export async function changeMemberRole(formData: FormData) {
  const user = await requireUser();
  const campaignId = String(formData.get('campaign_id') ?? '');
  const memberUid = String(formData.get('member_uid') ?? '');
  const newRole = String(formData.get('role') ?? '') as Role;
  if (!campaignId || !memberUid) throw new Error('Missing fields');
  if (!['editor', 'viewer'].includes(newRole)) throw new Error('Invalid role');
  await requireOwner(user.uid, campaignId);
  if (memberUid === user.uid) throw new Error('You cannot demote yourself');
  await getAdminDb().collection('campaigns').doc(campaignId).update({ [`roles.${memberUid}`]: newRole });
  revalidatePath(`/app/campaigns/${campaignId}`);
}

export async function removeMember(formData: FormData) {
  const user = await requireUser();
  const campaignId = String(formData.get('campaign_id') ?? '');
  const memberUid = String(formData.get('member_uid') ?? '');
  if (!campaignId || !memberUid) throw new Error('Missing fields');
  await requireOwner(user.uid, campaignId);
  if (memberUid === user.uid) throw new Error('You cannot remove yourself');
  await getAdminDb().collection('campaigns').doc(campaignId).update({
    memberIds: FieldValue.arrayRemove(memberUid),
    [`roles.${memberUid}`]: FieldValue.delete(),
  });
  revalidatePath(`/app/campaigns/${campaignId}`);
}

// ---- Sessions ----

export async function createSession(formData: FormData) {
  const user = await requireUser();
  const campaignId = String(formData.get('campaign_id') ?? '');
  const startsAt = String(formData.get('starts_at') ?? '');
  const title = String(formData.get('title') ?? '').trim() || null;
  const venue = String(formData.get('venue') ?? '').trim() || null;
  const notes = String(formData.get('notes') ?? '').trim() || null;
  const frequency = String(formData.get('frequency') ?? 'once') as 'once' | 'weekly' | 'biweekly' | 'monthly';
  const occRaw = parseInt(String(formData.get('occurrences') ?? '1'));
  const occurrences = Math.max(1, Math.min(52, isNaN(occRaw) ? 1 : occRaw));
  if (!campaignId || !startsAt) throw new Error('Date is required');
  await requireEditor(user.uid, campaignId);

  const base = new Date(startsAt);
  const sessions = getAdminDb().collection('campaigns').doc(campaignId).collection('sessions');
  const now = new Date().toISOString();

  function addMonths(d: Date, m: number): Date {
    const r = new Date(d);
    const day = r.getDate();
    r.setDate(1);
    r.setMonth(r.getMonth() + m);
    const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
    r.setDate(Math.min(day, last));
    return r;
  }

  const count = frequency === 'once' ? 1 : occurrences;
  const writes: Promise<unknown>[] = [];
  for (let i = 0; i < count; i++) {
    let when: Date;
    if (i === 0) when = base;
    else if (frequency === 'weekly') when = new Date(base.getTime() + i * 7 * 86400000);
    else if (frequency === 'biweekly') when = new Date(base.getTime() + i * 14 * 86400000);
    else if (frequency === 'monthly') when = addMonths(base, i);
    else when = base;
    writes.push(sessions.add({
      startsAt: when.toISOString(),
      title, venue, notes,
      createdAt: now,
    }));
  }
  await Promise.all(writes);

  revalidatePath(`/app/campaigns/${campaignId}`);
  revalidatePath('/app');
}

export async function updateSession(formData: FormData) {
  const user = await requireUser();
  const campaignId = String(formData.get('campaign_id') ?? '');
  const sessionId = String(formData.get('session_id') ?? '');
  const startsAt = String(formData.get('starts_at') ?? '');
  const title = String(formData.get('title') ?? '').trim() || null;
  const venue = String(formData.get('venue') ?? '').trim() || null;
  const notes = String(formData.get('notes') ?? '').trim() || null;
  if (!campaignId || !sessionId || !startsAt) throw new Error('Date is required');
  await requireEditor(user.uid, campaignId);
  await getAdminDb().collection('campaigns').doc(campaignId)
    .collection('sessions').doc(sessionId).update({
      startsAt: new Date(startsAt).toISOString(), title, venue, notes,
    });
  revalidatePath(`/app/campaigns/${campaignId}`);
  revalidatePath('/app');
}

export async function deleteSession(formData: FormData) {
  const user = await requireUser();
  const campaignId = String(formData.get('campaign_id') ?? '');
  const sessionId = String(formData.get('session_id') ?? '');
  if (!campaignId || !sessionId) throw new Error('Missing fields');
  await requireEditor(user.uid, campaignId);
  const sessRef = getAdminDb().collection('campaigns').doc(campaignId)
    .collection('sessions').doc(sessionId);
  const rsvps = await sessRef.collection('rsvps').get();
  for (const r of rsvps.docs) await r.ref.delete();
  await sessRef.delete();
  revalidatePath(`/app/campaigns/${campaignId}`);
  revalidatePath('/app');
}

export async function rsvp(formData: FormData) {
  const user = await requireUser();
  const sessionId = String(formData.get('session_id') ?? '');
  const status = String(formData.get('status') ?? '');
  const campaignId = String(formData.get('campaign_id') ?? '');
  if (!sessionId || !campaignId || !['yes','no','maybe'].includes(status)) return;
  const role = await getRole(user.uid, campaignId);
  if (!role) return;
  await getAdminDb().collection('campaigns').doc(campaignId)
    .collection('sessions').doc(sessionId).collection('rsvps').doc(user.uid)
    .set({ status, respondedAt: new Date().toISOString() });
  revalidatePath(`/app/campaigns/${campaignId}`);
  revalidatePath('/app');
}

// ---- Invitations ----

export async function createInvite(formData: FormData) {
  const user = await requireUser();
  const campaignId = String(formData.get('campaign_id') ?? '');
  const role = String(formData.get('role') ?? 'viewer') as 'editor' | 'viewer';
  const email = String(formData.get('email') ?? '').trim() || null;
  if (!campaignId) return;
  await requireOwner(user.uid, campaignId);
  const token = randomBytes(16).toString('hex');
  await getAdminDb().collection('invitations').doc(token).set({
    campaignId, role, email,
    createdBy: user.uid, acceptedBy: null, acceptedAt: null,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 14*24*60*60*1000).toISOString(),
  });
  revalidatePath(`/app/campaigns/${campaignId}/invite`);
  redirect(`/app/campaigns/${campaignId}/invite`);
}

export async function revokeInvite(formData: FormData) {
  const user = await requireUser();
  const token = String(formData.get('token') ?? '');
  if (!token) throw new Error('Missing token');
  const inviteRef = getAdminDb().collection('invitations').doc(token);
  const snap = await inviteRef.get();
  if (!snap.exists) throw new Error('Invite not found');
  const campaignId = snap.data()?.campaignId as string;
  await requireOwner(user.uid, campaignId);
  await inviteRef.delete();
  revalidatePath(`/app/campaigns/${campaignId}/invite`);
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
  if (data.expiresAt && new Date(data.expiresAt) < new Date()) redirect('/app?error=Invite+expired');
  const campaignId = data.campaignId as string;
  const role = data.role as 'editor' | 'viewer';
  await getAdminDb().collection('campaigns').doc(campaignId).update({
    memberIds: FieldValue.arrayUnion(user.uid),
    [`roles.${user.uid}`]: role,
  });
  await inviteRef.update({ acceptedBy: user.uid, acceptedAt: new Date().toISOString() });
  revalidatePath('/app');
  redirect(`/app/campaigns/${campaignId}`);
}

// ---- Characters ----

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
  const charsRef = getAdminDb().collection('campaigns').doc(campaignId).collection('characters');
  if (id) {
    const ref = charsRef.doc(id);
    const existing = await ref.get();
    if (existing.exists && existing.data()?.userId === user.uid) {
      await ref.update({ name, class: charClass, level, sheetUrl, notes });
    }
  } else {
    await charsRef.add({
      userId: user.uid, name, class: charClass, level, sheetUrl, notes,
      createdAt: new Date().toISOString(),
    });
  }
  revalidatePath(`/app/campaigns/${campaignId}`);
}

// ---- Profile ----

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  const displayName = String(formData.get('display_name') ?? '').trim();
  if (!displayName) return redirect('/app/settings?error=Display+name+is+required');
  await getAdminDb().collection('users').doc(user.uid).update({ displayName });
  revalidatePath('/app', 'layout');
  redirect('/app/settings?saved=1');
}

// ---- Banner ----

export async function uploadCampaignBanner(formData: FormData) {
  const user = await requireUser();
  const campaignId = String(formData.get('campaign_id') ?? '');
  const file = formData.get('banner') as File | null;
  if (!campaignId || !file || file.size === 0) throw new Error('No file');
  if (file.size > 6 * 1024 * 1024) throw new Error('Image is too large (max 6 MB)');
  if (!file.type.startsWith('image/')) throw new Error('That is not an image');
  await requireOwner(user.uid, campaignId);

  const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg').replace('+xml', '');
  const path = `campaigns/${campaignId}/banner-${Date.now()}.${ext}`;
  const bucket = getAdminStorage().bucket();
  const fileRef = bucket.file(path);
  const buf = Buffer.from(await file.arrayBuffer());
  await fileRef.save(buf, { contentType: file.type, resumable: false });
  await fileRef.makePublic();
  const url = `https://storage.googleapis.com/${bucket.name}/${path}`;

  // Delete old banner if any
  const snap = await getAdminDb().collection('campaigns').doc(campaignId).get();
  const oldPath = snap.data()?.bannerPath as string | undefined;
  if (oldPath) {
    try { await bucket.file(oldPath).delete(); } catch {}
  }

  await getAdminDb().collection('campaigns').doc(campaignId).update({
    bannerUrl: url, bannerPath: path,
  });
  revalidatePath('/app', 'layout');
  revalidatePath(`/app/campaigns/${campaignId}`, 'layout');
}

export async function removeCampaignBanner(formData: FormData) {
  const user = await requireUser();
  const campaignId = String(formData.get('campaign_id') ?? '');
  if (!campaignId) throw new Error('Missing campaign');
  await requireOwner(user.uid, campaignId);
  const snap = await getAdminDb().collection('campaigns').doc(campaignId).get();
  const oldPath = snap.data()?.bannerPath as string | undefined;
  if (oldPath) {
    try { await getAdminStorage().bucket().file(oldPath).delete(); } catch {}
  }
  await getAdminDb().collection('campaigns').doc(campaignId).update({
    bannerUrl: null, bannerPath: null,
  });
  revalidatePath('/app', 'layout');
  revalidatePath(`/app/campaigns/${campaignId}`, 'layout');
}
