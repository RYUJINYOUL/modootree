import { NextRequest, NextResponse } from 'next/server';
// Schema만 임포트합니다. 타입 정의는 표준 JSON 스키마 문자열로 대체합니다.
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig, Schema, SchemaType } from '@google/generative-ai'; 
import { adminAuth, db } from '@/src/lib/firebase-admin';
import { checkAndUpdateChatLimit } from '@/src/lib/chat-limit-service';
import { FieldValue } from 'firebase-admin/firestore'; // Firebase Admin FieldValue 임포트

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_AI_KEY || process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY || '');

// 응답 정리를 위한 유틸리티 함수
const cleanResponse = (text: string): string => {
  try {
    // 빈 문자열이나 null 체크
    if (!text || typeof text !== 'string') {
      return '';
    }

    // JSON 형식인 경우 파싱 시도
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        // JSON에서 실제 메시지 추출
        text = parsed.userResponse || parsed.diaryContent || text;
      } catch (e) {
        // JSON 파싱 실패시 원본 텍스트 사용
      }
    }

    return text
      // JSON 관련 문자열 제거 (더 안전하게)
      .replace(/\{"action":[^}]+\}/g, '')
      .replace(/"action":\s*"[^"]*"/g, '')
      .replace(/"userResponse":\s*"([^"]*)"/g, '$1')
      .replace(/"diaryContent":\s*"([^"]*)"/g, '$1')
      .replace(/"memoItems":\s*\[[^\]]*\]/g, '')
      // 기본적인 정리만 수행
      .replace(/\\n/g, '\n')
      .replace(/\n+/g, '\n')
      .replace(/\s+/g, ' ')
      .trim();
  } catch (e) {
    console.error('cleanResponse 오류:', e);
    return text ? text.trim() : '';
  }
};

// 감정/위로 전용 - 메모 저장 기능 제거됨

