import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

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
  }
};