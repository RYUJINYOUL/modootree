import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY!);

export async function POST(request: Request) {
  try {
    const { concept, targetAudience, resultCount, additionalInfo } = await request.json();

    if (!concept || !targetAudience || !resultCount) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
당신은 심리테스트 전문가입니다.
다음 정보를 바탕으로 흥미로운 심리테스트를 만들어주세요.
응답은 반드시 JSON 형식으로만 해주세요. 다른 설명은 일절 포함하지 마세요.

테스트 컨셉: ${concept}
대상: ${targetAudience}
원하는 결과 유형 수: ${resultCount}
추가 설명: ${additionalInfo || '없음'}

JSON 형식:
{
  "questions": [
    {
      "text": "질문 내용",
      "options": [
        {"text": "선택지 1", "score": 1},
        {"text": "선택지 2", "score": 2},
        {"text": "선택지 3", "score": 3}
      ]
    }
  ],
  "resultTypes": [
    {
      "title": "결과 유형 제목",
      "description": "결과 유형에 대한 상세 설명",
      "conditions": {"minScore": 0, "maxScore": 10}
    }
  ]
}

질문은 최소 5개에서 최대 10개 사이로 생성해주세요.
각 질문에는 3개 또는 4개의 선택지를 포함해주세요.
각 선택지에는 1에서 5 사이의 점수를 부여해주세요.
결과 유형의 conditions는 minScore와 maxScore를 포함하는 객체 형태로 해주세요.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // JSON 파싱 시도
    try {
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const jsonData = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(text);
      return NextResponse.json({ data: jsonData });
    } catch (error) {
      console.error('JSON 파싱 실패:', error);
      return NextResponse.json(
        { error: 'AI 응답을 처리하는데 실패했습니다.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: '테스트 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}