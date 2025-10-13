import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

const firebaseAdminConfig = {
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64 || '', 'base64')
      .toString('utf8')
      .replace(/\\n/g, '\n'),
  }),
};

const apps = getApps();
const app = !apps.length ? initializeApp(firebaseAdminConfig) : apps[0];

export const db = getFirestore(app);
export const adminAuth = getAuth(app);
export const adminStorage = getStorage(app);

