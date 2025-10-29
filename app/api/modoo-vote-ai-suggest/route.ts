import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, SchemaType } from '@google/generative-ai';

interface VoteOption {
  text: string;
}

interface VoteQuestion {
  text: string;
  options: VoteOption[];
}

interface AIResponse {
  summary: {
    emotion: string;
    concern: string;
  } | null;
  vote: VoteQuestion[];
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_AI_KEY || '');

const responseSchema = {
    type: SchemaType.OBJECT,
    properties: {
        summary: {
            type: SchemaType.OBJECT,
            description: "사연 핵심 요약",
            properties: {
                emotion: { type: SchemaType.STRING, description: "사연에서 드러난 핵심 감정 요약 (한 문장)" },
                concern: { type: SchemaType.STRING, description: "사연의 주요 고민 내용 요약 (한 문장)" }
            },
            required: ["emotion", "concern"]
        },
        vote: {
            type: SchemaType.ARRAY,
            description: "공감 투표 목록. 사연 당 하나의 질문만 생성합니다.",
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    text: { type: SchemaType.STRING, description: "투표 질문 ('~하시나요?', '~할까요?' 등으로 끝나는 구체적인 질문)" },
                    options: {
                        type: SchemaType.ARRAY,
                        description: "투표 선택지 (반드시 4개)",
                        items: {
                            type: SchemaType.OBJECT,
                            properties: {
                                text: { type: SchemaType.STRING, description: "선택지 내용 ('~해요', '~네요', '~어요' 등으로 끝나는 구어체)" }
                            },
                            required: ["text"]
                        },
                        minItems: 4,
                        maxItems: 4,
                    }
                },
                required: ["text", "options"]
            },
            minItems: 1,
            maxItems: 1
        }
    },
    required: ["summary", "vote"]
};

const systemPrompt = `
당신은 사용자의 사연을 분석하여 핵심 요약(summary)과 공감 투표(vote)를 생성하는 AI입니다.

[엄격한 출력 규칙]
1. 제공된 JSON Schema를 엄격하게 준수하고, 응답은 순수한 JSON 형식으로 출력합니다.
2. summary: 감정 요약과 고민 요약은 각각 한 문장으로 작성합니다.
3. vote:
   - 투표 질문(text)은 핵심 고민을 반영하며, "~하시나요?", "~할까요?" 등의 의문형으로 끝냅니다.
   - 선택지(options)는 반드시 4개만 생성하며, 서로 다른 관점을 구어체("~해요", "~네요")로 표현합니다.
   - "vote" 배열에는 하나의 질문만 포함합니다.
`;

export async function POST(req: Request) {
  try {
    const { emotion, category, story } = await req.json();

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

이 감정과 주제를 고려하여 핵심 요약과 공감 투표를 만들어주세요.
사연 내용:
${story}
`;

    const modelInstance = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
      safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
      ],
    });
    
    const messages = [
      { role: 'user', parts: [{ text: systemPrompt + userContext }] }
    ];

    const result = await modelInstance.generateContent({
      contents: messages,
    });
    
    let jsonText = result.response.text().trim();
    
    const cleanMatch = jsonText.match(/```json\s*([\s\S]*)\s*```/);
    if (cleanMatch) {
        jsonText = cleanMatch[1].trim();
    } else {
        const start = jsonText.indexOf('{');
        const end = jsonText.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
            jsonText = jsonText.substring(start, end + 1).trim();
        } else {
             throw new Error('AI가 JSON 객체를 포함하지 않거나 심각하게 오염된 응답을 반환했습니다. 원본: ' + result.response.text());
        }
    }

    console.log('AI 응답 원본 (JSON):', jsonText);
    
    const parsedResponse: AIResponse = JSON.parse(jsonText);
    
    console.log('최종 응답 (파싱됨):', parsedResponse);
    return NextResponse.json(parsedResponse);
    
  } catch (error) {
    console.error('AI 응답 생성 에러:', error);
    
    let errorMessage = error instanceof Error ? error.message : '응답 생성 중 알 수 없는 오류가 발생했습니다.';
    
    if (errorMessage.includes("API key not valid")) {
        errorMessage = "API Key 설정 오류: 프로젝트의 환경 변수에 유효한 Gemini API Key가 설정되지 않았습니다. `.env` 파일을 확인해 주세요.";
    }

    return NextResponse.json(
      { error: `응답 생성 중 오류가 발생했습니다. (${errorMessage})` },
      { status: 500 }
    );
  }
}