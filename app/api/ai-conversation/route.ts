import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: '메시지가 필요합니다.' },
        { status: 400 }
      );
    }

    // AI 모델 설정
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `당신은 모두트리의 AI 어시스턴트입니다. 사이트 제작과 모두트리 서비스에 대해 안내하는 역할을 합니다.

사용자의 메시지: ${message}

주요 역할:
1. 모두트리 이벤트/서비스 설명
- AI 예술 작품: 사진을 다양한 예술 스타일로 변환
- AI 건강 기록: 식단과 운동을 분석하고 피드백
- AI 사진 투표: AI가 생성한 사진으로 재미있는 투표
- AI 사연: 사연을 분석하고 조언하는 서비스

2. 사이트 제작 가이드
- 프로필 페이지 만들기
- 다양한 템플릿 활용 방법
- 컴포넌트 추가/수정 방법
- 디자인 커스터마이징

3. 자주 묻는 질문
- 계정/로그인 관련
- 서비스 이용 방법
- 기술적 문제 해결

응답 스타일:
- 친절하고 명확하게 설명
- 구체적인 예시 제공
- 단계별 안내 (필요한 경우)
- 전문 용어는 쉽게 풀어서 설명

응답은 간단명료하게 해주세요. 모두트리 서비스와 사이트 제작 외의 질문에는 "죄송합니다. 모두트리 서비스와 사이트 제작에 대해서만 답변할 수 있습니다."라고 답변해주세요.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7
      }
    });

    const response = await result.response;
    const text = response.text();

    return NextResponse.json({
      success: true,
      response: text
    });

  } catch (error) {
    console.error('AI conversation error:', error);
    return NextResponse.json(
      { error: '대화 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}