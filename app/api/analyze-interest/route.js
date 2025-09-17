import { NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 기존의 관심도 분석 프롬프트
const INTEREST_PROMPT = `당신은 사진 속 인물들의 관심도를 분석하는 전문가입니다. 각 인물의 의상, 위치, 표정, 자세를 바탕으로 누가 업로더에게 관심이 있는지 재미있게 분석해주세요.

분석 포인트:
1. 의상 특징으로 인물 구분 (예: "파란 셔츠를 입은 분", "검은 티셔츠의 오른쪽 분")
2. 시선과 표정 분석 (누가 누구를 보고 있는지, 어떤 표정인지)
3. 자세와 제스처 (몸이 누구 쪽으로 향해 있는지, 어떤 자세인지)
4. 상대적 위치 관계 (누구 옆에 있는지, 얼마나 가까이 있는지)

응답은 재미있고 장난스럽게, 하지만 예의 바르게 작성해주세요.

응답 형식:
{
  "overview": "전체적인 상황 설명",
  "interests": [
    {
      "person": "의상과 위치로 구분된 인물 설명",
      "interestLevel": "관심도 수치 (1-10)",
      "signs": ["관심을 보이는 구체적인 신호들"],
      "comment": "재미있는 해석"
    }
  ],
  "funPrediction": "장난스러운 향후 전개 예측",
  "summary": "전체적인 재미있는 총평"
}`;

export async function POST(req) {
  if (!OPENAI_API_KEY) {
    console.error('OpenAI API 키가 설정되지 않음');
    return NextResponse.json(
      { error: 'OpenAI API key is not configured' },
      { status: 500 }
    );
  }

  try {
    const { imageUrl, imageUrls, description } = await req.json();
    const images = imageUrls || [imageUrl];
    console.log('요청 데이터:', { imageCount: images.length });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4-vision-preview",
        max_tokens: 1000,
        messages: [
          {
            role: "system",
            content: INTEREST_PROMPT
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: description || "이 이미지들을 분석해주세요."
              },
              ...images.map(url => ({
                type: "image_url",
                image_url: { url }
              }))
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('OpenAI API 오류:', {
        status: response.status,
        statusText: response.statusText,
        body: text
      });
      return NextResponse.json(
        { error: `API 오류: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('API 응답:', data);

    if (!data.choices?.[0]?.message?.content) {
      return NextResponse.json(
        { error: '유효하지 않은 API 응답' },
        { status: 500 }
      );
    }

    let aiResponse = data.choices[0].message.content.trim();
    aiResponse = aiResponse.replace(/\`\`\`json|\`\`\`/g, '').trim();

    try {
      const parsedResponse = JSON.parse(aiResponse);
      return NextResponse.json({ response: parsedResponse });
    } catch (e) {
      console.error('JSON 파싱 오류:', e);
      return NextResponse.json({ response: aiResponse });
    }

  } catch (error) {
    console.error('요청 처리 오류:', error);
    return NextResponse.json(
      { error: '요청 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}