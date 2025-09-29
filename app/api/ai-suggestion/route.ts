import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || text.trim().length < 2) {
      return NextResponse.json(
        { error: '내용이 너무 짧습니다.' },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `당신은 메모를 분석하고 간단한 조언을 제공하는 AI 어시스턴트입니다.
          - 메모의 내용을 이해하고 1-2줄의 짧은 조언이나 제안을 제공하세요.
          - 실용적이고 구체적인 조언을 해주세요.
          - 긍정적이고 건설적인 톤을 유지하세요.
          - 응답은 다음 JSON 형식을 따릅니다:
          {
            "suggestion": "조언 내용 (1-2줄)",
            "category": "할일|계획|아이디어|목표|일상|기타" 중 하나
          }`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('AI 응답이 비어있습니다.');
    }
    return NextResponse.json(JSON.parse(content));

  } catch (error) {
    console.error('AI 조언 생성 실패:', error);
    return NextResponse.json(
      { error: 'AI 조언 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
