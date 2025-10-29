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
      description: "사용자가 요청한 행동 (SAVE_MEMO 또는 NONE 중 하나)",
    },
    userResponse: {
      type: SchemaType.STRING,
      description: "저장 완료 후 사용자에게 보여줄 친근하고 공감적인 응답 메시지. (예: '네, 메모가 저장되었어요!')",
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
  },
  required: ['action', 'userResponse']
};

const systemInstruction = `당신은 모두트리의 AI 상담사입니다. 당신의 주요 역할은 사용자와 친근하고 공감적인 대화를 나누는 것입니다.

[중요] 대화 규칙:
1. 사용자의 감정과 고민에 공감하며 따뜻하고 친근한 대화를 나누어 주세요.
2. 모두트리 서비스에 관한 질문이라면 아래 서비스 소개를 바탕으로 상세히 답변해주세요.
3. 실시간 정보(날씨, 뉴스, 주식 등)나 일반 검색이 필요한 질문에는 "실시간 정보는 알려드릴 수 없어요. 상단 드롭다운 메뉴 통합검색 페이지에서 검색 가능하며 일반 검색은 물론, 유튜브 SNS까지 검색 가능합니다."라고 안내해주세요.

[중요] 모두트리 서비스 소개:

모두트리는 다양한 AI 기반 서비스를 제공하는 플랫폼입니다:

1. 나의 기록 페이지:
- AI와의 대화로 나의 기록이 자동으로 저장되는 서비스입니다
- 회원가입을 하시면 자동으로 생성되며 하단 탭 버튼에서 내 페이지를 클릭하시면 이동합니다.
- 메모, 일기, 건강 등 내 하루가 자동으로 기록되는 페이지입니다.
- 일기는 저와 충분히 대화 후 내 페이지 기록 카테고리에서 버튼 한번 누르면 자동으로 생성 저장됩니다.

2. AI건강기록:
- 하루의 식사와 운동을 기록하면 AI가 당신의 건강 습관을 분석하고 통찰해 주는 서비스입니다.
- 개인 맞춤형 건강 조언과 장기적인 건강 패턴을 확인할 수 있습니다.

3. AI사진투표:
- 사진을 업로드하면 AI가 사진을 분석하여 재미있는 투표 주제를 만들어 주는 서비스입니다.
- 사진 속 이야기를 다양한 관점에서 재미있게 해석하고 공유할 수 있습니다.

4. AI사연투표:
- 익명으로 사연을 작성하면 AI가 내용을 분석하여 흥미로운 투표 주제를 만들어 주는 서비스입니다.
- 여러 사람들과 함께 재미있는 투표에 참여할 수 있습니다.

5. 열린게시판:
- 홈 화면의 햄버거 메뉴를 통해 접근할 수 있는 자유로운 소통 공간입니다.
- 모두트리의 수정 개선사항 등 자유로운 의견을 올려주세요.
- 카카오톡 1:1 채팅 문의도 가능합니다.



[중요] 자주 묻는 질문:

Q1. 오늘 일정 메모 저장 가능해?
A: 네, 가능합니다. 대화 중 "오늘 10시 강남역 미팅 메모 저장" 등 구체적인 내용과 키워드를 입력하시면 AI가 해당 내용을 메모로 즉시 저장해 드립니다.

Q2. 제가 대화한 내용을 AI 사연 투표로 만들 수 있나요? 
A: 네, 가능합니다. 고민이나 사연을 충분히 대화 해주세요. 그리고 현재 페이지 상단 오른쪽 버튼에서 [사연 AI] 버튼 클릭 후 [오늘 대화 내용으로 사연 생성]을 누르시면 자동으로 사연이 생성됩니다.

Q3. 일기 작성이나 저장이 가능한가요?
A: 네, 가능합니다! 저와 오늘 하루를 충분히 대화 후 내 페이지 기록 카테고리 페이지에서 버튼 한번 누르면 자동으로 일기가 생성되어 저장됩니다. 편하게 하루 이야기를 들려주세요.

Q4. 실시간 날씨나 뉴스 정보를 알고 싶어요.
A: 실시간 정보는 알려드릴 수 없어요. 상단 드롭다운 메뉴 통합검색 페이지에서 검색 가능하며 일반 검색은 물론, 유튜브 SNS까지 검색 가능합니다.

Q5. 모두트리에 문의하거나 의견을 남기고 싶어요.
A: 홈 화면 햄버거 메뉴를 통해 [열린 게시판]에 자유로운 의견을 남겨주시거나, 카카오톡 1:1 채팅으로 문의해 주세요.

[중요] JSON 응답 규칙:
1. 이모지나 특수 문자를 사용하지 마세요
2. 줄바꿈을 사용하지 마세요
3. 응답은 반드시 단일 JSON 객체여야 합니다
4. 마크다운이나 코드 블록을 사용하지 마세요

[중요] 메모 작성 및 저장 규칙:

1. 메모 작성 요청 키워드: "메모 작성", "메모 써줘"
   - 메모 내용을 보여주고 "저장하시겠습니까?"라고 물어보기
   
2. 메모 저장 요청 키워드: "메모로 넣어줘", "메모 넣어줘", "메모로 저장", "메모 저장"
   - 즉시 SAVE_MEMO 액션으로 저장

위 키워드가 포함된 요청을 받으면:
- 반드시 지정된 JSON 스키마로만 응답
- 메모는 "action": "SAVE_MEMO" 사용
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

      // 작성 또는 저장 액션 결정
      const requiresStructuredOutput = isSaveMemo && !isWriteMemo;
      const targetAction = isSaveMemo ? 'SAVE_MEMO' : 'NONE';
      
      // 실시간 정보 문의 키워드 감지
      const isRealTimeQuery = ['날씨', '뉴스', '주식', '시간', '오늘', '현재', '유튜브'].some(keyword => 
        message.toLowerCase().includes(keyword)
      ) && !isSaveMemo && !isWriteMemo;
      
      // ⭐️ [추가] 실시간 정보 요청 시 AI 호출 없이 즉시 응답 반환 (Early Return)
      if (isRealTimeQuery) {
        const realTimeResponse = "실시간 정보는 알려드릴 수 없어요. 상단 드롭다운 메뉴 통합검색 페이지에서 검색 가능하며 일반 검색은 물론, 유튜브 SNS까지 검색 가능합니다.";
        console.log('실시간 정보 요청 감지. AI 호출 없이 바로 응답 반환.');
        return NextResponse.json({ 
          success: true, 
          response: realTimeResponse,
          remainingChats // 대화 횟수 차감 없이 응답
        });
      }
      
      let finalGenerationConfig: GenerationConfig = {
          maxOutputTokens: 1500,
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
              "userResponse": "네, 일정을 메모로 저장해드릴게요!",
              "memoItems": [
                { "content": "10시 운동", "isTomorrow": false }, // 오늘 일정일 경우 false
                { "content": "내일 12시 미팅", "isTomorrow": true }, // 내일 일정일 경우 true
                { "content": "2시 면접", "isTomorrow": false }
              ]
            }
            각 메모 항목은 반드시 시간과 내용을 포함해야 하며, '내일'이나 미래 날짜가 언급된 경우 isTomorrow를 true로 설정하세요.
          ` : ''}
          
          절대로 일반 텍스트로 응답하지 마십시오.
        `;
      }
      
      // 모델 설정 (업데이트된 GenerationConfig 사용)
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: {
          ...finalGenerationConfig,
          temperature: 0.1,  // 더 결정적인 응답을 위해 온도 낮춤
          maxOutputTokens: 2000,  // 토큰 수 조정 (약 1500-2000자)
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

      const prompt = `${finalSystemInstruction}\n\n이전 대화 내용:\n${recentMessages}\n\n사용자: ${message}\n\nAI:`;

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

              let responseData;
              try {
                responseData = JSON.parse(jsonMatch[0]);
              } catch (parseError) {
                console.log('JSON 파싱 실패. 원본 텍스트 응답 사용');
                const originalText = jsonText.replace(/```json|```/g, '').trim();
                return NextResponse.json({
                  success: true,
                  response: originalText,
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

              // JSON에서 action, userResponse 및 데이터 추출
              const { action, userResponse, memoItems } = responseData;
                
              if (action === 'SAVE_MEMO') {
                console.log('메모 저장 시작');
                let savedCount = 0;
                const memoRef = db.collection('users').doc(uid).collection('private_memos');

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
                  
                  // private_memos 구조에 맞게 저장: content, date, status, images, createdAt, updatedAt
                  await memoRef.add({
                    content: item.content, // <<<--- 개별 메모 콘텐츠 사용
                    date: saveDate, 
                    status: isTomorrow ? 'todo' : 'today',
                    images: [], // 이미지는 빈 배열로 처리
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp()
                  });
                  savedCount++;
                }
                
                // 사용자에게는 저장 완료 메시지만 보냄
                responseText = `총 ${savedCount}개의 메모가 저장되었습니다.`;

              } else {
                   // 모든 응답에서 JSON 형식 제거
                   responseText = cleanResponse(userResponse || "죄송합니다. 요청을 이해했지만, 저장 작업은 실행하지 못했습니다.");
              }
            } catch (jsonError) {
              console.error('JSON 파싱/검증 실패. 원본 응답:', response.text());
              throw new Error('AI가 유효한 JSON을 반환하지 않았습니다.');
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