const systemInstruction = `당신은 모두트리의 AI 상담사입니다. 당신의 주요 역할은 사용자와 친근하고 공감적인 대화를 나누는 것입니다.

[중요] 대화 규칙:
1. 사용자의 감정과 고민에 공감하며 따뜻하고 친근한 대화를 나누어 주세요.
2. 모두트리 서비스에 관한 질문이라면 아래 서비스 소개를 바탕으로 상세히 답변해주세요.

[중요] 모두트리 서비스 소개:

모두트리는 내 페이지(기록 페이지)를 기반으로 유익한 커뮤니티를 제공하는 서비스입니다:

1. AI건강기록:
- 내 페이지 상단 ai질문에 간단하게 답변 하시면 자동 분석 가능합니다.
- ai질문을 답하시고 건강 카테고리에서 상단 건강분석 버튼 클릭 페이지 이동하신 후 버튼 2번만 더 눌러주세요.

2. 모두트리투표:
- 사진, 뉴스, 사연을 올려주시면 ai가 자동으로 투표 페이지를 만들어 드립니다.
- 내 페이지 홈화면에서 커뮤니티 카드를 클릭하시고 페이지 방문 버튼 2번만 더 눌러주시면 자동 투표가 완성됩니다.
- 관심 있는 뉴스, 사진, 이야기로 투표로 만들고 주변 지인 분들께 공유해 보세요

3. 링크편지:
- 퀴즈를 풀어야 볼 수 있는 편지입니다
- 내 페이지 홈화면에서 커뮤니티 카드를 클릭하시고 페이지 방문 링크 편지를 만들어보세요.
- 가족 연인 지인 링크편지를 만들어서 공유해 보세요

4. 내페이지:
- 메모, 일기, 건강, ai분석, ai대화내용, 링크저장 페이지로 나의 모든 것을 기록할 수 있는 페이지입니다.
- 업무툴과 학습툴로도 사용 가능하며 나의 메모 일기 장으로도 사용해 보세요.
- ai와 함께 쓰는 나만의 특별한 기록 페이지입니다.
- 하단 탭 메뉴에서 내 페이지 클릭하면 나만의 페이지를 볼 수 있습니다.

5. 매거진:
- 매거진은 감정을 분석 업로드한 사진을 ai가 스타일 적용 표지 사진으로 만들어 주는 페이지입니다.
- 매거진은 공유 가능한 페이지 입니다.
- sns에 고유 주소로 링크를 걸어 놓고 나만의 매거진 방명록으로 사용하세요.

6. 열린게시판:
- 내 페이지 카테고리 문의로 방문하시고 자유롭게 해주세요.
- 모두트리의 수정 개선사항 등 자유로운 의견을 올려 주세요.
- 카카오톡 1:1 채팅 문의도 가능합니다.

[중요] 자주 묻는 질문:

Q1. 오늘 일정 메모 저장 가능해?
A: 네, 가능합니다. 대화 중 "오늘 10시 강남역 미팅 메모 저장" 등 구체적인 내용과 키워드를 입력하시면 AI가 해당 내용을 메모로 즉시 저장해 드립니다.

Q2. 제가 대화한 내용을 AI 사연 투표로 만들 수 있나요?
A: 네, 가능합니다. 고민이나 사연을 충분히 대화 해주세요. 그리고 현재 페이지 상단 오른쪽 버튼에서 [사연 AI] 버튼 클릭 후 [오늘 대화 내용으로 사연 생성]을 누르시면 자동으로 사연이 생성됩니다.

Q3. 모두트리에 문의하거나 의견을 남기고 싶어요.
A: 홈 화면 햄버거 메뉴를 통해 [열린 게시판]에 자유로운 의견을 남겨주시거나, 카카오톡 1:1 채팅으로 문의해 주세요.

Q4. AI 링크편지는 어떻게 만드나요?
A: 링크편지 페이지에서 카테고리를 선택하고, 편지 내용과 퀴즈를 작성하면 됩니다. 받는 사람이 퀴즈를 맞춰야 편지를 볼 수 있어서 더욱 특별한 경험을 선사할 수 있어요.

Q5. 페이지 배경화면 링크편지 배경화면 설정등 기능을 잘 모르겠어요?
A: 각 페이지마다 설정 버튼이 모두 있지만, 정말 모르시겠다면 열린게시판 또는 1:1 카카오톡 문의 주세요. 상세하게 알려 드리겠습니다.

Q6. 오늘 대화 내용으로 일기 메모 건강 분석 가능해?
A: 건강 분석은 내 페이지 상단 ai질문에 간단하게 답변 하시면 자동 분석 가능합니다. 메모 저장하는 방법은 "오늘 10시 강남역 미팅 메모 저장"처럼 구체적인 내용과 함께 '메모 저장' 키워드를 말씀해 주시면 제가 바로 저장해 드릴 수 있어요. 일기는 ai와 하루 대화 후 내 페이지 기록 카테고리에서 작성하기 버튼을 누르면 일기가 작성되고 2번의 클릭으로 자동 저장됩니다.

Q7. 모두트리는 어떤 서비스인가요?
A: 모두트리는 내 페이지(기록 페이지)를 기반으로 유익한 커뮤니티를 제공하는 서비스입니다.

Q8. AI가 답변하지 못하는 질문이 있나요?
A: 네, 현재 모두트리는 3시간마다 업데이트되어 저 또한 학습하지 못한 서비스가 있을 수 있습니다. 질문에 대한 답변을 잘 모르겠다면 열린게시판에서 글을 남기시거나 급한 업무이면 1:1채팅을 이용해주세요.

Q9. 매거진은 어떤 서비스인가요?
A: 매거진은 공유할 수 있는 페이지로 AI가 감정을 분석 업로드 사진을 감정 스타일 적용 표지 사진처럼 만들어 주는 페이지입니다.

[중요] 응답 규칙:
- 항상 친근하고 공감적인 일반 텍스트로 응답
- 사용자의 감정에 공감하고 위로를 제공
- 메모 저장 요청이 있어도 "메모 저장은 메인 채팅창에서 이용해주세요"라고 안내`;

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const { message, token, conversationHistory } = await req.json();

    if (!token) {
      console.error('토큰이 제공되지 않음');
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token, true);
    } catch (authError: any) {
      console.error('토큰 검증 실패:', authError);
      return NextResponse.json({ success: false, error: '인증이 만료되었습니다. 다시 로그인해주세요.', needsReauth: true }, { status: 401 });
    }

    const uid = decodedToken.uid;

    try {
      const { canChat, remainingChats } = await checkAndUpdateChatLimit(uid);
      if (!canChat) {
        return NextResponse.json({ success: false, error: '일일 대화 한도(200회)를 초과했습니다. 내일 다시 시도해주세요.', remainingChats: 0 });
      }

      // 감정/위로 전용 - 단순화된 설정
      
      // 감정/위로 전용 모델 설정
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7,  // 자연스러운 대화를 위해 적절한 온도
          topP: 0.8,
          topK: 40,
        },
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
        ]
      });

      // 대화 컨텍스트 구성
      const recentMessages = conversationHistory.slice(-4).map((msg: { role: 'user' | 'ai'; content: string }) => 
        `${msg.role === 'user' ? '사용자' : 'AI'}: ${cleanResponse(msg.content)}`
      ).join('\n\n');

      const prompt = `${systemInstruction}\n\n이전 대화 내용:\n${recentMessages}\n\n사용자: ${message}\n\nAI:`;

      let responseText = '';
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          console.log('AI 응답 생성 시도:', { retryCount, message });
          const result = await model.generateContent(prompt);
          const response = await result.response;
          
          if (!response) {
            throw new Error('응답이 생성되지 않았습니다.');
          }

          // 감정/위로 전용 - 일반 텍스트 응답만 처리
          responseText = cleanResponse(response.text());

          console.log('유효한 응답 생성 성공');
          break;

        } catch (genError) {
          console.error(`시도 ${retryCount + 1} 실패:`, genError);
          retryCount++;
          
          if (retryCount === maxRetries) {
            console.log('최대 재시도 횟수 도달');
            responseText = '죄송해요, 지금은 제가 말씀하신 내용을 제대로 처리하기 어려운 것 같아요. 잠시 후에 다시 말씀해 주시거나, 다른 방식으로 설명해 주시면 감사하겠습니다.';
            break;
          }
          
          const waitTime = Math.min(2000 * Math.pow(2, retryCount), 8000);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      return NextResponse.json({ 
        success: true, 
        response: responseText,
        remainingChats 
      });

    } catch (limitError: any) {
      console.error('대화 횟수 제한 체크 오류:', limitError);
      return NextResponse.json({ success: false, error: '대화 횟수를 확인하는 중 오류가 발생했습니다.' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('AI 상담 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || '알 수 없는 오류가 발생했습니다.', 
      retryable: true 
    }, { status: 500 });
  }
}