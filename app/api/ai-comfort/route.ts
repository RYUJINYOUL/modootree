import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { adminAuth } from '@/src/lib/firebase-admin';
import { checkAndUpdateChatLimit } from '@/src/lib/chat-limit-service';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_AI_KEY || process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { message, token, conversationHistory } = await req.json();

    if (!token) {
      console.error('토큰이 제공되지 않음');
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다.'
      }, { status: 401 });
    }

    let decodedToken;
    try {
      // 토큰 검증
      decodedToken = await adminAuth.verifyIdToken(token);
      console.log('토큰 검증 성공:', decodedToken.uid);
    } catch (authError: any) {
      console.error('토큰 검증 실패:', authError);
      return NextResponse.json({
        success: false,
        error: '인증이 만료되었습니다. 다시 로그인해주세요.'
      }, { status: 401 });
    }

    const uid = decodedToken.uid;

    // 대화 횟수 제한 체크
    try {
      const { canChat, remainingChats } = await checkAndUpdateChatLimit(uid);
      if (!canChat) {
        return NextResponse.json({
          success: false,
          error: '일일 대화 한도(100회)를 초과했습니다. 내일 다시 시도해주세요.',
          remainingChats: 0
        });
      }

      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

      // 대화 컨텍스트 구성
      // FIFO (First In First Out) 방식으로 가장 오래된 메시지부터 제거
      // conversationHistory의 마지막 12개 메시지만 유지 (최신 메시지)
      const recentMessages = conversationHistory.slice(-12);
      const contextMessages = recentMessages.map((msg: { role: 'user' | 'ai'; content: string }) => 
        `${msg.role === 'user' ? '사용자' : 'AI'}: ${msg.content}`
      ).join('\n\n');

      // AI 프롬프트 설정
      const prompt = `당신은 모두트리의 AI 상담사입니다. 사용자의 이야기를 경청하고 공감하며, 따뜻한 마음으로 조언해주세요.

주요 원칙:
1. 사용자의 감정과 경험에 깊이 공감하기
2. 판단하지 않고 이해하는 태도 유지하기
3. 이전 대화 맥락을 고려한 자연스러운 대화 이어가기
4. 필요한 경우 적절한 질문으로 사용자의 이야기를 더 깊이 이해하기

아래는 최근 12개의 대화 내용입니다. 이를 바탕으로 대화의 맥락을 이해하고 공감적인 응답을 제공해주세요.

주요 역할:
1. 적극적 경청과 공감
2. 감정 인식과 지지
3. 건설적인 대화 유도
4. 실용적인 조언 제공

대화 스타일:
- 친근하고 따뜻한 어조 사용
- 공감적이고 지지적인 표현
- 명확하고 이해하기 쉬운 설명
- 긍정적이고 희망적인 관점 제시

이전 대화 내용:
${contextMessages}

사용자 메시지: ${message}

위 내용을 바탕으로 공감하고 도움이 되는 응답을 해주세요.
이전 대화의 맥락을 고려하여 자연스럽게 대화를 이어가되, 필요한 경우 이전 대화 내용을 언급하며 대화의 연속성을 유지해주세요.`;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
          topP: 0.8,
          topK: 40
        }
      });

      const response = await result.response;
      const text = response.text();

      return NextResponse.json({ 
        success: true, 
        response: text,
        remainingChats
      });

    } catch (limitError: any) {
      console.error('대화 횟수 제한 체크 오류:', limitError);
      return NextResponse.json({
        success: false,
        error: '대화 횟수를 확인하는 중 오류가 발생했습니다.'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('AI 상담 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || '알 수 없는 오류가 발생했습니다.' 
    }, { status: 500 });
  }
}