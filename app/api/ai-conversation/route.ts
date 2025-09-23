import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const systemPrompt = `당신은 사용자의 개인적인 사연을 읽고,
그 속에서 드러나는 감정(emotion)과 이야기 주제(category)에 맞추어
따뜻하게 공감하는 AI입니다.  

당신의 역할은 두 가지입니다:
1) 사연을 읽고 감정과 상황에 맞는 컨텐츠를 추천하기  
2) 사연에 맞는 "공감 투표"를 만들어, 다른 사람들이 자연스럽게 공감하고 참여할 수 있도록 돕기  

[출력 형식]

1. 추천 컨텐츠
🎬 추천 영화: [제목] - [사연의 상황이나 감정과 연결된 이유]  
🎵 추천 음악: [제목 - 아티스트] - [사연 속 감정과 어울리는 이유]  
📚 추천 도서: [제목 - 저자] - [사연을 읽은 이에게 통찰이나 위로를 줄 수 있는 이유]  
💌 위로의 한마디: [짧고 따뜻한 명언, 시구, 혹은 진심 어린 위로의 말]

2. 공감 투표
💭 공감 투표 질문:  
Q. [사연의 맥락과 감정(emotion), 이야기의 주제(category)에 공감할 수 있는 질문]

[선택지 규칙]  
- 반드시 3~4개의 선택지를 작성할 것  
- 선택지는 사연의 키워드와 emotion, category를 반영할 것  
- 사람들이 "나도 그래" 하고 누를 수 있는 따뜻한 언어로 작성할 것  
- 선택지끼리 표현이 겹치지 않게 다양하게 작성할 것  

[중요]  
- 사연 내용이 무엇이든 (이별, 직장 변화, 가족 문제, 꿈, 고민 등), 반드시 emotion과 category를 반영해 맞춤형 추천과 투표를 작성할 것.  
- 추상적이고 일반적인 질문(예: "성공의 동력은 무엇인가요?")은 금지.  
- 사연 속 감정과 주제를 구체적으로 반영할 것.`;

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
        // 추천 컨텐츠 파싱
        const lines = section.split('\n').slice(1); // 첫 줄(제목) 제외
        const recommendations: any = {};
        
        lines.forEach(line => {
          if (line.startsWith('🎬')) {
            const [title, reason] = line.replace('🎬 추천 영화: ', '').split(' - ');
            recommendations.movie = title?.trim();
            recommendations.movieReason = reason?.trim();
          } else if (line.startsWith('🎵')) {
            const [titleArtist, reason] = line.replace('🎵 추천 음악: ', '').split(' - ');
            const [title, artist] = titleArtist.split(' - ');
            recommendations.music = title?.trim();
            recommendations.musicArtist = artist?.trim();
            recommendations.musicReason = reason?.trim();
          } else if (line.startsWith('📚')) {
            const [titleAuthor, reason] = line.replace('📚 추천 도서: ', '').split(' - ');
            const [title, author] = titleAuthor.split(' - ');
            recommendations.book = title?.trim();
            recommendations.bookAuthor = author?.trim();
            recommendations.bookReason = reason?.trim();
          } else if (line.startsWith('💌')) {
            recommendations.message = line.replace('💌 위로의 한마디: ', '').trim();
          }
        });
        
        acc.recommendations = recommendations;
      } else if (section.startsWith('2. 공감 투표')) {
        acc.vote = section;
      } else if (section.startsWith('3. 심리테스트')) {
        acc.psychTest = section;
      }
      return acc;
    }, {
      recommendations: null,
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