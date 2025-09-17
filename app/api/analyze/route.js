import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(req) {
  console.log('API 호출됨');

  if (!OPENAI_API_KEY) {
    console.error('OpenAI API 키가 설정되지 않음');
    return NextResponse.json(
      { error: 'OpenAI API key is not configured' },
      { status: 500 }
    );
  }

  try {
    const { imageUrls, description, category } = await req.json();
    console.log('요청 데이터:', { category, imageCount: imageUrls?.length });

    // API 요청 준비
    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: description || "이 이미지를 분석해주세요." },
          ...imageUrls.map(url => ({
            type: "image_url",
            image_url: { url }
          }))
        ]
      }
    ];

    // API 요청
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v1'
      },
      body: JSON.stringify({
        model: "gpt-4-vision-preview",
        max_tokens: 1000,
        temperature: 0.7,
        messages
      })
    });

    // 응답 확인
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

    // 응답 처리
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
