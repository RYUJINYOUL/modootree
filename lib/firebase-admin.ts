import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Firebase Admin SDK 초기화
const firebaseAdminConfig = {
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
};

// 앱이 이미 초기화되어 있지 않은 경우에만 초기화
const apps = getApps();
const app = !apps.length ? initializeApp(firebaseAdminConfig) : apps[0];

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);