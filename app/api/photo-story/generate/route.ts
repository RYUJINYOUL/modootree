import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API Key not configured.' }, { status: 500 });
  }

  const { imageUrl } = await req.json();

  if (!imageUrl) {
    return NextResponse.json({ error: '이미지 URL이 필요합니다.' }, { status: 400 });
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // base64 이미지 URL에서 실제 base64 문자열만 추출
    const base64Image = imageUrl.split(',')[1];

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // ✅ Vision 지원 최신 모델
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "이 사진에 대해 재미있는 스토리 3개를 만들어주세요. 각 스토리는 2-3문장으로 작성해주세요. 사진의 내용과 관련이 있으면서도 상상력이 풍부한 이야기를 만들어주세요. 반드시 한국어로 작성해주세요." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
          ] as any // 타입 에러 우회
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });

    // OpenAI 응답 파싱
    const stories = response.choices[0].message?.content
      ?.split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^\d+\.\s*/, ''))
      .filter(line => line.length > 0)
      .slice(0, 3) || [];

    if (stories.length === 0) {
      throw new Error('AI가 스토리를 생성하지 못했습니다.');
    }

    return NextResponse.json({ stories });

  } catch (error: any) {
    console.error('AI 스토리 생성 중 오류:', error);
    if (error.response) {
      return NextResponse.json(
        { error: `OpenAI API 호출 실패: ${error.response.status}` },
        { status: error.response.status }
      );
    } else {
      return NextResponse.json(
        { error: `AI 스토리 생성 중 오류 발생: ${error.message}` },
        { status: 500 }
      );
    }
  }
}
