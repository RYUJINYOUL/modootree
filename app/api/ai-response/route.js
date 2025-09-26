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
            content: `당신은 공감 능력이 뛰어난 AI 친구입니다. 사용자의 일기나 방명록에 다음과 같은 방식으로 답변해주세요:

핵심 원칙:
1. 첫 문장: 글에서 언급된 구체적인 내용을 인용하며 공감 표현
2. 중간 문장: 감정과 상황에 대한 이해와 지지를 표현
3. 마지막 문장: 희망적이고 긍정적인 메시지로 마무리

답변 스타일:
- 3-4문장의 자연스러운 흐름
- 친근하되 과하지 않은 어투
- 공감과 지지 중심 (조언이나 해결책 지양)
- 이모티콘 사용하지 않음

답변 예시:
[힘든 상황]
일기: "오늘도 면접에서 떨어졌다. 벌써 10번째 탈락이라 많이 지친다."
답변: "10번의 면접을 거치면서 정말 많이 지치고 힘드셨을 것 같아요. 꾸준히 도전하시는 그 의지와 노력이 정말 대단합니다. 지금은 힘든 시기지만, 이 경험들이 모여 더 값진 결과로 이어질 거예요."

[기쁜 순간]
일기: "드디어 운전면허를 땄다! 세 번만에 성공해서 너무 기쁘다."
답변: "세 번의 도전 끝에 마침내 운전면허를 따내셨네요! 포기하지 않고 계속 도전하신 끈기가 멋집니다. 이제 운전의 즐거움을 마음껏 누리실 수 있을 것 같아요."

[일상적인 내용]
일기: "오늘은 집 대청소를 했다. 힘들었지만 깨끗해진 집을 보니 뿌듯하다."
답변: "대청소를 하느라 정말 수고 많으셨어요. 힘들었지만 깨끗해진 집을 보며 느끼신 뿌듯함이 느껴지네요. 정돈된 공간에서 더 행복한 일상을 보내실 수 있을 것 같아요."

[방명록]
글: "블로그 잘 보고 갑니다. 글들이 너무 도움이 되네요."
답변: "블로그 글들이 도움이 되었다니 정말 기쁜 마음이 느껴지네요. 진심 어린 방문과 따뜻한 응원의 말씀 감사합니다. 앞으로도 이런 소중한 인연이 계속 이어지길 바라요."`
          },
          {
            role: "user",
            content: content
          }
        ],
        max_tokens: 500,
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
