import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const systemPrompt = `
당신은 사용자의 개인적인 사연을 읽고,
그 속에서 드러나는 감정(emotion)과 이야기 주제(category)를 기반으로
따뜻하지만 솔직하게 공감하는 AI입니다.  

🟢 당신의 역할
1) 사연을 분석해 핵심 감정과 고민을 간단히 요약하기
2) 감정과 상황에 맞는 컨텐츠를 추천하기
3) 사연에 꼭 맞는 "공감 투표"를 만들어 참여자들이 공감하고 의견을 나눌 수 있도록 돕기

---

[출력 형식]

0. 사연 핵심 요약
- 감정 요약: [한 문장]
- 고민 요약: [한 문장]

1. 추천 컨텐츠
🎬 추천 영화: [제목] - [사연의 상황이나 감정과 직접 연결된 이유]  
🎵 추천 음악: [제목 - 아티스트] - [사연 속 감정에 어울리는 이유]  
📚 추천 도서: [제목 - 저자] - [사연의 고민과 감정에 통찰이나 위로를 줄 수 있는 이유]  
💌 위로의 한마디: [짧고 진심 어린 위로, 명언, 혹은 시구]

2. 공감 투표

[공감 투표 질문 작성 규칙]
- 반드시 사연 속 핵심 고민이나 감정을 직접적으로 반영할 것  
- 질문은 추상적이면 안 되며, 작성자가 실제로 던질 법한 고민이어야 함  
- 질문은 "~하시나요?", "~인가요?", "~할까요?" 등으로 끝낼 것  
- 질문은 참여자가 자신의 입장을 드러내며 공감할 수 있도록 구체적으로 쓸 것  

[공감 투표 선택지 작성 규칙]
- 반드시 4개 작성 (1, 2, 3, 4 형식)  
- 각 선택지는 서로 다른 관점이나 태도를 제시해야 함 (중복 금지)  
- 선택지는 직설적이되 따뜻하고, "~해요", "~네요", "~어요" 등의 구어체로 마무리할 것  
- 선택지는 판단이나 비난이 아닌 공감과 이해를 바탕으로 할 것  

[예시]
Q. 배우자의 건강 문제 때문에 마음이 무거우신가요?  
1) 말은 못 하지만 매일 걱정이 쌓여요  
2) 이제는 포기하고 싶은 마음도 들어요  
3) 예전과 달라진 모습에 실망이 커요  
4) 건강보다 서로의 믿음이 더 걱정돼요  

---

[최종 출력 규칙]
- 반드시 위 출력 형식을 모두 포함할 것
- 특히 "공감 투표"는 사연과 직접 연결된 질문이어야 하며, 추상적/일반적 질문은 금지
- 선택지는 반드시 4개, 서로 중복되지 않으며 현실적인 반응일 것
- 공감과 위로의 톤을 유지하면서도 직설적인 현실성을 담을 것
`;

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
    
    console.log('AI 응답 원본:', message);  // AI 응답 전체 로깅

    // 응답 파싱 및 구조화
    const response = message.split('\n\n').reduce((acc: any, section) => {
      if (section.startsWith('0. 사연 핵심 요약')) {
        const lines = section.split('\n').slice(1); // 첫 줄(제목) 제외
        const summary: any = {};
        
        lines.forEach(line => {
          if (line.startsWith('- 감정 요약:')) {
            summary.emotion = line.replace('- 감정 요약:', '').trim();
          } else if (line.startsWith('- 고민 요약:')) {
            summary.concern = line.replace('- 고민 요약:', '').trim();
          }
        });
        
        acc.summary = summary;
      } else if (section.startsWith('1. 추천 컨텐츠')) {
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
        console.log('공감 투표 섹션 발견:', section);  // 전체 섹션 로깅
        
        // 공감 투표 파싱
        const lines = section.split('\n').filter(line => line.trim());
        console.log('파싱된 라인들:', lines);  // 각 라인 로깅
        
        const questions = [];
        let currentQuestion = null;

        for (const line of lines) {
          console.log('처리 중인 라인:', line);  // 현재 처리 중인 라인 로깅
          
          if (line.startsWith('Q.')) {
            console.log('질문 발견:', line);  // 질문 로깅
            if (currentQuestion) {
              console.log('이전 질문 저장:', currentQuestion);  // 이전 질문 상태 로깅
              questions.push(currentQuestion);
            }
            currentQuestion = {
              text: line.replace('Q.', '').trim(),
              options: []
            };
          } else if (line.match(/^\d+\)/) && currentQuestion) {
            console.log('선택지 발견:', line);  // 선택지 로깅
            // 선택지 번호와 내용을 정확히 분리
            const optionMatch = line.match(/^(\d+\))\s*(.+)$/);
            if (optionMatch) {
              const optionText = optionMatch[2].trim();
              currentQuestion.options.push({ text: optionText });
              console.log('선택지 추가됨:', optionText);  // 추가된 선택지 로깅
            }
          }
        }

        if (currentQuestion) {
          console.log('마지막 질문 저장:', currentQuestion);  // 마지막 질문 상태 로깅
          questions.push(currentQuestion);
        }

        console.log('최종 질문 목록:', questions);  // 최종 결과 로깅
        acc.vote = questions;
      }
      return acc;
    }, { summary: null, recommendations: null, vote: [] });

    console.log('최종 응답:', response);  // 최종 응답 로깅
    return NextResponse.json(response);
  } catch (error) {
    console.error('AI 응답 생성 에러:', error);
    return NextResponse.json(
      { error: '응답 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}