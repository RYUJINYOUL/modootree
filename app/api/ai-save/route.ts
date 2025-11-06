import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig, Schema, SchemaType } from '@google/generative-ai';
import { adminAuth, db } from '@/src/lib/firebase-admin';
import { checkAndUpdateChatLimit } from '@/src/lib/chat-limit-service';
import { FieldValue } from 'firebase-admin/firestore';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_AI_KEY || process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY || '');

// 메모 저장 전용 JSON 스키마
const SaveMemoSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    action: {
      type: SchemaType.STRING,
      description: "항상 SAVE_MEMO로 설정",
    },
    userResponse: {
      type: SchemaType.STRING,
      description: "저장 완료 후 사용자에게 보여줄 친근한 응답 메시지",
    },
    memoItems: {
      type: SchemaType.ARRAY,
      description: "사용자 요청에서 추출된 메모 항목들",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          content: {
            type: SchemaType.STRING,
            description: "메모 내용 (예: '10시 운동', '12시 점심 약속')",
          },
          isTomorrow: {
            type: SchemaType.BOOLEAN,
            description: "내일 일정이면 true, 오늘 일정이면 false",
          }
        },
        required: ['content', 'isTomorrow']
      }
    },
  },
  required: ['action', 'userResponse', 'memoItems']
};

const systemInstruction = `당신은 모두트리의 메모 저장 전문 AI입니다.

[핵심 역할]
사용자의 요청에서 메모할 내용을 추출하여 저장 가능한 형태로 구조화합니다.

[처리 규칙]
1. 사용자 입력에서 시간, 일정, 할 일 등을 식별
2. 각 항목을 개별 메모로 분리
3. "내일", "tomorrow" 등의 키워드로 날짜 구분
4. 반드시 JSON 형식으로만 응답

[응답 형식]
{
  "action": "SAVE_MEMO",
  "userResponse": "메모가 저장되었습니다!",
  "memoItems": [
    { "content": "10시 운동", "isTomorrow": false },
    { "content": "내일 12시 미팅", "isTomorrow": true }
  ]
}

[중요사항]
- 이모지나 특수문자 사용 금지
- 줄바꿈 사용 금지  
- 반드시 단일 JSON 객체로 응답
- action은 항상 "SAVE_MEMO"`;

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const { message, token } = await req.json();

    if (!token) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token, true);
    } catch (authError) {
      return NextResponse.json({ 
        success: false, 
        error: '인증이 만료되었습니다. 다시 로그인해주세요.', 
        needsReauth: true 
      }, { status: 401 });
    }

    const uid = decodedToken.uid;

    // 대화 한도 체크
    const { canChat, remainingChats } = await checkAndUpdateChatLimit(uid);
    if (!canChat) {
      return NextResponse.json({ 
        success: false, 
        error: '일일 대화 한도(200회)를 초과했습니다. 내일 다시 시도해주세요.', 
        remainingChats: 0 
      });
    }

    // AI 모델 설정 (JSON 응답 강제)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.1,
        topP: 0.1,
        topK: 1,
        responseMimeType: 'application/json',
        responseSchema: SaveMemoSchema,
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
      ]
    });

    const prompt = `${systemInstruction}\n\n사용자 요청: ${message}\n\nAI:`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      if (!response) {
        throw new Error('AI 응답이 생성되지 않았습니다.');
      }

      // JSON 응답 파싱
      const responseText = response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        return NextResponse.json({
          success: false,
          error: '메모 내용을 분석하는 중 오류가 발생했습니다. 다시 시도해주세요.',
          response: '죄송해요, 메모 저장 요청을 처리하는 중 문제가 발생했어요. 다시 한번 말씀해 주시겠어요?'
        });
      }

      const { action, userResponse, memoItems } = responseData;

      if (action !== 'SAVE_MEMO' || !Array.isArray(memoItems) || memoItems.length === 0) {
        return NextResponse.json({
          success: false,
          error: '저장할 메모 내용을 찾을 수 없습니다.',
          response: '메모로 저장하고 싶은 구체적인 내용을 말씀해 주세요. 예: "오후 3시 회의"'
        });
      }

      // Firestore에 메모 저장
      let savedCount = 0;
      const memoRef = db.collection('users').doc(uid).collection('private_memos');

      for (const item of memoItems) {
        const isTomorrow = item.isTomorrow === true;
        
        let saveDate;
        if (isTomorrow) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(9, 0, 0, 0);
          saveDate = tomorrow;
        } else {
          saveDate = FieldValue.serverTimestamp();
        }
        
        await memoRef.add({
          content: item.content,
          date: saveDate,
          status: isTomorrow ? 'todo' : 'today',
          images: [],
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });
        savedCount++;
      }

      const successMessage = `총 ${savedCount}개의 메모가 저장되었습니다.`;
      const aiResponse = userResponse || "메모 저장이 완료되었어요!";

      return NextResponse.json({
        success: true,
        response: `${successMessage}\n\n${aiResponse}`,
        remainingChats,
        savedCount
      });

    } catch (genError) {
      console.error('AI 생성 오류:', genError);
      return NextResponse.json({
        success: false,
        error: '메모 저장 중 오류가 발생했습니다.',
        response: '메모 저장 요청을 받았지만 처리 중 문제가 발생했어요. 다시 한번 시도해 주시겠어요?'
      });
    }

  } catch (error: any) {
    console.error('메모 저장 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '알 수 없는 오류가 발생했습니다.',
      response: '죄송해요, 일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.'
    }, { status: 500 });
  }
}




