import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    // 환경 변수 검증 및 디버그 로깅
    console.log('Firebase Admin SDK 초기화 시도:', {
      hasProjectId: !!projectId,
      hasClientEmail: !!clientEmail,
      hasPrivateKey: !!privateKey,
      projectId: projectId?.substring(0, 5) + '...',
      clientEmail: clientEmail?.substring(0, 5) + '...',
    });

    if (!projectId || !clientEmail || !privateKey) {
      console.error('누락된 환경 변수:', {
        projectId: !projectId,
        clientEmail: !clientEmail,
        privateKey: !privateKey
      });
      throw new Error('Firebase Admin SDK 초기화에 필요한 환경 변수가 누락되었습니다.');
    }

    const cert = {
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    };

    admin.initializeApp({
      credential: admin.credential.cert(cert)
    });

    console.log('Firebase Admin SDK 초기화 성공');
  } catch (error) {
    console.error('Firebase Admin SDK 초기화 실패:', error);
    throw error;
  }
}

export default admin;