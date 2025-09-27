import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not configured');
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

interface EmotionAnalysis {
  emotion: string;  // 주요 감정 (기쁨, 슬픔, 분노, 불안, 중립 등)
  intensity: number;  // 감정 강도 (0-1)
  keywords: string[];  // 감정과 관련된 주요 키워드
  summary: string;  // 간단한 감정 분석 요약
  color: string;  // 감정을 나타내는 색상 코드
  icon: string;  // 감정을 나타내는 이모티콘
}

const systemPrompt = `당신은 심리학자이자 감정 분석 전문가입니다. 
사용자의 텍스트에서 감정을 세밀하게 분석하여 정확하고 공감적인 피드백을 제공해야 합니다.

분석 가이드라인:
1. 감정 분류 (emotion)
   - 주요 감정: 기쁨, 슬픔, 분노, 불안, 평온, 기대, 만족
   - 각 감정의 미묘한 차이를 구분 (예: 기쁨-설렘, 슬픔-그리움)
   
2. 감정 강도 (intensity)
   - 0.0-1.0 사이의 값으로 표현
   - 0.3 이하: 미약한 감정
   - 0.3-0.7: 보통 수준의 감정
   - 0.7 이상: 강한 감정

3. 키워드 추출 (keywords)
   - 감정과 직접 연관된 단어/구절 (최대 5개)
   - 문맥을 고려한 핵심 키워드
   - 사용자의 표현을 그대로 인용

4. 감정 요약 (summary)
   - 2-3문장으로 구체적 설명
   - 공감적이고 지지적인 톤
   - 감정의 원인과 맥락 포함

5. 시각적 표현
   감정별 색상과 이모지:
   - 기쁨/설렘: #FFD700 ✨
   - 만족/평온: #98FB98 😊
   - 기대/희망: #87CEEB 🌟
   - 슬픔/그리움: #4682B4 💙
   - 분노/짜증: #FF4500 😤
   - 불안/걱정: #9370DB 😰
   - 중립/평온: #808080 😌

응답 형식 (JSON):
{
  "emotion": "감정 분류",
  "intensity": 감정 강도(0.0-1.0),
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "summary": "공감적인 감정 상태 설명",
  "color": "감정 색상 코드",
  "icon": "감정 이모지"
}

주의사항:
- 문맥을 충분히 고려하여 감정을 판단할 것
- 부정적 감정도 있는 그대로 인정하고 공감할 것
- 판단이나 평가는 피하고, 이해와 지지를 표현할 것
- 응답은 반드시 지정된 JSON 형식을 따를 것`;

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    console.log('분석할 텍스트:', text);
    
    if (!text || text.trim().length < 2) {
      return NextResponse.json(
        { error: '분석할 텍스트가 너무 짧습니다.' },
        { status: 400 }
      );
    }

    if (!OPENAI_API_KEY) {
      console.error('OpenAI API 키가 설정되지 않았습니다.');
      return NextResponse.json(
        { error: 'OpenAI API 설정이 필요합니다.' },
        { status: 500 }
      );
    }

    try {
      // API 키 유효성 검사
      if (!OPENAI_API_KEY.startsWith('sk-')) {
        console.error('잘못된 OpenAI API 키 형식');
        return NextResponse.json(
          { error: 'OpenAI API 키가 올바르지 않습니다.' },
          { status: 500 }
        );
      }

      console.log('OpenAI API 호출 시작...');
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // gpt-4 대신 gpt-3.5-turbo 사용
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.3,
        max_tokens: 500
      });
    
    console.log('OpenAI 응답:', completion.choices[0].message.content);

    const response = completion.choices[0].message.content;
    if (!response) {
      console.error('AI 응답이 비어있습니다.');
      return NextResponse.json(
        { error: 'AI 응답이 비어있습니다.' },
        { status: 500 }
      );
    }

    try {
      const analysis = JSON.parse(response) as EmotionAnalysis;
      
      // 필수 필드 검증
      if (!analysis.emotion || !analysis.intensity || !analysis.keywords || 
          !analysis.summary || !analysis.color || !analysis.icon) {
        console.error('AI 응답에 필수 필드가 누락되었습니다:', analysis);
        return NextResponse.json(
          { error: 'AI 응답 형식이 올바르지 않습니다.' },
          { status: 500 }
        );
      }

      return NextResponse.json(analysis);
    } catch (parseError) {
      console.error('AI 응답 파싱 실패:', response);
      return NextResponse.json(
        { error: 'AI 응답을 파싱할 수 없습니다.' },
        { status: 500 }
      );
    }
  } catch (openaiError: any) {
    console.error('OpenAI API 호출 실패:', openaiError);
    
    // OpenAI API 에러 상세 메시지 처리
    let errorMessage = 'OpenAI API 호출에 실패했습니다.';
    if (openaiError.status === 401) {
      errorMessage = 'OpenAI API 키가 유효하지 않습니다.';
    } else if (openaiError.status === 429) {
      errorMessage = 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
    } else if (openaiError.status === 500) {
      errorMessage = 'OpenAI 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: openaiError.message || '알 수 없는 오류'
      },
      { status: openaiError.status || 500 }
    );
  }
} catch (error) {
  console.error('감정 분석 중 오류 발생:', error);
  return NextResponse.json(
    { error: '감정 분석 중 오류가 발생했습니다.' },
    { status: 500 }
  );
}
}
