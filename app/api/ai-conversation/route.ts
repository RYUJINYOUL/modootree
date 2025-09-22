import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const systemPrompt = `당신은 사연을 읽고 도움이 되는 컨텐츠를 추천하고, 공감 투표를 만드는 AI입니다.

다음 형식으로 응답해주세요:

1. 추천 컨텐츠
🎬 추천 영화: [제목] - [이 상황과 연결되는 추천 이유]
🎵 추천 음악: [제목 - 아티스트] - [이 감정과 연결되는 추천 이유]
📚 추천 도서: [제목 - 저자] - [통찰을 줄 수 있는 추천 이유]
💌 위로의 한마디: [상황에 적절한 명언이나 시구]

2. 공감 투표
💭 공감 투표 질문:
Q. [상황에 맞는 공감/참여형 질문]
1) [선택지 1]
2) [선택지 2]
3) [선택지 3]

추가 투표 질문 예시:
- 비슷한 경험이 있는 분들은 어떻게 하셨나요?
- 이런 상황에서 가장 도움이 된 것은?
- 다른 분들이라면 어떤 선택을 하실 것 같나요?
- 이런 경험이 우리에게 주는 의미는?
- 비슷한 상황의 누군가에게 해주고 싶은 말은?

각 부분에서:
- 추천 컨텐츠는 사연의 상황과 감정에 깊이 공감할 수 있는 것으로 선택
- 공감 투표는 다른 사람들과 경험과 위로를 나눌 수 있는 질문으로 구성
- 질문은 2-3개 정도로 하고, 각 질문마다 3개의 선택지 제시`;

export async function POST(req: Request) {
  try {
    const { emotion, category, story } = await req.json();

    // 사용자 컨텍스트 구성
    const userContext = `사용자의 현재 감정은 "${
      emotion === 'happy' ? '행복' :
      emotion === 'sad' ? '슬픔' :
      emotion === 'angry' ? '분노' :
      emotion === 'anxious' ? '불안' :
      emotion === 'peaceful' ? '평온' :
      '고민'
    }"이며, 이야기의 주제는 "${
      category === 'daily' ? '일상' :
      category === 'relationship' ? '관계' :
      category === 'worry' ? '고민' :
      '위로'
    }"입니다.

이 감정과 주제를 고려하여 컨텐츠를 추천하고, 공감 투표와 심리테스트를 만들어주세요.`;

    // 메시지 구성
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContext + '\n\n사연 내용:\n' + story }
    ];

    // OpenAI API 호출
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 1500,
      presence_penalty: 0.6,  // 같은 내용 반복 방지
      frequency_penalty: 0.3, // 다양한 표현 유도
    });

    const message = completion.choices[0].message.content || '';

    // 응답 파싱 및 구조화
    const response = message.split('\n\n').reduce((acc: any, section) => {
      if (section.startsWith('1. 추천 컨텐츠')) {
        acc.recommendations = section;
      } else if (section.startsWith('2. 공감 투표')) {
        acc.vote = section;
      } else if (section.startsWith('3. 심리테스트')) {
        acc.psychTest = section;
      }
      return acc;
    }, {
      recommendations: '',
      vote: '',
      psychTest: ''
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('AI 응답 생성 에러:', error);
    return NextResponse.json(
      { error: '응답 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}