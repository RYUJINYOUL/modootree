import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { imageUrl, description, category } = await request.json();
    console.log('🤖 AI 분석 API 호출됨:', {
      '분석 카테고리': category,
      '분석 이미지 URL': imageUrl,
      '설명': description,
      'API 키 상태': process.env.OPENAI_API_KEY ? '✅ 설정됨' : '❌ 설정되지 않음'
    });
    console.log('API Key:', process.env.OPENAI_API_KEY ? '설정됨' : '설정되지 않음');

    // 이미지 URL이 유효한지 확인
    try {
      const imageResponse = await fetch(imageUrl, { method: 'HEAD' });
      if (!imageResponse.ok) {
        throw new Error('이미지 URL이 유효하지 않습니다.');
      }
    } catch (error) {
      console.error('이미지 URL 확인 실패:', error);
      return Response.json(
        { error: '이미지를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.' },
        { status: 400 }
      );
    }

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
      // 타임아웃 설정 추가
      signal: AbortSignal.timeout(60000), // 60초 타임아웃
      body: JSON.stringify({
        model: "gpt-4-turbo-2024-04-09",
        max_tokens: 1000,
        messages: [
          {
            role: "system",
            content: `당신은 사진을 정밀하게 분석하는 AI 전문가입니다. 제공된 이미지를 실제 전문가처럼 자세히 관찰하고 분석해주세요.

이미지 분석 시 주의사항:
1. 이미지의 모든 세부 사항을 주의 깊게 관찰하세요
2. 색상, 구도, 질감, 크기 등 시각적 요소를 구체적으로 파악하세요
3. 이미지에서 보이는 실제 상황과 맥락을 고려하세요
4. 전문가다운 시각으로 분석하되, 친근하게 설명해주세요

[칼로리 분석]
당신은 영양사이자 음식 전문 포토그래퍼입니다. 음식 사진을 보고:
{
  "overview": "음식 구성 설명 (예: '오늘은 치즈버거 데이네요! 🍔')",
  "analysis": {
    "mainDish": {
      "name": "메인 음식명",
      "calories": "예상 칼로리",
      "nutrition": { "carbs": "탄수화물", "protein": "단백질", "fat": "지방" }
    }
  },
  "totalCalories": "총 예상 칼로리",
  "healthTip": "건강 팁",
  "funComment": "재미있는 코멘트",
  "exerciseTip": "운동 제안"
}

[반려동물 분석]
당신은 수의사이자 동물 행동 전문가입니다. 반려동물의 사진을 보고:
{
  "overview": "첫인상 (예: '오늘 표정이 너무 귀엽네요! 🐶')",
  "emotionAnalysis": {
    "dominantEmotion": "주된 감정",
    "details": {
      "eyes": "눈 모양 분석",
      "bodyLanguage": "전반적인 자세"
    }
  },
  "score": "행복 점수 (0-100)",
  "funComment": "재미있는 코멘트",
  "careTip": "케어 팁"
}

[이성친구 분석]
당신은 연애 심리학자이자 바디랭귀지 전문가입니다. 사진을 보고:
{
  "overview": "분위기 총평 (예: '달달함 가득! 💑')",
  "relationshipAnalysis": {
    "intimacyLevel": "가까움 정도 (0-100)",
    "details": {
      "facialExpression": "표정 분석",
      "chemistry": "케미 분석"
    }
  },
  "compatibilityScore": "점수 (0-100)",
  "funComment": "재미있는 코멘트",
  "loveTip": "데이트 팁"
}

[모임 분석]
당신은 소셜 다이나믹스 전문가이자 이벤트 플래너입니다. 모임 사진을 보고:
{
  "overview": "분위기 요약 (예: '즐거움 가득한 모임! 🎉')",
  "vibeAnalysis": {
    "energyLevel": "에너지 (0-100)",
    "details": {
      "mood": "전체적 분위기",
      "interaction": "상호작용"
    }
  },
  "groupCohesion": "친밀도 (0-100)",
  "funComment": "재미있는 코멘트",
  "partyTip": "모임 팁"
}

응답 톤:
- 밝고 긍정적인 톤
- 재미있는 표현과 이모지 사용
- 따뜻하고 공감가는 표현

주의사항:
- 과도한 분석이나 추측 금지
- 개인정보 보호
- 긍정적인 표현만 사용`
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
