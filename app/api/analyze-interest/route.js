import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { imageUrl, description } = await request.json();
    console.log('관심도 분석 API 호출됨');
    console.log('이미지 URL:', imageUrl);
    console.log('설명:', description);
    console.log('API Key:', process.env.OPENAI_API_KEY ? '설정됨' : '설정되지 않음');

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다.');
    }

    console.log('OpenAI API 요청:', {
      imageUrl,
      description
    });

    console.log('API 요청 데이터:', {
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "분석 전문가 프롬프트"
        },
        {
          role: "user",
          content: description
        }
      ]
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4-turbo-2024-04-09",
        max_tokens: 1000,
        messages: [
          {
            role: "system",
            content: `당신은 사진 속 인물들의 관심도를 분석하는 전문가입니다. 각 인물의 의상, 위치, 표정, 자세를 바탕으로 누가 업로더에게 관심이 있는지 재미있게 분석해주세요.

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
      "signs": ["관심을 보이는 구체적인 신호들 (시선, 표정, 자세 등)"],
      "comment": "재미있는 해석"
    }
  ],
  "funPrediction": "장난스러운 향후 전개 예측",
  "summary": "전체적인 재미있는 총평"
}`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: description
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    console.log('OpenAI API 응답:', JSON.stringify(data, null, 2));

    if (!response.ok || data.error) {
      console.error('OpenAI API 오류:', {
        status: response.status,
        statusText: response.statusText,
        error: data.error || data
      });
      return Response.json(
        { error: data.error?.message || `OpenAI API 호출 실패: ${response.status} ${response.statusText}` },
        { status: response.status || 500 }
      );
    }

    if (!data.choices?.[0]?.message?.content) {
      console.error('OpenAI API 응답 형식 오류:', data);
      return Response.json(
        { error: 'AI 응답 형식이 올바르지 않습니다.' },
        { status: 500 }
      );
    }

    const aiResponse = data.choices[0].message.content;
    console.log('AI 응답:', aiResponse);
    
    try {
      // JSON 형식으로 파싱 시도
      const parsedResponse = JSON.parse(aiResponse);
      return Response.json({ response: parsedResponse });
    } catch (e) {
      // 일반 텍스트로 처리
      return Response.json({ response: aiResponse });
    }
  } catch (error) {
    console.error('AI 분석 중 오류:', error);
    return Response.json(
      { error: 'AI 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
