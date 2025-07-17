import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const databaseURL = process.env.FIREBASE_DATABASE_URL;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Firebase Admin SDK 초기화에 필요한 환경 변수가 누락되었습니다.');
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        // private_key는 JSON에서 이스케이프된 \n을 실제 개행 문자로 변환
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
      databaseURL: databaseURL // 옵션이지만 있으면 사용
    });

    console.log('Firebase Admin SDK 초기화 성공');
  } catch (error) {
    console.error('Firebase Admin SDK 초기화 실패:', error);
    throw error;
  }
}

export default admin;