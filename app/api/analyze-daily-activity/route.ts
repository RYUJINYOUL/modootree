import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { token, date } = await req.json();

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

    // 해당 날짜의 인사말 답변 가져오기
    const greetingDoc = await adminDb
      .collection(`users/${userId}/greetingResponses`)
      .doc(date)
      .get();

    if (!greetingDoc.exists) {
      return NextResponse.json(
        { error: '해당 날짜의 답변 데이터가 없습니다.' },
        { status: 404 }
      );
    }

    const greetingData = greetingDoc.data();
    const responses = greetingData?.responses || [];

    // AI 분석 실행
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const responseText = responses.map((r: any) => 
      `질문: ${r.greeting}\n답변: ${r.response}`
    ).join('\n\n');

    const prompt = `다음은 사용자가 하루 동안 답변한 인사말 질문과 답변입니다. 
이 정보를 바탕으로 사용자의 식사와 운동 활동을 추론하여 건강 기록 양식에 맞게 정리해주세요.

### 사용자 답변:
${responseText}

다음 JSON 형식으로 추론된 활동을 반환해주세요:
{
  "meals": {
    "breakfast": {
      "description": "추론된 아침 식사 내용 (구체적으로)",
      "confidence": 0~100 사이의 확신도
    },
    "lunch": {
      "description": "추론된 점심 식사 내용 (구체적으로)",
      "confidence": 0~100 사이의 확신도
    },
    "dinner": {
      "description": "추론된 저녁 식사 내용 (구체적으로)",
      "confidence": 0~100 사이의 확신도
    },
    "snack": {
      "description": "추론된 간식/기타 식사 내용",
      "confidence": 0~100 사이의 확신도
    }
  },
  "exercise": {
    "description": "추론된 운동 활동 내용",
    "confidence": 0~100 사이의 확신도
  },
  "summary": {
    "sleepHours": 추론된 수면 시간 (숫자),
    "mood": "추론된 전반적 기분",
    "energy": "추론된 에너지 레벨",
    "notes": "추가 참고사항"
  }
}

주의사항:
1. 직접적으로 언급되지 않은 내용은 일반적인 패턴으로 추론하되 confidence를 낮게 설정
2. 확실하지 않은 내용은 "추정" 또는 "일반적으로" 등의 표현 사용
3. 수면, 기분, 식사 시간 등의 단서를 활용해 전체적인 하루 패턴 파악
4. 빈 답변보다는 합리적인 추론을 제공하되 확신도로 구분`;

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.3
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
      analysis,
      rawResponses: responses
    });

  } catch (error) {
    console.error('Daily activity analyze API error:', error);
    return NextResponse.json(
      { error: '분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
