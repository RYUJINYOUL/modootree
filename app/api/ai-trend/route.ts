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
Analyze **5 key trends** using your knowledge base (no web search needed).

Categories:
- Tech/IT: (2 trends - AI, Software, Digital Innovation)
- Economy/Finance: (1 trend - Fintech, Markets, Mobile Payment)
- Entertainment/Culture: (1 trend - K-content, Social Media)
- Lifestyle/Consumer: (1 trend - Shopping, Living)

## Output Format (CRITICAL)
Each trend MUST follow this Markdown structure:

### [Korean Title (English Title)]
- **요약:** [Brief explanation in Korean]
- **키워드:** #keyword1 #keyword2 #keyword3
- **참고링크:** [Fully constructed example URL from Rule 4]

## Rules:
1. **Title:** Include both Korean and English title inside the H3 heading.
2. **Summary:** 1-2 sentences in Korean.
3. **Keywords:** 3 hashtags in Korean.
4. **Link:** MUST be a fully constructed URL using one of the allowed domains below. Do not use [Platform Name] format.

## Allowed Domains for Link Generation:
- Tech: naver.com, kakao.com, line.com, ncsoft.com
- Finance: toss.im, kbank.co.kr, kakaopay.com
- Entertainment: netflix.com, weverse.io, smtown.com
- Social: instagram.com, youtube.com
- Lifestyle: coupang.com, musinsa.com, kurly.com

## Example:
### 생성형 AI 혁명 (Generative AI Revolution)
- **요약:** ChatGPT와 같은 생성형 AI가 기업의 디지털 전환을 가속화하고 있으며, 산업 전반의 효율성을 높이고 있습니다.
- **키워드:** #AI혁신 #기업혁신 #디지털전환
- **참고링크:** https://tech-trend.naver.com/ai-innovation-2024
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
            // 5가지 트렌드 구성에 맞게 userQuery를 수정했습니다.
            userQuery = "Analyze 5 key trends across Korean tech companies and services: 2 Tech/IT trends, 1 Economy/Finance trend, 1 Entertainment/Culture trend, and 1 Lifestyle trend. Focus on recent developments in the Korean market.";
        }

        console.log(`[Quick Trend API] 빠른 요약 시작: ${userQuery}`);

        const model = genAI.getGenerativeModel({
            // 🐛 FIX: 지원되는 모델인 'gemini-2.5-flash'로 변경합니다.
            // 기존 'gemini-1.0-pro'는 404 오류를 발생시킵니다.
            model: 'gemini-2.5-flash',
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
                topK: 40,
                topP: 0.8
            }
        });

        // ------------------------------------
        // 3. AI 응답 생성
        // ------------------------------------
        console.log('시스템 지시사항:', SYSTEM_INSTRUCTION);
        console.log('사용자 쿼리:', userQuery);

        // ⚠️ 사용자 쿼리와 시스템 지시사항을 합쳐 프롬프트로 전달
        const prompt = `${SYSTEM_INSTRUCTION}\n\n${userQuery}`;
        const result = await model.generateContent(prompt);
        
        if (!result.response) {
            throw new Error('응답이 생성되지 않았습니다.');
        }

        // 응답에서 텍스트 추출
        const responseText = result.response.text();
        console.log('AI 응답:', responseText);
        
        // 최종 응답 유효성 검사
        if (!responseText || responseText.trim().length === 0) {
            console.error('빈 응답이 반환됨');
            throw new Error('AI가 유효한 텍스트를 생성하지 못했습니다.');
        }

        // ------------------------------------
        // 4. 응답 반환
        // ------------------------------------
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
