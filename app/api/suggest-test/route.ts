import { NextResponse } from 'next/server';
import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateText(promptText: string) {
  try {
    console.log('Sending prompt to OpenAI:', promptText);

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "당신은 심리테스트 전문가입니다. 사용자의 요청에 따라 JSON 형식으로만 응답해주세요."
        },
        {
          role: "user",
          content: promptText
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 0.95,
    });

    console.log('OpenAI response:', completion);

    const text = completion.choices[0]?.message?.content;
    if (!text) {
      throw new Error('AI가 응답을 생성하지 못했습니다.');
    }

    return text;
  } catch (error) {
    console.error('AI 모델 호출 실패:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    console.log('API 호출 시작');
    const { story } = await request.json();
    console.log('받은 사연:', story);

    if (!story) {
      console.log('사연 누락');
      return NextResponse.json(
        { error: '사연을 입력해주세요.' },
        { status: 400 }
      );
    }

    const prompt = `
사용자의 사연을 바탕으로 흥미로운 심리테스트를 제안해주세요.
응답은 반드시 아래 JSON 형식으로만 해주세요. 다른 설명은 일절 포함하지 마세요.

사용자 사연:
${story}

응답 형식:
{
  "title": "테스트 제목 (짧고 흥미로운 제목)",
  "description": "테스트 설명 (2-3문장으로 테스트의 목적과 특징 설명)",
  "concept": "테스트 컨셉 (AI가 질문을 생성할 때 참고할 구체적인 방향성)",
  "targetAudience": "주요 대상층",
  "questions": [
    {
      "text": "질문 내용",
      "options": [
        {
          "text": "선택지 1",
          "score": 1
        },
        {
          "text": "선택지 2",
          "score": 2
        },
        {
          "text": "선택지 3",
          "score": 3
        }
      ]
    }
  ],
  "resultTypes": [
    {
      "title": "결과 유형 제목",
      "description": "결과 유형에 대한 설명",
      "minScore": 0,
      "maxScore": 10
    }
  ],
  "additionalSuggestions": "테스트 제작 시 고려할만한 추가 제안사항"
}

제목은 호기심을 자극하고 공유하고 싶은 문구로 작성해주세요.
설명은 검색엔진 최적화(SEO)를 고려하여 작성해주세요.
컨셉은 구체적이고 실행 가능한 내용으로 작성해주세요.
`;

    console.log('AI 모델 호출 시작');
    try {
      const text = await generateText(prompt);
      console.log('AI 응답:', text);
      
      if (!text) {
        throw new Error('AI가 빈 응답을 반환했습니다.');
      }

      // JSON 파싱 시도
      try {
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
        const jsonData = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(text);
        return NextResponse.json({ data: jsonData });
      } catch (parseError) {
        console.error('JSON 파싱 실패:', parseError);
        return NextResponse.json(
          { error: 'AI 응답을 처리하는데 실패했습니다.' },
          { status: 500 }
        );
      }
    } catch (aiError) {
      console.error('AI 모델 호출 실패:', aiError);
      throw aiError;
    }
  } catch (error) {
    console.error('API Error:', error);
    // 더 자세한 에러 정보 로깅
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { 
        error: '테스트 제안에 실패했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}