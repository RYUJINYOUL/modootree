import { NextRequest, NextResponse } from 'next/server';
// Schema만 임포트합니다. 타입 정의는 표준 JSON 스키마 문자열로 대체합니다.
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig, Schema, SchemaType } from '@google/generative-ai'; 
import { adminAuth, db } from '@/src/lib/firebase-admin';
import { checkAndUpdateChatLimit } from '@/src/lib/chat-limit-service';
import { FieldValue } from 'firebase-admin/firestore'; // Firebase Admin FieldValue 임포트

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_AI_KEY || process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY || '');

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

[중요] 메모/일기 작성 및 저장 규칙:

1. 메모 작성 요청 키워드: "메모 작성", "메모 써줘"
   - 메모 내용을 보여주고 "저장하시겠습니까?"라고 물어보기
   
2. 메모 저장 요청 키워드: "메모로 넣어줘", "메모 넣어줘", "메모로 저장", "메모 저장"
   - 즉시 SAVE_MEMO 액션으로 저장

3. 일기 작성 요청 키워드: "일기 작성", "일기 써줘"
   - 일기 내용을 보여주고 "저장하시겠습니까?"라고 물어보기
   
4. 일기 저장 요청 키워드: "일기로 넣어줘", "일기 넣어줘", "일기로 저장", "일기 저장", "저장해줘"
   - 즉시 SAVE_DIARY 액션으로 저장

위 키워드가 포함된 요청을 받으면:
- 반드시 지정된 JSON 스키마로만 응답
- 메모는 "action": "SAVE_MEMO" 사용
- 일기는 "action": "SAVE_DIARY" 사용
- 절대로 "action": "create" 사용 금지
- 절대로 "type" 필드 사용 금지

일반 대화 요청인 경우:
- 친근하고 공감적인 일반 텍스트로 응답`;

export async function POST(req: NextRequest) {
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
        return NextResponse.json({ success: false, error: '일일 대화 한도(100회)를 초과했습니다. 내일 다시 시도해주세요.', remainingChats: 0 });
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
      const isSaveDiary = ['일기로 넣어줘', '일기 넣어줘', '일기로 저장', '일기 저장', '저장해줘'].some(keyword => 
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
            사용자와의 대화 내용을 일기 형식으로 정리해주세요.
            
            반드시 다음 형식으로 응답해야 합니다:
            {
              "action": "SAVE_DIARY",
              "userResponse": "네, 오늘의 대화를 일기로 정리해드렸어요! 😊",
              "diaryContent": "일기 내용..."
            }

            diaryContent 작성 규칙:
            1. 일기체로 작성 ("~했다", "~되었다" 등 과거형)
            2. 대화의 핵심 내용과 감정을 포함
            3. 나의 감정과 생각을 자연스럽게 표현
            4. 200-300자 내외로 작성
            5. 대화 중 특별히 기억하고 싶은 내용이나 깨달은 점 포함
            6. 이전 대화 내용을 모두 참고하여 작성
            7. 미래의 계획이나 희망도 포함 가능

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
              "userResponse": "네, 오늘의 대화를 일기로 정리해드렸어요! 😊",
              "diaryContent": "오늘은 AI와 처음으로 대화를 나누었다. 서로 반갑게 인사를 나누고, 내 하루에 대해 이야기를 나누었다. AI가 내 이야기에 귀 기울여주는 것이 느껴져서 마음이 따뜻해졌다. 특히 일기 작성 기능에 대해 알게 되어 흥미로웠고, 앞으로도 AI와 많은 이야기를 나누고 싶다는 생각이 들었다..."
            }
          `}
          
          절대로 일반 텍스트로 응답하지 마십시오.
        `;
      }
      
      // 모델 설정 (업데이트된 GenerationConfig 사용)
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: finalGenerationConfig,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
        ]
      });

      // 대화 컨텍스트 구성
      const recentMessages = conversationHistory.slice(-4).map((msg: { role: 'user' | 'ai'; content: string }) => 
        `${msg.role === 'user' ? '사용자' : 'AI'}: ${msg.content}`
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

          let responseData;
          if (requiresStructuredOutput) {
            // 구조화된 JSON 응답 처리 (Agent Logic)
            try {
              // 응답이 JSON이므로 파싱
              const responseTextRaw = response.text();
              console.log('AI 응답 텍스트 (Raw):', responseTextRaw);
              // 혹시 모를 JSON 외부의 텍스트를 제거하고 순수 JSON만 파싱
              const jsonMatch = responseTextRaw.match(/\{[\s\S]*\}/);
              if (!jsonMatch) {
                throw new Error("AI 응답에서 유효한 JSON 객체를 찾을 수 없습니다.");
              }
              responseData = JSON.parse(jsonMatch[0]);
              console.log('파싱된 JSON:', responseData);

              // 필요한 필드가 없거나 배열이 아니면 오류
              if (responseData.action === 'SAVE_MEMO' && (!Array.isArray(responseData.memoItems) || responseData.memoItems.length === 0)) {
                  throw new Error("SAVE_MEMO 요청에 유효한 'memoItems' 배열이 없습니다.");
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
              
              // 사용자에게는 AI의 친근한 응답 + 저장 완료 메시지를 보냄
              responseText = userResponse; 
              responseText += `\n\n✅ 총 ${savedCount}개의 메모가 저장되었습니다.`;

            } else if (action === 'SAVE_DIARY') {
              console.log('일기 저장 시작');
              // DiaryEntry 구조에 맞게 저장: content, date, images.
              await db.collection('users').doc(uid).collection('diaries').add({
                content: diaryContent, // <<<--- AI가 요약한 클린 콘텐츠 사용
                date: FieldValue.serverTimestamp(),
                images: [] // images 필드 추가
              });
              // 사용자에게는 AI의 친근한 응답 + 저장 완료 메시지를 보냄
              responseText = userResponse;
              responseText += '\n\n📝 일기로 저장되었습니다.';
            } else {
                 // JSON은 받았으나 action이 NONE인 경우, 일반 텍스트로 처리
                 responseText = userResponse || "죄송합니다. 요청을 이해했지만, 저장 작업은 실행하지 못했습니다.";
            }
            
          } else {
            // 일반 텍스트 응답 처리 (Chat Logic)
            responseText = response.text();
          }

          console.log('유효한 응답 생성 성공');
          break;

        } catch (genError) {
          console.error(`시도 ${retryCount + 1} 실패:`, genError);
          retryCount++;
          
          if (retryCount === maxRetries) {
            console.error('최대 재시도 횟수 도달');
            throw new Error('죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
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