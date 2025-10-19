import { adminDb as db } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

interface ArtGenerationStats {
  lastGeneration?: Timestamp;
  dailyCount: number;
}

export async function checkAndUpdateArtGenerationLimit(uid: string): Promise<{ canGenerate: boolean; remainingGenerations: number }> {
  const MAX_DAILY_GENERATIONS = 30;
  const docRef = db.collection('userArtGenerationStats').doc(uid);
  
  try {
    // 현재 날짜의 시작 시간 계산
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // 문서 업데이트 시도
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      
      // 문서가 없거나 마지막 생성이 오늘 이전인 경우
      if (!doc.exists) {
        // 새 문서 생성
        transaction.set(docRef, {
          lastGeneration: FieldValue.serverTimestamp(),
          dailyCount: 1
        });
        return { canGenerate: true, remainingGenerations: MAX_DAILY_GENERATIONS - 1 };
      }

      const data = doc.data() as ArtGenerationStats;
      
      // 마지막 생성이 오늘 이전인 경우 카운트 리셋
      if (data.lastGeneration && data.lastGeneration.toDate() < startOfDay) {
        transaction.set(docRef, {
          lastGeneration: FieldValue.serverTimestamp(),
          dailyCount: 1
        });
        return { canGenerate: true, remainingGenerations: MAX_DAILY_GENERATIONS - 1 };
      }
      
      // 오늘 할당량을 모두 사용한 경우
      if (data.dailyCount >= MAX_DAILY_GENERATIONS) {
        return { canGenerate: false, remainingGenerations: 0 };
      }
      
      // 생성 가능한 경우 카운트 증가
      transaction.update(docRef, {
        lastGeneration: FieldValue.serverTimestamp(),
        dailyCount: FieldValue.increment(1)
      });
      
      return { 
        canGenerate: true, 
        remainingGenerations: MAX_DAILY_GENERATIONS - (data.dailyCount + 1)
      };
    });

    return result;
  } catch (error) {
    console.error('작품 생성 횟수 확인 중 오류:', error);
    throw new Error('작품 생성 횟수를 확인하는 중 오류가 발생했습니다.');
  }
}
