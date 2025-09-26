import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, runTransaction } from 'firebase/firestore';

interface TestData {
  title: string;
  description: string;
  thumbnail: string;
  concept: string;
  targetAudience: string;
  resultCount: number;
  additionalInfo: string;
  questions: any[];
  authorId: string;
}

export const testService = {
  createTest: async (testData: TestData) => {
    try {
      const docRef = await addDoc(collection(db, 'modoo-ai-tests'), {
        ...testData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        stats: {
          participantCount: 0,
          likeCount: 0,
        },
        status: 'published',
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating test:', error);
      throw new Error('테스트 저장에 실패했습니다.');
    }
  },

  incrementShareCount: async (testId: string) => {
    try {
      const testRef = doc(db, 'modoo-ai-tests', testId);
      await runTransaction(db, async (transaction) => {
        const testDoc = await transaction.get(testRef);
        if (!testDoc.exists()) {
          throw new Error('테스트를 찾을 수 없습니다.');
        }

        const currentStats = testDoc.data().stats || { shareCount: 0 };
        const newShareCount = (currentStats.shareCount || 0) + 1;

        transaction.update(testRef, {
          'stats.shareCount': newShareCount,
          updatedAt: serverTimestamp()
        });
      });
    } catch (error) {
      console.error('공유 수 증가 실패:', error);
      throw new Error('공유 수 업데이트에 실패했습니다.');
    }
  }
};