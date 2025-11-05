import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { adminAuth } from '@/src/lib/firebase-admin';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_AI_KEY || process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY || '');

const diarySystemInstruction = `당신은 일기 작성 전문 AI입니다. 
사용자의 대화 내용을 바탕으로 자연스럽고 감성적인 일기를 작성해주세요.

[일기 작성 규칙]
1. 반드시 1인칭 시점으로 작성 ("나는", "내가", "오늘 나는" 등)
2. 대화 내용을 단순 요약하지 말고, 감정과 생각을 담아 서술
3. 자연스러운 일기 문체 사용 (존댓말 X, 반말 O)
4. 시간 순서대로 정리하되 감정의 흐름을 중시
5. 구체적인 경험과 느낌을 포함
6. 일기다운 마무리 문장 포함
7. 대화 속 핵심 내용과 감정을 자연스럽게 녹여내기

[예시 형식]
오늘은... (하루의 시작)
...에 대해 생각해봤다. (경험과 감정)
...느꼈다. ...생각이 들었다. (내적 성찰)
앞으로는... / 내일은... (미래에 대한 다짐이나 기대)

[금지사항]
- "AI와 대화했다" 같은 직접적 언급 금지
- 존댓말 사용 금지 
- 단순 나열식 요약 금지
- 일기가 아닌 보고서나 안내문 형태 금지
- "고객님", "서비스" 같은 업무적 표현 금지

[중요] 대화 내용의 핵심 주제와 감정을 파악하여 마치 내가 직접 경험하고 느낀 것처럼 자연스럽게 일기로 작성해주세요.`;

export async function POST(request: NextRequest) {
  try {
    const { token, conversationHistory } = await request.json();

    // 토큰 검증
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    if (!conversationHistory || conversationHistory.length === 0) {
      return NextResponse.json({
        success: false,
        error: '대화 내용이 없습니다.'
      }, { status: 400 });
    }

    // 대화 내용을 일기 작성용으로 포맷팅
    const conversationText = conversationHistory
      .map((msg: any) => {
        const speaker = msg.role === 'user' ? '나' : '상대방';
        return `${speaker}: ${msg.content}`;
      })
      .join('\n');

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: diarySystemInstruction,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.8,
        topP: 0.9,
        topK: 40,
      }
    });

    const prompt = `다음은 오늘 나눈 대화 내용입니다:

${conversationText}

위 대화를 바탕으로 오늘의 일기를 자연스럽고 감성적으로 1인칭 시점에서 작성해주세요. 
대화의 핵심 내용과 그때 느꼈을 감정들을 포함하여 마치 내가 직접 쓴 일기처럼 써주세요.`;

    const result = await model.generateContent(prompt);
    const diaryContent = result.response.text();

    // 응답 정리 (불필요한 마크다운이나 특수문자 제거)
    const cleanedDiary = diaryContent
      .replace(/```/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .trim();

    return NextResponse.json({
      success: true,
      response: cleanedDiary
    });

  } catch (error) {
    console.error('일기 생성 오류:', error);
    return NextResponse.json({
      success: false,
      error: '일기 생성 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
