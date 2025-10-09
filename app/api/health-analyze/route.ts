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

    const prompt = `사용자의 식사와 운동 기록을 분석하여 각각의 주요 내용을 정리해주세요.

[입력 내용]
${meals.breakfast.description.trim() && `아침: ${meals.breakfast.description}`}
${meals.lunch.description.trim() && `점심: ${meals.lunch.description}`}
${meals.dinner.description.trim() && `저녁: ${meals.dinner.description}`}
${meals.snack.description.trim() && `기타: ${meals.snack.description}`}
${exercise.description.trim() && `운동: ${exercise.description}`}

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
    console.error('Health analyze API error:', error);
    return NextResponse.json(
      { error: '분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
