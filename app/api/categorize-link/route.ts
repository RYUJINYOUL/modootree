import { NextRequest, NextResponse } from 'next/server';

// 유효한 카테고리 목록 정의
const VALID_CATEGORIES = ['learning', 'work', 'entertainment', 'reference', 'inspiration', 'lifestyle'];
const DEFAULT_CATEGORY = 'learning';

export async function POST(req: NextRequest) {
  let title = '', description = '', url = '';
  
  try {
    const requestData = await req.json();
    title = requestData.title || '';
    description = requestData.description || '';
    url = requestData.url || '';

    if (!title && !description && !url) {
      return NextResponse.json({ 
        success: false, 
        error: '분류할 정보가 필요합니다.' 
      }, { status: 400 });
    }

    // OpenAI API 키 확인
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API 키가 설정되지 않았습니다.');
      return NextResponse.json({
        success: true,
        category: DEFAULT_CATEGORY,
        error: 'OpenAI API key not configured'
      });
    }

    // GPT-3.5 Turbo를 사용한 카테고리 분류
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
            content: `링크를 분석하여 가장 적합한 카테고리를 JSON 형식으로 분류해주세요.

다음 카테고리 중 하나만 선택하세요:
- learning: 교육, 강의, 튜토리얼, 학습 자료
- work: 업무, 비즈니스, 마케팅, 생산성 도구
- entertainment: 게임, 영화, 음악, 웹툰, 오락
- reference: 문서, 매뉴얼, 보고서, 기술 자료
- inspiration: 디자인, 아이디어, 창작, 예술
- lifestyle: 요리, 건강, 여행, 취미, 일상

응답은 반드시 다음 JSON 형식으로만 응답하세요:
{"category": "선택한_카테고리_ID"}

예시: {"category": "entertainment"}`
          },
          {
            role: "user",
            content: `제목: ${title || '없음'}
설명: ${description || '없음'}
URL: ${url || '없음'}`
          }
        ],
        max_tokens: 50,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API 오류: ${response.status}`);
    }

    const data = await response.json();
    const rawResponse = data.choices[0]?.message?.content?.trim() || '';
    
    // 디버깅 로그
    console.log('GPT-3.5 원본 응답:', rawResponse);
    console.log('응답 길이:', rawResponse.length);
    
    // 빈 응답 체크
    if (!rawResponse || rawResponse.length === 0) {
      console.warn('GPT-3.5가 빈 응답을 반환했습니다. 기본 카테고리로 폴백합니다.');
      return NextResponse.json({
        success: true,
        category: DEFAULT_CATEGORY,
        warning: 'Empty GPT response, using default category.'
      });
    }
    
    try {
      // JSON 파싱 시도
      const jsonResponse = JSON.parse(rawResponse);
      let selectedCategory = jsonResponse.category?.toLowerCase() || DEFAULT_CATEGORY;
      
      // 유효성 검사
      if (!VALID_CATEGORIES.includes(selectedCategory)) {
        console.warn('유효하지 않은 카테고리, fallback 사용:', selectedCategory);
        selectedCategory = DEFAULT_CATEGORY;
      }
      
      console.log('최종 선택된 카테고리:', selectedCategory);
      
      return NextResponse.json({
        success: true,
        category: selectedCategory
      });
      
    } catch (parseError) {
      console.error("JSON 파싱 실패:", rawResponse);
      
      // 키워드 검색 폴백 로직
      const aiResponseText = rawResponse.toLowerCase();
      let selectedCategory = DEFAULT_CATEGORY;
      
      for (const category of VALID_CATEGORIES) {
        if (aiResponseText.includes(`"${category}"`) || aiResponseText.includes(category)) {
          selectedCategory = category;
          break;
        }
      }
      
      console.log('키워드 검색 Fallback으로 선택된 카테고리:', selectedCategory);
      
      return NextResponse.json({
        success: true,
        category: selectedCategory,
        warning: 'JSON parsing failed, used keyword fallback.'
      });
    }

  } catch (error) {
    console.error('카테고리 분류 처리 중 오류 발생:', error);
    
    return NextResponse.json({
      success: true,
      category: DEFAULT_CATEGORY, 
      error: error instanceof Error ? error.message : '알 수 없는 서버 오류'
    });
  }
}