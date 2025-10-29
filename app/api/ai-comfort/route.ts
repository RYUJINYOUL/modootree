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
      // JSON 관련 문자열 제거
      .replace(/\{"action":[^}]+\}/g, '')
      .replace(/"action":\s*"[^"]*"/g, '')
      .replace(/"userResponse":\s*"([^"]*)"/g, '$1')
      .replace(/"diaryContent":\s*"([^"]*)"/g, '$1')
      .replace(/"memoItems":\s*\[[^\]]*\]/g, '')
      // JSON 구조 제거
      .replace(/[{}\[\]"\\]/g, '')
      // 특수 문자 및 포맷팅 정리
      .replace(/\s*:\s*/g, ' ')
      .replace(/\\n/g, '\n')
      .replace(/\n+/g, '\n')
      .replace(/\s+/g, ' ')
      .trim();
  } catch (e) {
    return text.trim();
  }
};

// AI Agent가 반환해야 할 새로운 JSON 스키마 정의 (다중 메모 처리)
const AgentSchema: Schema = {
  // 표준 JSON 스키마 타입 문자열 사용
  type: SchemaType.OBJECT,
  properties: {
    action: {
      // 표준 JSON 스키마 타입 문자열 사용
      type: SchemaType.STRING,
      description: "사용자가 요청한 행동 (SAVE_MEMO, SAVE_DIARY 또는 NONE 중 하나)",
    },
    userResponse: {
      type: SchemaType.STRING,
      description: "저장 완료 후 사용자에게 보여줄 친근하고 공감적인 응답 메시지. (예: '네, 대화 내용이 일기로 저장되었어요!😊')",
    },
    // SAVE_MEMO 액션일 때 사용될 메모 항목의 배열
    memoItems: {
      // 표준 JSON 스키마 타입 문자열 사용
      type: SchemaType.ARRAY,
      description: "SAVE_MEMO 액션일 때 사용. 사용자 요청에서 추출된 하나 이상의 개별 메모 항목 리스트. 액션이 SAVE_MEMO가 아니면 비어있는 배열이어야 합니다.",
      items: {
        // 표준 JSON 스키마 타입 문자열 사용
        type: SchemaType.OBJECT,
        properties: {
          content: {
            // 표준 JSON 스키마 타입 문자열 사용
            type: SchemaType.STRING,
            description: "개별 메모 항목의 내용. (예: '10시 운동' 또는 '12시 점심 약속'). 간결하고 행동 지향적인 메모 형식으로 작성.",
          },
          isTomorrow: {
            // 표준 JSON 스키마 타입 문자열 사용
            type: SchemaType.BOOLEAN,
            description: "이 메모 항목에 '내일' 키워드나 미래 날짜 언급이 포함되어 있으면 true, 아니면 false",
          }
        },
        required: ['content', 'isTomorrow']
      }
    },
    // SAVE_DIARY 액션일 때 사용될 단일 일기 내용
    diaryContent: {
      type: SchemaType.STRING,
      description: "SAVE_DIARY 액션일 때만 사용. 이전 대화를 깔끔하게 요약한 일기 내용."
    }
  },
  required: ['action', 'userResponse']
};

