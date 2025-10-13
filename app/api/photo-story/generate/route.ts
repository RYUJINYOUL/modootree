import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.9,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
        }
      ]
    });

    // base64 이미지 URL에서 실제 base64 문자열만 추출
    const base64Image = imageUrl.split(',')[1];
    const mimeType = imageUrl.split(';')[0].split(':')[1];

    // 스토리 생성 함수
    const generateStoryFromImage = async (storyType: { type: string; prompt: string }) => {
      try {
        console.log(`${storyType.type} 스토리 생성 시도:`, {
          prompt: storyType.prompt,
          imageSize: base64Image.length
        });

        const result = await model.generateContent({
          contents: [
            {
              role: 'user',
              parts: [
                { 
                  text: `다음은 이미지를 보고 스토리를 만들기 위한 지침입니다. 지침을 잘 읽고 이미지에 맞는 스토리를 만들어주세요:\n\n${storyType.prompt}`
                },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Image
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 1.0,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            {
              category: HarmCategory.HARM_CATEGORY_HARASSMENT,
              threshold: HarmBlockThreshold.BLOCK_NONE
            },
            {
              category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
              threshold: HarmBlockThreshold.BLOCK_NONE
            },
            {
              category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
              threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
            },
            {
              category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
              threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
            }
          ]
        });

        const response = await result.response;
        const text = response.text().trim();
        
        console.log(`${storyType.type} 스토리 생성 결과:`, {
          success: !!text,
          length: text.length,
          preview: text.substring(0, 100) + '...'
        });

        if (!text || text.length < 10) {
          throw new Error('생성된 텍스트가 너무 짧거나 비어있습니다.');
        }

        return text;
      } catch (error) {
        console.error(`${storyType.type} 스토리 생성 중 상세 오류:`, error);
        if (error instanceof Error) {
          console.error('Error name:', error.name);
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
        return null;
      }
    }

    // 각 스토리 타입별로 이야기 생성
    const storyTypes = [
      { 
        type: '러블리 모드', 
        prompt: `**[ROLE: Lovely Mood Creator]**
          Instructions:
          1. Suggest a title that captures the **most lovely and heartwarming aspect** of the photo, focusing on cute, sweet, or adorable elements.
          2. Below the title, add a **single line of lovely commentary** that expresses warmth, sweetness, or cuteness within 50 characters.
          3. **❗MOST IMPORTANT: Output ONLY the format [TITLE: 러블리 제목] and one line of lovely comment, with absolutely NO other explanation.❗**
          4. **The final output (Title and line of comment) MUST be in Korean.**`
      },
      { 
        type: '유쾌한 모드', 
        prompt: `**[ROLE: Comic Internet Meme Creator]**
          Instructions:
          1. Suggest a **meme title** or **'Jjal' title** that expresses the situation in the photo in the most humorous way.
          2. Below the title, add a **single line of humorous situation summary** containing a comic interpretation of the people or objects in the photo, within 50 characters.
          3. **❗MOST IMPORTANT: Output ONLY the format [TITLE: 짤 제목] and one line of summary, with absolutely NO other explanation.❗**
          4. **The final output (Title and line of summary) MUST be in Korean.**`
      },
      { 
        type: '분위기 모드', 
        prompt: `**[ROLE: Aesthetic Mood Expert]**
          Instructions:
          1. Suggest a title that captures the **aesthetic mood and atmosphere** of the photo, focusing on the vibe, ambiance, or emotional feeling.
          2. Below the title, add a **single line of poetic or atmospheric description** that expresses the mood within 50 characters.
          3. **❗MOST IMPORTANT: Output ONLY the format [TITLE: 분위기 제목] and one line of mood description, with absolutely NO other explanation.❗**
          4. **The final output (Title and line of description) MUST be in Korean.**`
      },
      { 
        type: '잔소리 모드', 
        prompt: `**[ROLE: Life Nagging Expert]**
          Instructions:
          1. Suggest a title that contains the **first reprimand or worry** a caring but nagging person would have when seeing this photo.
          2. Below the title, add a **single line of witty nagging or life advice** that's both humorous and realistic within 50 characters.
          3. **❗MOST IMPORTANT: Output ONLY the format [TITLE: 잔소리 제목] and one line of nagging advice, with absolutely NO other explanation.❗**
          4. **The final output (Title and line of advice) MUST be in Korean.**`
      }
    ];

    const stories = [];
    
    try {
      // 순차적으로 스토리 생성
      for (const type of storyTypes) {
        console.log(`${type.type} 스토리 생성 시작...`);
        
        const story = await generateStoryFromImage(type);
        if (story) {
          console.log(`${type.type} 스토리 생성 성공:`, story);
          stories.push({
            id: stories.length.toString(),
            content: story,
            votes: 0
          });
        } else {
          console.log(`${type.type} 스토리 생성 실패`);
        }
        
        // 각 요청 사이에 짧은 딜레이
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (stories.length === 0) {
        console.error('모든 스토리 생성 실패');
        throw new Error('AI가 스토리를 생성하지 못했습니다.');
      }

      console.log('생성된 스토리:', stories);
      return NextResponse.json({ 
        success: true,
        stories: stories
      });
      
    } catch (error) {
      console.error('스토리 생성 중 오류:', error);
      return NextResponse.json({ 
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        stories: [] 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('AI 스토리 생성 중 오류:', error);
    return NextResponse.json(
      { error: `AI 스토리 생성 중 오류 발생: ${error.message}` },
      { status: 500 }
    );
  }
}