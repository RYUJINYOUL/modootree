import admin from 'firebase-admin';
import { cert } from 'firebase-admin/app';

const serviceAccount = {
  project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  token_uri: "https://oauth2.googleapis.com/token",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
};

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: cert(serviceAccount)
    });
  } catch (error) {
    console.error('Firebase Admin initialization error');
  }
}

export const initAdmin = () => {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: cert(serviceAccount)
      });
    } catch (error) {
      console.error('Firebase Admin initialization error');
    }
  }
  return admin;
};

export default admin; 