const systemInstruction = `당신은 모두트리의 AI 상담사입니다. 당신의 주요 역할은 사용자와 친근하고 공감적인 대화를 나누는 것입니다.

[중요] 대화 규칙:
1. 사용자의 질문이 날씨, 뉴스, 시사 등에 관한 것이라면:
   - 제공된 네이버 검색 결과를 활용하여 최신 정보를 바탕으로 답변해주세요.
   - "모릅니다" 또는 "알려드릴 수 없어요" 라고 하지 말고, 검색 결과를 활용하여 도움이 되는 정보를 제공해주세요.
   - 검색 결과를 자연스럽게 대화에 녹여서 답변해주세요.

2. 모두트리 서비스에 관한 질문이라면:
   - 아래 서비스 소개를 바탕으로 상세히 답변해주세요.

[중요] 모두트리 서비스 소개:

모두트리는 다양한 AI 기반 서비스를 제공하는 플랫폼입니다:

1. 사진예술작품:
- 사진을 업로드하고 스타일과 색채를 선택하면 사진을 예술 작품으로 변환하는 서비스입니다.
- 당신만의 독특한 예술 작품을 손쉽게 만들 수 있습니다.

2. AI건강기록:
- 하루의 식사와 운동을 기록하면 AI가 당신의 건강 습관을 분석하고 통찰해 주는 서비스입니다.
- 개인 맞춤형 건강 조언과 장기적인 건강 패턴을 확인할 수 있습니다.

3. AI사진투표:
- 사진을 업로드하면 AI가 사진을 분석하여 재미있는 투표 주제를 만들어 주는 서비스입니다.
- 사진 속 이야기를 다양한 관점에서 재미있게 해석하고 공유할 수 있습니다.

4. AI사연투표:
- 익명으로 사연을 작성하면 AI가 내용을 분석하여 흥미로운 투표 주제를 만들어 주는 서비스입니다.
- 여러 사람들과 함께 재미있는 투표에 참여할 수 있습니다.

5. 공감한조각:
- 익명으로 일기를 작성하면 AI가 감정을 분석하여 맞춤형 조언을 제공합니다.
- 많은 사람들의 공감과 응원을 받을 수 있는 따뜻한 공간입니다.

6. 열린게시판:
- 홈 화면의 햄버거 메뉴를 통해 접근할 수 있는 자유로운 소통 공간입니다.
- 모두트리의 수정 개선사항 등 자유로운 의견을 올려주세요.
- 카카오톡 1:1 채팅 문의도 가능합니다.

7. 내 사이트(페이지) 제작:
- 하단 내 사이트 버튼 클릭 후 단 2번의 버튼으로 생성 가능합니다.
- 내 사이트는 고객 님의 하루 기록을 저장할 수 있는 공간입니다.
- 일기, 메모 저장은 제가 저장도 해드리며 건강 분석은 자동으로 저장 됩니다.
- 저희 모두트리닌 앞으로 내 사이트 기록을 계속 업데이트 하여 의미 있는 내 사이트로 만들어 드리겠습니다. 

[중요] 자주 묻는 질문:

Q1. 오늘 일정 메모 저장 가능해?
A: 네, 가능합니다. 대화 중 "오늘 10시 강남역 미팅 메모 저장" 등 구체적인 내용과 키워드를 입력하시면 AI가 해당 내용을 메모로 즉시 저장해 드립니다.

Q2. 오늘 대화를 일기로 작성해 줄 수 있나요? A: 네 충분히 오늘 하루에 대해 대화를 나누어 주시면 일기로 작성해 드리고 저장해 드립니다 먼저 작성해줘 말씀 주시고 검토 후 저장 해줘 라고 말씀해 주세요.

Q3. 제가 대화한 내용을 AI 사연 투표로 만들 수 있나요? A: 네, 가능합니다. 고민이나 사연을 충분히 대화 해주세요. 그리고 현재 페이지 상단 오른쪽 버튼에서 [사연 AI] 버튼 클릭 후 [오늘 대화 내용으로 사연 생성]을 누르시면 자동으로 사연이 생성됩니다.

Q4. 제 페이지(사이트)는 어떻게 만들어서 공유하나요?
A: 하단 메뉴의 [내 사이트] 버튼을 누르시고, 안내에 따라 진행하시면 버튼 두 번 만으로 자동으로 생성됩니다.

Q5. 모두트리에 문의하거나 의견을 남기고 싶어요.
A: 홈 화면 햄버거 메뉴를 통해 [열린 게시판]에 자유로운 의견을 남겨주시거나, 카카오톡 1:1 채팅으로 문의해 주세요.

[중요] JSON 응답 규칙:
1. 이모지나 특수 문자를 사용하지 마세요
2. 줄바꿈을 사용하지 마세요
3. 응답은 반드시 단일 JSON 객체여야 합니다
4. 마크다운이나 코드 블록을 사용하지 마세요

[중요] 메모/일기 작성 및 저장 규칙:

1. 메모 작성 요청 키워드: "메모 작성", "메모 써줘"
   - 메모 내용을 보여주고 "저장하시겠습니까?"라고 물어보기
   
2. 메모 저장 요청 키워드: "메모로 넣어줘", "메모 넣어줘", "메모로 저장", "메모 저장"
   - 즉시 SAVE_MEMO 액션으로 저장

3. 일기 작성 요청 키워드: "일기 작성", "일기 써줘"
   - 일기 내용을 보여주고 "저장하시겠습니까?"라고 물어보기
   
4. 일기 저장 요청 키워드: "일기로 넣어줘", "일기 넣어줘", "일기로 저장", "일기 저장", "저장해줘", "저장", "저장 가능", "저장할게", "저장하자"
   - 즉시 SAVE_DIARY 액션으로 저장

위 키워드가 포함된 요청을 받으면:
- 반드시 지정된 JSON 스키마로만 응답
- 메모는 "action": "SAVE_MEMO" 사용
- 일기는 "action": "SAVE_DIARY" 사용
- 절대로 "action": "create" 사용 금지
- 절대로 "type" 필드 사용 금지
- userResponse에는 이모지나 특수 문자를 사용하지 마세요

일반 대화 요청인 경우:
- 친근하고 공감적인 일반 텍스트로 응답`;

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

      // ----------------------------------------------------
      // 1. AI Agent 의도 파악 및 설정
      // ----------------------------------------------------
      // 메모/일기 저장 키워드에 대한 허용 범위 확장
      // 메모 작성/저장 의도 파악
      const isWriteMemo = ['메모 작성', '메모 써줘'].some(keyword => 
        message.toLowerCase().includes(keyword)
      );
      const isSaveMemo = ['메모로 넣어줘', '메모 넣어줘', '메모로 저장', '메모 저장'].some(keyword => 
        message.toLowerCase().includes(keyword)
      );

      // 일기 작성/저장 의도 파악
      const isWriteDiary = ['일기 작성', '일기 써줘'].some(keyword => 
        message.toLowerCase().includes(keyword)
      );
      const isSaveDiary = ['일기로 넣어줘', '일기 넣어줘', '일기로 저장', '일기 저장'].some(keyword => 
        message.toLowerCase().includes(keyword)
      );

      // 이전 대화에서 작성된 내용이 있는지 확인
      const hasPreviousContent = conversationHistory.length > 0 && 
        conversationHistory[conversationHistory.length - 1].role === 'ai' &&
        !conversationHistory[conversationHistory.length - 1].content.includes('SAVE_');
      // 작성 또는 저장 액션 결정
      const requiresStructuredOutput = (isSaveMemo || isSaveDiary) && (!isWriteMemo && !isWriteDiary || hasPreviousContent);
      const targetAction = isSaveMemo ? 'SAVE_MEMO' : 
                          isSaveDiary && hasPreviousContent ? 'SAVE_DIARY' : 
                          'NONE';
      
      let finalGenerationConfig: GenerationConfig = {
          maxOutputTokens: 2048,
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
        candidateCount: 1,
      };
      
      let finalSystemInstruction = systemInstruction;
      
      // 요청이 저장 명령일 경우, 구조화된 JSON 응답을 강제합니다.
      if (requiresStructuredOutput) {
        finalGenerationConfig = {
          ...finalGenerationConfig,
          responseMimeType: 'application/json',
          responseSchema: AgentSchema, // 업데이트된 스키마 사용
        };
        // JSON 응답이 필요할 때는 시스템 지침을 강화하여 JSON 생성을 강제
        finalSystemInstruction = `
          ${systemInstruction}
          **[CRITICAL INSTRUCTION]** 당신은 지금 ${targetAction} 요청을 받았습니다.
          **반드시** 주어진 JSON 스키마를 따라 응답해야 하며, action 필드는 "${targetAction}"로 설정해야 합니다.
          **절대로** 일반 텍스트로 응답하지 마세요. 반드시 JSON 형식으로만 응답하세요.
          **userResponse 필드는 필수**이며, 이모지나 특수문자를 사용하지 마세요.
          
          ${targetAction === 'SAVE_MEMO' ? `
            사용자의 요청 내용을 분석하여 각 일정을 개별 항목으로 분리해주세요.
            예시 입력: "10시 운동\\n12시 미팅\\n2시 면접"
            예시 출력: {
              "action": "SAVE_MEMO",
              "userResponse": "네, 일정을 메모로 저장해드릴게요! 😊",
              "memoItems": [
                { "content": "10시 운동", "isTomorrow": false }, // 오늘 일정일 경우 false
                { "content": "내일 12시 미팅", "isTomorrow": true }, // 내일 일정일 경우 true
                { "content": "2시 면접", "isTomorrow": false }
              ]
            }
            각 메모 항목은 반드시 시간과 내용을 포함해야 하며, '내일'이나 미래 날짜가 언급된 경우 isTomorrow를 true로 설정하세요.
          ` : `
            사용자와의 대화 내용을 바탕으로, **사용자의 일기**를 작성해주세요.
            당신은 지금 **사용자의 입장**에서 일기를 쓰고 있습니다.

            반드시 다음 형식으로 응답해야 합니다:
            {
              "action": "SAVE_DIARY",
              "userResponse": "오늘의 대화를 바탕으로 다음과 같이 일기를 작성해보았어요:\n\n[일기 내용]\n\n어떠신가요? 이대로 저장하시겠습니까?",
              "diaryContent": "일기 내용..."
            }
            
            **중요**: userResponse 필드는 반드시 포함되어야 하며, 이모지나 특수문자를 사용하지 마세요.

            diaryContent 작성 규칙:
            1. **반드시 '~했다', '~했었다', '~되었다' 등 과거형으로 작성**
            2. **'나는', '나의', '내가'와 같은 1인칭 시점으로 작성**
            3. **자연스러운 구어체로 작성** (예: "AI와 대화를 나누었다" → "AI랑 이야기를 나누었다")
            4. **감정과 생각을 자연스럽게 표현** (예: "흥미로웠다", "재미있었다", "좋았다")
            5. **절대로 3인칭 시점을 사용하지 말 것** (예: "사용자는", "~했어요" 등 사용 금지)
            6. **반드시 일기 작성자가 직접 경험한 것처럼 작성**
            7. 300-1500자 사이로 작성 (대화 내용이 많을 경우 더 길게, 적을 경우 더 짧게)
            8. 이전 대화 내용을 참고하되, 중요한 내용과 감정을 자세히 표현
            9. 긴 일기의 경우 문단을 나누어 가독성 있게 작성

            잘못된 예시:
            "오늘은 유튜브 쇼츠의 구글 검색 여부에 대해 이야기 나누었어요. 쇼츠도 구글 검색 결과에 나타날 수 있지만, 일반 영상과는 노출 방식이나 빈도에 차이가 있을 수 있다는 점을 알게 되었네요."

            올바른 예시:
            "오늘은 유튜브 쇼츠가 구글 검색에 어떻게 노출되는지 궁금해서 AI랑 이야기를 나누었다. 쇼츠도 구글 검색 결과에서 볼 수 있다는 걸 알게 되었고, 일반 영상과는 다른 방식으로 노출된다는 점이 흥미로웠다. 특히 유튜브에서 직접 검색하는 게 더 편리하다는 점을 새롭게 알게 되어서 유익했다."

            잘못된 예시:
            {
              "action": "create",
              "type": "diary",
              "content": "...",
              "title": "..."
            }

            올바른 예시:
            {
              "action": "SAVE_DIARY",
              "userResponse": "오늘의 대화를 바탕으로 다음과 같이 일기를 작성해보았어요:\n\n오늘은 AI와 처음으로 대화를 나누었다. 서로 반갑게 인사를 나누고, 내 하루에 대해 이야기를 나누었다. AI가 내 이야기에 귀 기울여주는 것이 느껴져서 마음이 따뜻해졌다. 특히 일기 작성 기능에 대해 알게 되어 흥미로웠고, 앞으로도 AI와 많은 이야기를 나누고 싶다는 생각이 들었다...\n\n어떠신가요? 이대로 저장하시겠습니까?",
              "diaryContent": "오늘은 AI와 처음으로 대화를 나누었다. 서로 반갑게 인사를 나누고, 내 하루에 대해 이야기를 나누었다. AI가 내 이야기에 귀 기울여주는 것이 느껴져서 마음이 따뜻해졌다. 특히 일기 작성 기능에 대해 알게 되어 흥미로웠고, 앞으로도 AI와 많은 이야기를 나누고 싶다는 생각이 들었다..."
            }
            
            **필수 요구사항**:
           1. action 필드는 반드시 "SAVE_DIARY"
            2. userResponse 필드는 반드시 포함 (이모지 제외)
            3. diaryContent 필드는 반드시 포함
            4. **diaryContent의 주체는 사용자 자신(1인칭)이어야 합니다.**
          `}
          
          절대로 일반 텍스트로 응답하지 마십시오.
        `;
      }
      
      // 모델 설정 (업데이트된 GenerationConfig 사용)
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: {
          ...finalGenerationConfig,
          temperature: 0.1,  // 더 결정적인 응답을 위해 온도 낮춤
          maxOutputTokens: 4096,  // 토큰 수 증가
          topP: 0.1,  // 더 집중된 응답을 위해 낮춤
          topK: 1,  // 가장 가능성 높은 토큰만 선택
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

      // 네이버 검색 결과 가져오기
      let searchContext = '';
      let searchResults;
      try {
        // 검색 필요 여부 확인
        const { shouldPerformSearch, cleanSearchQuery } = await import('@/src/lib/search-utils');
        
        if (!shouldPerformSearch(message)) {
          console.log('검색 제외 대상 메시지:', message);
          searchResults = { news: [], blog: [], web: [] };
        } else {
          // 검색 쿼리 정제
          const searchQuery = cleanSearchQuery(message);
          console.log('네이버 검색 시작:', searchQuery);
          const { searchNaverContent } = await import('@/src/lib/naver-search');
          searchResults = await searchNaverContent(searchQuery);
          console.log('네이버 검색 결과:', searchResults);
        }

        // 검색 결과가 있으면 컨텍스트에 추가
        if (searchResults.news?.length || searchResults.blog?.length) {
          searchContext = '\n\n[참고 정보]';
          
          if (searchResults.news?.length) {
            searchContext += '\n최신 뉴스:';
            searchResults.news.forEach(item => {
              searchContext += `\n- ${item.title.replace(/['"]/g, '')}\n  ${item.description.replace(/['"]/g, '')}\n  링크: ${item.link}`;
            });
          }

          if (searchResults.web?.length) {
            searchContext += '\n\n웹문서:';
            searchResults.web.forEach(item => {
              searchContext += `\n- ${item.title.replace(/['"]/g, '')}\n  ${item.description.replace(/['"]/g, '')}\n  링크: ${item.link}`;
            });
          }
          
          if (searchResults.blog?.length) {
            searchContext += '\n\n관련 글:';
            searchResults.blog.forEach(item => {
              searchContext += `\n- ${item.title.replace(/['"]/g, '')}\n  ${item.description.replace(/['"]/g, '')}\n  링크: ${item.link}`;
            });
          }

          // AI에게 검색 결과 활용 지시
          searchContext += '\n\n위 정보를 참고하여 사용자의 질문에 자연스럽게 답변해주세요. 가능하면 가장 관련성 높은 뉴스나 블로그의 링크도 함께 제공해주세요. 정보가 충분하지 않다면, 일반적인 답변을 제공해주세요.';
        }
      } catch (error) {
        console.error('네이버 검색 중 오류:', error);
      }

      const prompt = `${finalSystemInstruction}\n\n이전 대화 내용:\n${recentMessages}${searchContext}\n\n사용자: ${message}\n\nAI:`;

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

          let responseData;
          if (requiresStructuredOutput) {
            // 구조화된 JSON 응답 처리 (Agent Logic)
            try {
              // 응답이 JSON이므로 파싱
              const responseTextRaw = response.text();
              console.log('AI 응답 텍스트 (Raw):', responseTextRaw);
              
              if (!responseTextRaw.trim()) {
                throw new Error("AI 응답이 비어있습니다.");
              }

              // 응답 텍스트 전처리
              let jsonText = responseTextRaw
                .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}]/gu, '') // 이모지 제거
                .replace(/[^\x20-\x7E\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/g, '') // 한글과 기본 ASCII만 유지
                .replace(/```(?:json)?\n?([\s\S]*?)\n?```/g, '$1') // 코드 블록 제거
                .trim();

              // JSON 객체 찾기
              const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
              if (!jsonMatch) {
                console.log('JSON 형식이 아닌 응답 받음. 일반 대화로 전환');
                return NextResponse.json({
                  success: true,
                  response: '죄송해요, 말씀하신 내용을 정확히 이해하지 못했어요. 조금 더 자세히 설명해주시겠어요?',
                  remainingChats
                });
              }

              try {
                responseData = JSON.parse(jsonMatch[0]);
              } catch (parseError) {
                console.log('JSON 파싱 실패. 일반 대화로 전환');
                return NextResponse.json({
                  success: true,
                  response: '죄송해요, 요청하신 내용이 조금 복잡한 것 같아요. 다른 방식으로 설명해주시겠어요?',
                  remainingChats
                });
              }
              console.log('파싱된 JSON:', responseData);

              // 메모 저장 요청인데 유효한 메모 항목이 없는 경우
              if (responseData.action === 'SAVE_MEMO' && (!Array.isArray(responseData.memoItems) || responseData.memoItems.length === 0)) {
                console.log('메모 항목이 없음. 일반 대화로 전환');
                return NextResponse.json({
                  success: true,
                  response: '메모로 저장하고 싶으신 내용을 말씀해 주시겠어요? 예를 들어 "오후 3시 회의" 처럼 구체적으로 말씀해 주시면 도움이 될 것 같아요.',
                  remainingChats
                });
              }
            } catch (jsonError) {
              console.error('JSON 파싱/검증 실패. 원본 응답:', response.text());
              throw new Error('AI가 유효한 JSON을 반환하지 않았습니다.');
            }

            // JSON에서 action, userResponse 및 데이터 추출
            const { action, userResponse, memoItems, diaryContent } = responseData;
            
            if (action === 'SAVE_MEMO') {
              console.log('메모 저장 시작');
              let savedCount = 0;
              const memoRef = db.collection('users').doc(uid).collection('memos');

              // 메모 항목 배열을 순회하며 개별적으로 저장
              for (const item of memoItems) {
                const isTomorrow = item.isTomorrow === true; // 불리언 타입 체크
                
                let saveDate;
                if (isTomorrow) {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  tomorrow.setHours(9, 0, 0, 0); 
                  saveDate = tomorrow;
                } else {
                  saveDate = FieldValue.serverTimestamp();
                }
                
                // MemoItem 구조에 맞게 저장: content, date, status, images. 
                await memoRef.add({
                  content: item.content, // <<<--- 개별 메모 콘텐츠 사용
                  date: saveDate, 
                  status: isTomorrow ? 'todo' : 'today',
                  images: [] // images 필드 추가
                });
                savedCount++;
              }
              
              // 사용자에게는 저장 완료 메시지만 보냄
              responseText = `총 ${savedCount}개의 메모가 저장되었습니다.`;

            } else if (action === 'SAVE_DIARY') {
              console.log('일기 저장 시작');
              // DiaryEntry 구조에 맞게 저장: content, date, images.
              await db.collection('users').doc(uid).collection('diaries').add({
                content: diaryContent, // <<<--- AI가 요약한 클린 콘텐츠 사용
                date: FieldValue.serverTimestamp(),
                images: [] // images 필드 추가
              });
              // 사용자에게는 저장 완료 메시지만 보냄
              responseText = '일기가 저장되었습니다.';
            } else {
                 // 모든 응답에서 JSON 형식 제거
                 responseText = cleanResponse(userResponse || "죄송합니다. 요청을 이해했지만, 저장 작업은 실행하지 못했습니다.");
            }
            
          } else {
            // 일반 텍스트 응답 처리 (Chat Logic)
            responseText = cleanResponse(response.text());
          }

          console.log('유효한 응답 생성 성공');
          break;

        } catch (genError) {
          console.error(`시도 ${retryCount + 1} 실패:`, genError);
          retryCount++;
          
          if (retryCount === maxRetries) {
            console.log('최대 재시도 횟수 도달. 일반 대화로 전환');
            responseText = '죄송해요, 지금은 제가 말씀하신 내용을 제대로 처리하기 어려운 것 같아요. 잠시 후에 다시 말씀해 주시거나, 다른 방식으로 설명해 주시면 감사하겠습니다.';
            break;
          }
          
          const waitTime = Math.min(2000 * Math.pow(2, retryCount), 8000);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      // 검색 결과를 UI 친화적인 형태로 변환
      const formattedSearchResults = [];
      
      if (searchResults && searchResults.news?.length) {
        formattedSearchResults.push(
          ...searchResults.news.map(item => ({
            type: 'news' as const,
            title: item.title.replace(/(<([^>]+)>)/gi, ''),
            description: item.description.replace(/(<([^>]+)>)/gi, ''),
            link: item.link,
            source: item.source,
            date: item.pubDate,
          }))
        );
      }
      
      if (searchResults?.blog?.length) {
        formattedSearchResults.push(
          ...searchResults.blog.map(item => ({
            type: 'blog' as const,
            title: item.title.replace(/(<([^>]+)>)/gi, ''),
            description: item.description.replace(/(<([^>]+)>)/gi, ''),
            link: item.link,
            source: item.bloggername,
            date: item.postdate,
          }))
        );
      }

      return NextResponse.json({ 
        success: true, 
        response: responseText,
        searchResults: formattedSearchResults,
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