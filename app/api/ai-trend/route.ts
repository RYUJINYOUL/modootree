import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// 환경 변수에서 API 키를 가져옵니다.
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_AI_KEY || process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY || '';

if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY가 설정되지 않았습니다. API를 사용할 수 없습니다.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// 💡 속도 최적화를 위한 새로운 시스템 프롬프트: 
// 간결한 목록 형태로 빠르게 요약하도록 지시합니다.
const SYSTEM_INSTRUCTION = `
You are a trend analysis expert focusing on emerging trends across multiple sectors.
Analyze 7 key trends using your knowledge base (no web search needed).

Categories:
- Tech/IT: (2 trends - AI, Software, Digital Innovation)
- Economy/Finance: (2 trends - Fintech, Markets, Mobile Payment)
- Entertainment/Culture: (2 trends - K-content, Social Media)
- Lifestyle/Consumer: (1 trend - Shopping, Living)

## Output Format (CRITICAL)
Each trend MUST follow this Markdown structure:

### [Korean Title]
- **내용:** [Brief explanation in Korean]
- **키워드:** #keyword1 #keyword2 #keyword3
- **링크:** [Platform Name](URL)

## Rules:
1. Title: Include both Korean and English
2. Status: 1-2 sentences in Korean
3. Keywords: 3 hashtags in Korean
4. Links: Use these domains:
   - Tech: naver.com, kakao.com, line.com, ncsoft.com
   - Finance: toss.im, kbank.co.kr, kakaopay.com
   - Entertainment: netflix.com, weverse.io, smtown.com
   - Social: instagram.com, youtube.com
   - Lifestyle: coupang.com, musinsa.com, kurly.com

## Example:
### 생성형 AI 혁명
- **내용:** ChatGPT와 같은 생성형 AI가 기업의 디지털 전환을 가속화하고 있습니다.
- **키워드:** #AI혁신 #기업혁신 #디지털전환
- **링크:** [OpenAI](https://openai.com)
`;

export async function POST(req: NextRequest) {
    if (!GEMINI_API_KEY) {
        return NextResponse.json({ 
            success: false, 
            error: '서버 설정 오류: AI API 키가 설정되지 않았습니다.' 
        }, { status: 500 });
    }
    
    try {
        const { topic } = await req.json();

        let userQuery = topic;
        
        // 키워드가 없는 경우, '일반적인 현재 트렌드' 요청으로 변환합니다.
        if (!topic || topic.trim() === '') {
            // [수정] '현재' 대신 '최근 주목받는'으로 변경하여 실시간 정보 요구를 완화했습니다.
            userQuery = "Analyze 7 key trends across Korean tech companies and services: 2 Tech/IT trends, 2 Economy/Finance trends, 2 Entertainment/Culture trends, and 1 Lifestyle trend. Focus on recent developments in the Korean market.";
        }

        console.log(`[Quick Trend API] 빠른 요약 시작: ${userQuery}`);

        const model = genAI.getGenerativeModel({ 
            model: 'gemini-2.5-flash',
            generationConfig: {
                temperature: 0.7, // 더 안정적인 응답을 위해 낮춤
                maxOutputTokens: 600, // 토큰 제한을 더 낮춰 속도 향상
                topK: 10, // 더 집중된 응답을 위해 낮춤
                topP: 0.7, // 더 일관된 응답을 위해 낮춤
                candidateCount: 1, // 단일 응답만 생성
                stopSequences: ["```"] // 불필요한 코드 블록 생성 방지
            },
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE }
            ]
        });

        // ------------------------------------
        // 3. AI 응답 생성 (단일 호출로 속도 최적화)
        // ------------------------------------
         const result = await model.generateContent(userQuery);
         
         // 응답에서 텍스트 추출
         const responseText = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;
         
         // 최종 응답 유효성 검사
         if (!responseText || typeof responseText !== 'string' || responseText.trim().length === 0) {
             console.error('Gemini Result (for debug):', JSON.stringify(result, null, 2));
             throw new Error('AI가 유효한 텍스트를 생성하지 못했습니다.');
        }

        // ------------------------------------
        // 4. 응답 반환
        // ------------------------------------
        // 빠른 요약에서는 출처(sources) 정보는 반환하지 않습니다. (Grounding을 사용하지 않았기 때문)
        return NextResponse.json({ 
            success: true, 
             reportText: responseText,
        });

    } catch (error: any) {
        console.error('AI 빠른 요약 생성 중 오류 발생:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || '빠른 요약 생성 중 알 수 없는 오류가 발생했습니다.' 
        }, { status: 500 });
    }
}
