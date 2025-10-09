import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { emotion, category, story } = await req.json();

    if (!story) {
      return NextResponse.json(
        { error: '사연이 필요합니다.' },
        { status: 400 }
      );
    }

    // AI 모델 설정
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `당신은 모두트리의 AI 어시스턴트입니다. 사용자의 사연을 분석하고 공감 투표와 컨텐츠를 추천하는 역할을 합니다.

사용자 정보:
- 감정: ${emotion} (happy: 행복, sad: 슬픔, angry: 화남, anxious: 불안, peaceful: 편안, worried: 고민)
- 카테고리: ${category} (daily: 일상, relationship: 관계, worry: 고민, comfort: 위로, etc: 기타)
- 사연: ${story}

아래 JSON 형식으로만 응답해주세요. 다른 텍스트는 포함하지 마세요.

{
  "recommendations": {
    "movie": "영화 제목",
    "movieReason": "영화를 추천하는 이유를 한 문장으로",
    "music": "노래 제목",
    "musicArtist": "아티스트 이름",
    "musicReason": "음악을 추천하는 이유를 한 문장으로",
    "book": "책 제목",
    "bookAuthor": "저자 이름",
    "bookReason": "책을 추천하는 이유를 한 문장으로",
    "message": "사연을 읽고 공감하며 위로나 응원의 한마디를 한 문장으로"
  },
  "vote": [
    {
      "text": "사연과 관련된 첫 번째 공감/의견 투표 질문",
      "options": [
        { "text": "첫 번째 선택지" },
        { "text": "두 번째 선택지" },
        { "text": "세 번째 선택지" }
      ]
    },
    {
      "text": "사연과 관련된 두 번째 공감/의견 투표 질문",
      "options": [
        { "text": "첫 번째 선택지" },
        { "text": "두 번째 선택지" },
        { "text": "세 번째 선택지" }
      ]
    }
  ]
}

중요:
1. 반드시 위 JSON 형식으로만 응답하세요.
2. 모든 필드를 반드시 포함해야 합니다.
3. JSON 형식 외의 다른 텍스트는 포함하지 마세요.
4. 각 추천 이유는 한 문장으로 작성하세요.
5. 투표 질문은 2-3개로 생성하고, 각 질문은 3-4개의 선택지를 포함하세요.`;

    let result;
    try {
      result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 2000,
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
        }
      });
    } catch (error) {
      console.error('Gemini API 호출 실패:', error);
      return NextResponse.json(
        { error: 'AI 모델 호출에 실패했습니다.' },
        { status: 500 }
      );
    }

    const response = await result.response;
    const text = response.text();
    console.log('AI 응답:', text);

    // JSON 응답 파싱
    let data;
    try {
      // 텍스트에서 불필요한 마크다운 코드 블록 제거
      const cleanText = text.replace(/```json\n|\n```|```/g, '').trim();
      
      try {
        // 먼저 전체 텍스트를 JSON으로 파싱 시도
        data = JSON.parse(cleanText);
      } catch (e) {
        // 실패하면 JSON 객체만 추출해서 시도
        const match = cleanText.match(/\{[\s\S]*\}/);
        if (!match) {
          throw new Error('AI가 올바른 JSON 형식으로 응답하지 않았습니다.');
        }
        data = JSON.parse(match[0]);
      }

      // 필수 필드 검증
      if (!data.recommendations || !data.vote) {
        throw new Error('필수 필드가 누락되었습니다.');
      }

      const required = [
        'movie', 'movieReason', 'music', 'musicArtist', 'musicReason',
        'book', 'bookAuthor', 'bookReason', 'message'
      ];

      for (const field of required) {
        if (!data.recommendations[field]) {
          throw new Error(`recommendations.${field} 필드가 누락되었습니다.`);
        }
      }

      if (!Array.isArray(data.vote) || data.vote.length < 1) {
        throw new Error('vote 필드는 배열이어야 하며 최소 1개의 질문이 필요합니다.');
      }

    } catch (error) {
      console.error('JSON 파싱 실패:', error, '\n원본 텍스트:', text);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      return NextResponse.json(
        { error: 'AI 응답을 파싱하는데 실패했습니다: ' + errorMessage },
        { status: 500 }
      );
    }
    return NextResponse.json(data);

  } catch (error) {
    console.error('AI conversation error:', error);
    return NextResponse.json(
      { error: '대화 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}