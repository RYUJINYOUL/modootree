import { GoogleGenerativeAI } from '@google/generative-ai';
import { db, storage } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_AI_KEY || process.env.GOOGLE_AI_KEY || '');

export async function analyzeAllInputs(data: {
  meals: {
    breakfast: { description: string };
    lunch: { description: string };
    dinner: { description: string };
    snack: { description: string };
  };
  exercise: { description: string };
}) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `사용자의 식사와 운동 기록을 분석하여 각각의 주요 내용을 정리해주세요.

[입력 내용]
${data.meals.breakfast.description.trim() && `아침: ${data.meals.breakfast.description}`}
${data.meals.lunch.description.trim() && `점심: ${data.meals.lunch.description}`}
${data.meals.dinner.description.trim() && `저녁: ${data.meals.dinner.description}`}
${data.meals.snack.description.trim() && `기타: ${data.meals.snack.description}`}
${data.exercise.description.trim() && `운동: ${data.exercise.description}`}

각 항목을 다음 JSON 형식으로 분석해주세요:
{
  "meals": {
    "breakfast": {
      "mainDish": "주요 메뉴",
      "sideDishes": "추가 메뉴",
      "portion": "식사량"
    },
    "lunch": {
      "mainDish": "주요 메뉴",
      "sideDishes": "추가 메뉴",
      "portion": "식사량"
    },
    "dinner": {
      "mainDish": "주요 메뉴",
      "sideDishes": "추가 메뉴",
      "portion": "식사량"
    },
    "snack": {
      "mainDish": "주요 메뉴",
      "sideDishes": "추가 메뉴",
      "portion": "식사량"
    }
  },
  "exercise": {
    "type": "운동 종류",
    "duration": "운동 시간",
    "intensity": "운동 강도"
  }
}

입력되지 않은 항목은 null로 표시해주세요.`;

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.2
      }
    });

    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON 응답을 찾을 수 없습니다.');
    }
    
    const jsonStr = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonStr);
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
}): Promise<{
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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `당신은 사용자의 하루 건강 기록을 분석하여 영양 균형도, 식단 다양성, 건강관리 노력도를 평가하고 
구체적인 피드백을 제공하는 AI 건강 코치입니다. 다음 정보를 분석하여 JSON 형식으로 응답해주세요.

### 오늘의 건강 기록

[식사 기록]
- 아침: ${data.meals.breakfast.description || '기록 없음'}
- 점심: ${data.meals.lunch.description || '기록 없음'}
- 저녁: ${data.meals.dinner.description || '기록 없음'}
- 기타: ${data.meals.snack.description || '기록 없음'}

[운동 기록]
${data.exercise.description || '기록 없음'}

다음 JSON 형식으로 분석 결과를 반환해주세요:
{
  "dailySummary": {
    "balanceScore": 0~100 사이의 영양 균형도 점수,
    "varietyScore": 0~100 사이의 식단 다양성 점수,
    "effortScore": 0~100 사이의 건강관리 노력도 점수,
    "overallComment": "전반적인 평가와 조언"
  },
  "mealFeedback": {
    "breakfast": {
      "positives": ["잘한 점 1", "잘한 점 2"],
      "suggestions": ["개선점 1", "개선점 2"]
    },
    "lunch": {
      "positives": ["잘한 점 1", "잘한 점 2"],
      "suggestions": ["개선점 1", "개선점 2"]
    },
    "dinner": {
      "positives": ["잘한 점 1", "잘한 점 2"],
      "suggestions": ["개선점 1", "개선점 2"]
    },
    "snack": {
      "positives": ["잘한 점 1", "잘한 점 2"],
      "suggestions": ["개선점 1", "개선점 2"]
    }
  },
  "activityFeedback": {
    "positives": ["잘한 점 1", "잘한 점 2"],
    "suggestions": ["개선점 1", "개선점 2"]
  }
}

각 식사와 운동에 대해 최소 2개 이상의 잘한 점과 개선점을 제시해주세요.
점수는 현재 기록을 기반으로 객관적으로 평가해주세요.
피드백은 구체적이고 실천 가능한 조언을 포함해주세요.`;

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.2
      }
    });

    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON 응답을 찾을 수 없습니다.');
    }
    
    const jsonStr = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('건강 기록 분석 중 오류:', error);
    throw error;
  }
}