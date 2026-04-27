import 'server-only';

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';

let adminApp: App | undefined;

function getAdminApp(): App {
  if (adminApp) return adminApp;
  const existing = getApps()[0];
  if (existing) { adminApp = existing; return adminApp; }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin env vars');
  }
  adminApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket,
  });
  return adminApp;
}

export function getAdminAuth(): Auth { return getAuth(getAdminApp()); }
export function getAdminDb(): Firestore { return getFirestore(getAdminApp()); }
export function getAdminStorage(): Storage { return getStorage(getAdminApp()); }
