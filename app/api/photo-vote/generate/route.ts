import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const VOTE_CATEGORIES = [
  {
    type: 'appearance',
    prompt: '사진 속 시각적 요소나 분위기와 관련된 재미있는 투표 주제를 만들어주세요. (예: 이 사진의 계절은? 이 장소의 분위기는?)'
  },
  {
    type: 'story',
    prompt: '사진 속 상황이나 이야기와 관련된 흥미로운 투표 주제를 만들어주세요. (예: 이 사람의 직업은? 이 순간 전후로 어떤 일이?)'
  },
  {
    type: 'emotion',
    prompt: '사진 속 감정이나 심리와 관련된 공감되는 투표 주제를 만들어주세요. (예: 이 사람의 기분은? 이 순간의 감정은?)'
  },
  {
    type: 'choice',
    prompt: '사진과 관련된 선호도나 선택에 대한 재미있는 투표 주제를 만들어주세요. (예: 이런 장소에서 하고 싶은 것은? 이런 상황에서 당신의 선택은?)'
  }
];

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Gemini API Key not configured.' }, { status: 500 });
  }

  const { imageUrl } = await req.json();

  if (!imageUrl) {
    return NextResponse.json({ error: '이미지 URL이 필요합니다.' }, { status: 400 });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-pro-vision",
      generationConfig: {
        temperature: 0.9,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    });

    // base64 이미지 URL에서 실제 base64 문자열만 추출
    const base64Image = imageUrl.split(',')[1];
    const mimeType = imageUrl.split(';')[0].split(':')[1];

    const voteTopics = [];
    
    // 각 카테고리별로 투표 주제 생성
    for (const category of VOTE_CATEGORIES) {
      const prompt = `당신은 재미있고 흥미로운 투표 주제를 만드는 전문가입니다. 주어진 사진을 보고 투표 주제와 선택지를 만들어주세요.

지침:
1. ${category.prompt}
2. 투표 주제는 한 문장으로 명확하게 작성해주세요.
3. 선택지는 4개를 제시해주세요.
4. 선택지는 재미있고 현실적이면서도 상상력이 있어야 합니다.
5. 모든 선택지는 비슷한 길이로 작성해주세요.
6. 반드시 다음 형식으로 작성해주세요:

[질문]
- 선택지1
- 선택지2
- 선택지3
- 선택지4

사진을 보고 위 지침에 맞는 투표 주제와 선택지를 만들어주세요.`;

      const result = await model.generateContent([
        { text: prompt },
        { inlineData: { data: base64Image, mimeType } }
      ]);

      const response = await result.response;
      const text = response.text();
      
      if (text && text.length > 0) {
        // 응답 파싱
        const [question, ...options] = text.split('\n').filter(line => line.trim());
        
        voteTopics.push({
          type: category.type,
          question: question.replace('[질문]', '').trim(),
          options: options
            .filter(opt => opt.startsWith('-'))
            .map(opt => opt.replace('-', '').trim())
            .filter(opt => opt.length > 0)
        });
      }
    }

    if (voteTopics.length === 0) {
      throw new Error('AI가 투표 주제를 생성하지 못했습니다.');
    }

    return NextResponse.json({ voteTopics });

  } catch (error: any) {
    console.error('AI 투표 주제 생성 중 오류:', error);
    return NextResponse.json(
      { error: `AI 투표 주제 생성 중 오류 발생: ${error.message}` },
      { status: 500 }
    );
  }
}









