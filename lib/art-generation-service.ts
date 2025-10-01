// Gemini API 설정
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent';

const artStyles = {
  oil: 'oil painting technique with thick brushstrokes and rich textures', // 유화: 두꺼운 붓 터치와 풍부한 질감
  watercolor: 'watercolor painting style with clean strokes and transparent layers', // 수채화: 깨끗한 붓놀림과 투명한 색상
  kaleidoscope: 'artistic photo filter with enhanced colors and geometric patterns', // 만화경: 강화된 색상과 기하학적 패턴
  masterpiece: 'classical portrait painting style, similar to museum artworks', // 명작: 박물관 작품과 같은 고전적인 초상화 스타일
  sketch: 'detailed pencil sketch style with precise line work', // 스케치: 정밀한 선 작업의 상세한 연필 스케치
  dreamy: 'soft-focus photographic style with ethereal lighting', // 몽환적: 부드러운 초점과 비현실적인 조명의 사진 스타일
  impressionism: 'Impressionist painting style emphasizing light, vibrant color, and visible brushstrokes, similar to Claude Monet', // 인상주의 (모네): 빛과 생생한 색상, 붓 터치를 강조
  post_impressionism: 'A highly abstract, pure Post-Impressionist style, dominated by thick, turbulent, and swirling brushstrokes and dramatically expressive colors, completely transforming the image into a painting similar to Vincent van Gogh', // 후기 인상주의 (고흐): 두껍고 소용돌이치는 붓 터치와 표현적인 색상 (강도 강화!)
  cubism: 'Extreme Cubist abstraction, geometrically fragmenting the image into multiple, non-realistic perspectives and angular, jagged forms, similar to Pablo Picasso', // 입체파 (피카소): 기하학적 파편화와 다중 시점 (강도 강화!)
  pop_art: 'Pop art style using bold outlines, primary colors, and incorporating patterns and repetition like Andy Warhol', // 팝 아트: 강렬한 윤곽선과 원색, 패턴을 활용 (앤디 워홀)
  glitch: 'Severe digital distortion and aesthetic breakage, applying heavy color separation, broken pixels, and VHS static to create an intense Glitch Art effect', // 글리치: 디지털 왜곡, 깨진 픽셀, VHS 노이즈 (강도 강화!)
  minimalism: 'Abstract minimalist style emphasizing simple forms, clean lines, restricted color palettes, and large amounts of negative space' // 미니멀리즘: 단순한 형태, 깨끗한 선, 제한된 색상 팔레트
};

const colorMoods = {
  warm: 'warm yellow and orange tones',
  cool: 'cool blue and purple tones',
  intense: 'vibrant red and orange tones',
  bw: 'black and white monochrome'
};

export interface ArtGenerationParams {
  style: keyof typeof artStyles;
  colorMood: keyof typeof colorMoods;
  userId?: string;
  imageData: string;  // base64 encoded image data (MIME 타입 포함)
}

/**
 * 지수 백오프를 사용하여 API 호출을 시도하는 헬퍼 함수
 */
const fetchWithRetry = async (url: string, payload: any, apiKey: string, maxRetries = 3) => {
    let lastError = null;
    for (let i = 0; i < maxRetries; i++) {
        const response = await fetch(`${url}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            return response;
        }

        // 429 Too Many Requests이거나 5xx 서버 오류일 경우 재시도
        if (response.status === 429 || response.status >= 500) {
            lastError = response;
            const delay = Math.pow(2, i) * 1000 + Math.random() * 1000; // 1s, 2s, 4s + jitter
            console.log(`API 요청 실패 (상태: ${response.status}). ${delay.toFixed(0)}ms 후 재시도... (시도 횟수: ${i + 1}/${maxRetries})`);
            
            // 마지막 시도였으므로 루프를 종료하고 오류를 반환합니다.
            if (i === maxRetries - 1) {
                break;
            }

            await new Promise(resolve => setTimeout(resolve, delay));
            continue; // 다음 루프로 이동하여 재시도
        }

        // 그 외 오류(4xx, Forbidden 등)는 즉시 실패 처리
        throw new Error(`API 호출 실패: ${response.statusText}`);
    }
    // 최대 재시도 횟수 초과 시 마지막 오류 반환
    if (lastError) {
        // Too Many Requests 오류 발생 시에도 response.statusText를 정확히 포함하여 던지도록 했습니다.
        throw new Error(`최대 재시도 횟수 초과: ${lastError.statusText}`);
    }
    // 이 코드는 도달하지 않겠지만, 타입스크립트를 위한 예외 처리
    throw new Error("API 호출 실패"); 
};


export const generateArtwork = async ({
  style,
  colorMood,
  userId,
  imageData
}: ArtGenerationParams) => {
  try {
    if (!imageData) {
      throw new Error('이미지 데이터가 없습니다.');
    }

    // base64 데이터에서 MIME 타입과 실제 데이터를 분리
    const match = imageData.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!match) {
        throw new Error('유효하지 않은 base64 이미지 형식입니다.');
    }
    const mimeType = match[1];
    const base64Data = match[2];

    // 🚨 API 키를 환경 변수에서 가져옵니다.
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.');
    }


    // 🚨 Gemini-2.5-flash-image-preview 모델을 위한 프롬프트 구성
    // **수정된 부분: 강도 소폭 완화**
    const prompt = `TRANSFORM the visual style of this image entirely using the ${artStyles[style]} art style. Render the image as a **stylized artistic interpretation** while ensuring a **hint of photographic realism** remains to guide the details.
      Use a ${colorMoods[colorMood]} color palette. 
      IMPORTANT: You must STRICTLY MAINTAIN the subjects, background layout, pose, gender, and number of people from the original photo while applying the dramatic visual transformation. 
      This is a full style transfer, not a minor adjustment.`.trim(); // 👈 프롬프트 강도를 중간 단계로 조정

    // 🚨 Gemini API 호출을 위한 페이로드
    const payload = {
        contents: [
            {
                role: "user",
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Data
                        }
                    }
                ]
            }
        ],
        generationConfig: {
            responseModalities: ["IMAGE"]
        },
    };

    // 🚨 재시도 헬퍼 함수를 사용하여 API 호출
    const response = await fetchWithRetry(GEMINI_API_URL, payload, apiKey);

    const result = await response.json();
    
    const base64ImagePart = result?.candidates?.[0]?.content?.parts?.find((p: { inlineData: any; }) => p.inlineData);

    const base64DataResult = base64ImagePart?.inlineData?.data;
    if (!base64DataResult) {
      throw new Error('이미지 생성 실패: 반환된 이미지 데이터가 없습니다.');
    }
    
    // Base64 데이터를 Data URL 형식으로 변환하여 반환
    const imageUrl = `data:image/png;base64,${base64DataResult}`;
    
    // 🔥 Firestore 저장을 route.ts로 옮기기 위해 데이터만 반환
    return { 
        imageUrl, 
        success: true,
        style,
        colorMood
    };

  } catch (error) {
    console.error('Artwork generation error:', error);
    return {
      error: error instanceof Error ? error.message : '이미지 생성 중 오류가 발생했습니다.',
      success: false
    };
  }
};
