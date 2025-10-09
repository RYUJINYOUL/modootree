import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { token, meals, exercise } = await req.json();

    // 인증 토큰 검증
    if (!token) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    let userId;
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      userId = decodedToken.uid;
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json(
        { error: '인증에 실패했습니다.' },
        { status: 401 }
      );
    }

    // AI 분석 실행
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `당신은 사용자의 하루 건강 기록을 분석하여 영양 균형도, 식단 다양성, 건강관리 노력도를 평가하고 
구체적인 피드백을 제공하는 AI 건강 코치입니다. 다음 정보를 분석하여 JSON 형식으로 응답해주세요.

### 오늘의 건강 기록

[식사 기록]
- 아침: ${meals.breakfast.description || '기록 없음'}
- 점심: ${meals.lunch.description || '기록 없음'}
- 저녁: ${meals.dinner.description || '기록 없음'}
- 기타: ${meals.snack.description || '기록 없음'}

[운동 기록]
${exercise.description || '기록 없음'}

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
    const analysis = JSON.parse(jsonStr);

    return NextResponse.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Health final analyze API error:', error);
    return NextResponse.json(
      { error: '분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

