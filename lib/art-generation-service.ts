// Gemini API 설정
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent';

// **[업데이트] 구조적 변형이 필요한 극단적 스타일 목록 (이 스타일들은 구도/포즈 보존 명령을 무시하고 재미있는 변형을 강조합니다)**
const structuralTransformationStyles = [
    'post_impressionism', // 고흐: 소용돌이치는 붓터치로 구도 변형 필요
    'cubism', // 입체파: 기하학적 파편화로 구도 변형 필요
    'glitch', // 글리치: 디지털 왜곡으로 구도 변형 필요
    'kaleidoscope', // 만화경: 기하학적 패턴 적용을 위해 원본 구도 무시 허용
    // 🔥 요청에 따라 스타일 적용 강도를 높이기 위해 추가된 목록
    'ghibli',       // 지브리: 배경과 분위기를 과장하여 애니메이션 효과 강조
    'pixar_3d',     // 픽사 3D: 캐릭터 모델링과 표정을 과장하여 3D 느낌 극대화
    'comic_book',   // 코믹북: 드라마틱한 구도와 명암 대비를 위해 원본 포즈 무시
    'cyberpunk',    // 사이버펑크: 네온과 미래적 요소를 강조하기 위해 환경 구조 변형 허용
    'simpsons',     // 심슨: 만화 스타일의 과장된 얼굴형태와 포즈 변형 허용
    'klimt',        // 클림트: 장식적인 패턴과 구성을 위해 인물 형태 변형 허용
    'pixel_art',    // 픽셀 아트: 해상도 변환 과정에서 형태 변형 허용
];

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
    minimalism: 'Abstract minimalist style emphasizing simple forms, clean lines, restricted color palettes, and large amounts of negative space', // 미니멀리즘: 단순한 형태, 깨끗한 선, 제한된 색상 팔레트
    ghibli: 'A hand-drawn Japanese animation style with gentle, vibrant colors, lush natural backdrops, and a soft, emotional atmosphere, similar to Studio Ghibli films', // 지브리: 부드러운 색감, 상세한 자연 배경, 몽환적인 분위기의 일본 애니메이션
    pixar_3d: 'Pixar 3D animation style, cinematic rendering, smooth textures, vibrant color palette, highly detailed character design', // 픽사/디즈니: 3D 애니메이션, 매끄러운 질감, 생생한 색상
    comic_book: 'Graphic novel illustration style, bold black outlines, halftone dot texture, dramatic shadows and highlights, vibrant primary colors', // 코믹북: 굵은 윤곽선, 점묘법, 드라마틱한 명암 대비
    cyberpunk: 'Vibrant neon cyberpunk style, reflective wet surfaces, dark atmosphere, glowing LED lights, digital art illustration, deep blue and magenta color scheme', // 사이버펑크: 네온 빛, 미래적 배경, 어두운 분위기
    simpsons: 'American animated sitcom style with yellow skin, large eyes, exaggerated features, and thick black outlines, similar to The Simpsons or Family Guy', // 심슨: 노란 피부, 과장된 특징, 굵은 외곽선
    klimt: 'Art Nouveau painting style of Gustav Klimt, featuring intricate gold leaf patterns, mosaic-like details, and decorative geometric shapes', // 클림트: 황금 패턴, 모자이크 디테일의 아르누보 초상화
    pixel_art: 'Retro 8-bit pixel art style, low resolution, blocky details, and a restricted color palette, reminiscent of vintage video games', // 픽셀 아트: 고전 게임 스타일의 8비트, 저해상도 픽셀
    // 🔥 신규 추가 스타일 3가지 (재미/변형 강조)
    synthwave: '80s Synthwave art style, featuring vibrant neon pink and blue lighting, clean vector lines, and geometric grids on a dark background', // 신스웨이브: 레트로 네온, 벡터 라인
    paper_cutout: 'Paper cut-out art style, creating a layered 3D effect with sharp edges, distinct color blocks, and visible paper textures', // 종이 오리기: 입체적인 종이 질감
    crayon_art: 'Child-like Crayon drawing style, characterized by thick, colorful, scribbled lines, texture from waxy crayons, and intentional lack of precision', // 크레용 아트: 어린이 낙서 스타일
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
        // API 키가 ""인 경우 (Canvas 환경)에는 쿼리 매개변수에 추가하지 않습니다.
        const fullUrl = apiKey ? `${url}?key=${apiKey}` : url;

        const response = await fetch(fullUrl, {
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

        // 🚨 API 키를 환경 변수에서 가져옵니다. (Canvas 환경에서는 빈 문자열로 처리)
        const apiKey = typeof process !== 'undefined' && process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY : "";


        // **[수정됨] 프롬프트 로직 간소화 및 스타일 강조**
        
        // 극단적인 스타일(Cubism, Glitch 등)인 경우 내용 보존 규칙을 완화합니다.
        const isStructuralTransformation = structuralTransformationStyles.includes(style);

        const contentPreservationClause = isStructuralTransformation
            ? `You must **MAINTAIN** the subject matter, gender, and general background but **RADICALLY TRANSFORM** the composition and structure to fully fit the artistic style. Ignore the original pose if necessary for the style.`
            : `You must **STRICTLY MAINTAIN** the subject matter, composition, pose, gender, and background elements of the original photograph.`;

        const prompt = `Completely restyle the visual appearance of the uploaded photograph. This must be a dramatic, full style transfer, not a minor adjustment. Apply the following attributes:

            1. ART STYLE: Use the **${artStyles[style]}** style.
            2. COLOR MOOD: Use a **${colorMoods[colorMood]}** color palette.
            3. CONTENT PRESERVATION: ${contentPreservationClause}`.trim();


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
        
        const candidate = result.candidates?.[0]; // 후보 응답 객체 추출

        // **[안전 필터링 체크]**
        if (candidate && candidate.safetyRatings && candidate.safetyRatings.length > 0) {
            // 'NEGLIGIBLE'이나 'LOW'가 아닌 확률이 하나라도 있으면 차단된 것으로 간주
            const blocked = candidate.safetyRatings.some((rating: any) => 
                rating.probability && rating.probability !== 'NEGLIGIBLE' && rating.probability !== 'LOW'
            );
            if (blocked) {
                // 차단된 카테고리를 추출하여 사용자에게 표시
                const categories = candidate.safetyRatings
                    .filter((r: any) => r.probability && r.probability !== 'NEGLIGIBLE' && r.probability !== 'LOW')
                    .map((r: any) => r.category.split('_').pop())
                    .join(', ');
                throw new Error(`생성된 이미지 내용이 안전 정책을 위반하여 차단되었습니다. (차단 등급: ${categories}) 다른 사진이나 스타일을 시도해 주세요.`);
            }
        }
        
        // 이미지 데이터 추출 시도
        const base64ImagePart = candidate?.content?.parts?.find((p: { inlineData: any; }) => p.inlineData);

        const base64DataResult = base64ImagePart?.inlineData?.data;
        if (!base64DataResult) {
            // 안전 필터링 외의 구조적 오류일 경우
            throw new Error('이미지 생성 실패: 반환된 이미지 데이터가 없습니다. (API 응답 구조 불일치)');
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
