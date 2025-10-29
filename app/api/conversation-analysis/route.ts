import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { adminAuth } from '@/src/lib/firebase-admin';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_AI_KEY || process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { content, token } = await req.json();

    if (!token) {
      console.error('토큰이 제공되지 않음');
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    if (!content || !content.trim()) {
      return NextResponse.json({ success: false, error: '분석할 대화 내용이 필요합니다.' }, { status: 400 });
    }

    // 토큰 검증
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token, true);
    } catch (authError: any) {
      console.error('토큰 검증 실패:', authError);
      return NextResponse.json({ success: false, error: '인증이 만료되었습니다. 다시 로그인해주세요.', needsReauth: true }, { status: 401 });
    }

    // Gemini 모델 설정
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.3,  // 일관된 분석을 위해 낮은 temperature
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
      ]
    });

    // 분석 프롬프트 생성
    const prompt = `다음은 사용자가 AI와 나눈 대화 내용입니다. 이 대화를 체계적으로 분석하여 다음과 같은 정보를 JSON 형식으로 제공해주세요:

1. summaryPoints: 대화의 핵심 내용을 3-5개의 요점으로 정리 (각 요점당 1-2문장, 배열 형태)
2. keywords: 대화에서 중요한 키워드 및 전문용어 5-8개 (배열 형태)
3. category: 대화의 주요 분야 (학습/교육, 업무/비즈니스, 기술/개발, 창작/아이디어, 문제해결, 정보탐색, 일상대화 등)
4. learningPoints: 대화에서 얻은 새로운 지식이나 학습 포인트 (2-4개)
5. actionItems: 대화 내용을 바탕으로 실행할 수 있는 구체적인 행동 계획 (1-3개)
6. references: 대화에서 언급된 중요한 참고자료, 도구, 방법론 등 (있는 경우만)

대화 내용:
${content}

다음 JSON 형식으로 응답해주세요:
{
  "summaryPoints": ["요점1", "요점2", "요점3", ...],
  "keywords": ["키워드1", "키워드2", "키워드3", ...],
  "category": "주요 분야",
  "learningPoints": ["학습포인트1", "학습포인트2", ...],
  "actionItems": ["실행계획1", "실행계획2", ...],
  "references": ["참고자료1", "참고자료2", ...]
}`;

    // AI 분석 실행
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysisText = response.text();

    if (!analysisText) {
      throw new Error('AI가 분석 결과를 생성하지 못했습니다.');
    }

    // JSON 파싱 시도
    let analysisResult;
    try {
      // JSON 블록 추출
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON 형식을 찾을 수 없습니다.');
      }
    } catch (parseError) {
      console.error('JSON 파싱 실패:', parseError);
      // 파싱 실패 시 기본 분석 결과 반환
      analysisResult = {
        summaryPoints: [analysisText.substring(0, 150) + '...'],
        keywords: ['대화분석', 'AI상담'],
        category: '일반대화',
        learningPoints: ['추가 분석이 필요합니다.'],
        actionItems: ['내용을 다시 검토해보세요.'],
        references: []
      };
    }

    // 결과 검증 및 기본값 설정
    const validatedResult = {
      summaryPoints: Array.isArray(analysisResult.summaryPoints) ? analysisResult.summaryPoints : ['분석 결과를 생성할 수 없습니다.'],
      keywords: Array.isArray(analysisResult.keywords) ? analysisResult.keywords : ['분석완료'],
      category: analysisResult.category || '일반대화',
      learningPoints: Array.isArray(analysisResult.learningPoints) ? analysisResult.learningPoints : ['추가 분석 필요'],
      actionItems: Array.isArray(analysisResult.actionItems) ? analysisResult.actionItems : ['내용 재검토'],
      references: Array.isArray(analysisResult.references) ? analysisResult.references : []
    };

    return NextResponse.json({ 
      success: true, 
      analysis: validatedResult
    });

  } catch (error: any) {
    console.error('대화 분석 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || '분석 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
}
