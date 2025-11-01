import { GoogleGenerativeAI } from '@google/generative-ai';
import { db, storage } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_AI_KEY || process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY || '');

export async function analyzeAllInputs(data: {
  meals: {
    breakfast: { description: string };
    lunch: { description: string };
    dinner: { description: string };
    snack: { description: string };
  };
  exercise: { description: string };
}, token: string) {
  try {
    const response = await fetch('/api/health-analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        meals: data.meals,
        exercise: data.exercise
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '분석 요청에 실패했습니다.');
    }

    const result = await response.json();
    return result.analysis;
  } catch (error) {
    console.error('텍스트 분석 중 오류:', error);
    throw error;
  }
}

export async function fileToBase64(file: File): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (!reader.result) {
        return reject(new Error('Failed to read file'));
      }
      const base64 = (reader.result as string).split(',')[1];
      resolve({
        data: base64,
        mimeType: file.type
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadHealthImage(file: File, userId: string, type: string): Promise<string | undefined> {
  try {
    const timestamp = Date.now();
    const path = `health_images/${userId}/${type}_${timestamp}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error('이미지 업로드 중 오류:', error);
    return undefined;
  }
}

export async function saveHealthRecord(db: any, { record, images }: { record: any, images: any }) {
  try {
    const healthRecordRef = collection(db, 'health_records');
    const docRef = await addDoc(healthRecordRef, {
      ...record,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('건강 기록 저장 중 오류:', error);
    throw error;
  }
}

export async function analyzeHealthRecord(data: {
  meals: {
    breakfast: { description: string; imageUrl?: string | null };
    lunch: { description: string; imageUrl?: string | null };
    dinner: { description: string; imageUrl?: string | null };
    snack: { description: string; imageUrl?: string | null };
  };
  exercise: { description: string; imageUrl?: string | null };
}, token: string): Promise<{
  dailySummary: { balanceScore: number; varietyScore: number; effortScore: number; overallComment: string };
  mealFeedback: {
    breakfast: { positives: string[]; suggestions: string[] };
    lunch: { positives: string[]; suggestions: string[] };
    dinner: { positives: string[]; suggestions: string[] };
    snack: { positives: string[]; suggestions: string[] };
  };
  activityFeedback: {
    positives: string[];
    suggestions: string[];
  };
}> {
  try {
    const response = await fetch('/api/health-final-analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        meals: data.meals,
        exercise: data.exercise
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '분석 요청에 실패했습니다.');
    }

    const result = await response.json();
    return result.analysis;
  } catch (error) {
    console.error('건강 기록 분석 중 오류:', error);
    throw error;
  }
}

export async function analyzeDailyActivity(date: string, token: string) {
  try {
    const response = await fetch('/api/analyze-daily-activity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        date
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '일일 활동 분석 요청에 실패했습니다.');
    }

    const result = await response.json();
    return result.analysis;
  } catch (error) {
    console.error('일일 활동 분석 중 오류:', error);
    throw error;
  }
}