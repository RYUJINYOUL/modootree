// firebase-admin.ts
import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyBase64 = process.env.FIREBASE_PRIVATE_KEY_BASE64; 

    if (!projectId || !clientEmail || !privateKeyBase64) {
      throw new Error(
        '필수 Firebase Admin 환경 변수가 누락되었습니다:\n' +
        (!projectId ? '- NEXT_PUBLIC_FIREBASE_PROJECT_ID\n' : '') +
        (!clientEmail ? '- FIREBASE_CLIENT_EMAIL\n' : '') +
        (!privateKeyBase64 ? '- FIREBASE_PRIVATE_KEY_BASE64\n' : '')
      );
    }

    const privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf8');

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey, // ⭐ 이 부분이 중요합니다. privateKey 변수만 있어야 합니다.
      }),
    });

    console.log('Firebase Admin SDK가 성공적으로 초기화되었습니다.');
  } catch (error) {
    console.error('Firebase Admin 초기화 오류:', error);
    if (error instanceof Error) {
      console.error('오류 상세:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }
    throw error;
  }
}

export default admin;