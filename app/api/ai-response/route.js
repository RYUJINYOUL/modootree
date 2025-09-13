export async function POST(req) {
  try {
    console.log('AI 응답 API 호출됨');
    const { content } = await req.json();
    console.log('일기 내용:', content);
    console.log('API Key:', process.env.OPENAI_API_KEY ? '설정됨' : '설정되지 않음');
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다.');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `당신은 일기를 읽고 공감적이고 따뜻한 답변을 해주는 친근한 AI입니다.
답변 작성 규칙:
1. 일기 내용에 담긴 감정과 상황에 깊이 공감해주세요
2. 구체적인 내용을 언급하며 맞춤형 답변을 제공하세요
3. 긍정적이고 희망적인 메시지를 포함해주세요
4. 3-4문장으로 작성해주세요
5. 친근하고 따뜻한 어투를 사용하세요
6. 이모티콘은 사용하지 마세요

예시:
일기: "오늘 발표했는데 긴장해서 실수했어. 준비를 많이 했는데 아쉽다."
답변: "발표 준비를 열심히 했다는 게 정말 대단해요. 긴장은 누구나 할 수 있는 자연스러운 감정이에요. 이번 경험이 다음 발표에서는 더 큰 자신감으로 이어질 거예요. 지금처럼 성실하게 준비하다 보면 분명 좋은 결과가 있을 거예요."`
          },
          {
            role: "user",
            content: content
          }
        ],
        max_tokens: 200,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error('OpenAI API 호출 실패');
    }

    const data = await response.json();
    return Response.json({ response: data.choices[0].message.content });
    } catch (error) {
      console.error('AI 응답 생성 중 오류:', error.message);
      return Response.json(
        { error: error.message || '죄송합니다. AI 답변을 생성하는 중에 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
}
