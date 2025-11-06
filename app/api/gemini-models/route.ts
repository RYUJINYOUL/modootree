import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // REST API로 모델 목록 조회
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    
    const availableModels = data.models?.map((model: any) => ({
      name: model.name,
      displayName: model.displayName,
      description: model.description,
      supportedGenerationMethods: model.supportedGenerationMethods
    })) || [];

    return NextResponse.json({
      success: true,
      models: availableModels,
      visionModels: availableModels.filter((model: any) => 
        model.supportedGenerationMethods?.includes('generateContent') &&
        (model.name.includes('vision') || model.name.includes('1.5'))
      )
    });

  } catch (error) {
    console.error('모델 목록 조회 오류:', error);
    return NextResponse.json(
      { 
        error: '모델 목록 조회 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}
