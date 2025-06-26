import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import loadEnv from './loadEnv.mjs';

// 환경 변수 로드
loadEnv();

// Firebase Admin 초기화
const serviceAccount = {
  type: "service_account",
  project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
};

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);

async function migrateLikesToLikedBy() {
  try {
    console.log('마이그레이션 시작...');
    console.log('Firebase Admin 연결 확인 중...');

    // 모든 사용자 가져오기
    const usersSnapshot = await db.collection('users').get();
    console.log(`총 ${usersSnapshot.size}명의 사용자 데이터를 처리합니다.`);
    
    for (const userDoc of usersSnapshot.docs) {
      const uid = userDoc.id;
      
      try {
        // 각 사용자의 contact 정보 가져오기
        const contactSnap = await db.collection('users').doc(uid).collection('info').doc('contact').get();
        
        if (contactSnap.exists) {
          const data = contactSnap.data();
          
          // likes 필드가 있고 likedBy 배열이 없거나 비어있는 경우
          if (data.likes && (!data.likedBy || data.likedBy.length === 0)) {
            // 임시 likedBy 배열 생성 (익명 사용자로 채움)
            const tempLikedBy = Array(data.likes).fill().map((_, i) => 
              `anonymous_migrated_${uid}_${i}`
            );
            
            try {
              // 데이터 업데이트
              await db.collection('users').doc(uid).collection('info').doc('contact').update({
                likedBy: tempLikedBy
              });
              console.log(`마이그레이션 완료 - 사용자 ${uid}: ${data.likes}개의 좋아요를 likedBy 배열로 변환`);
            } catch (updateError) {
              console.error(`사용자 ${uid} 업데이트 실패:`, updateError);
            }
          }
        }
      } catch (userError) {
        console.error(`사용자 ${uid} 처리 중 오류:`, userError);
      }
    }
    
    console.log('모든 데이터 마이그레이션이 완료되었습니다.');
  } catch (error) {
    console.error('마이그레이션 중 오류 발생:', error);
  }
}

// 스크립트 실행
migrateLikesToLikedBy(); 