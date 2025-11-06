import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text, systemPrompt, userPrompt } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json({
        success: false,
        error: '분석할 텍스트가 없습니다.'
      }, { status: 400 });
    }

    // OpenAI API 키 확인
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API 키가 설정되지 않았습니다.'
      }, { status: 500 });
    }

    // OpenAI API 호출
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API 오류: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const aiResult = await response.json();
    const analysisText = aiResult.choices[0].message.content;
    
    // JSON 파싱 시도
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
      
      // 기본 구조 확인 및 보정
      analysis = {
        todos: Array.isArray(analysis.todos) ? analysis.todos : [],
        schedules: Array.isArray(analysis.schedules) ? analysis.schedules : [],
        info: Array.isArray(analysis.info) ? analysis.info : [],
        general: Array.isArray(analysis.general) ? analysis.general : []
      };
      
      // 빈 문자열이나 너무 짧은 항목 제거
      Object.keys(analysis).forEach(key => {
        analysis[key] = analysis[key]
          .filter((item: string) => item && item.trim().length > 2)
          .map((item: string) => item.trim());
      });
      
    } catch (parseError) {
      console.error('JSON 파싱 실패:', parseError);
      console.error('AI 응답:', analysisText);
      
      // JSON 파싱 실패 시 기본값 반환
      analysis = {
        todos: [],
        schedules: [],
        info: [],
        general: analysisText ? [analysisText.substring(0, 100) + '...'] : []
      };
    }

    return NextResponse.json({ 
      success: true, 
      analysis,
      debug: {
        originalResponse: analysisText,
        model: "gpt-3.5-turbo"
      }
    });

  } catch (error) {
    console.error('메모 분석 API 오류:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : '분석 중 알 수 없는 오류가 발생했습니다.',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
