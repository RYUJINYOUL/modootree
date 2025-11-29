import { NextResponse } from "next/server";

// Firebase Admin SDK import 추가
import { adminAuth } from '@/lib/firebase-admin';
import { getStorage } from 'firebase-admin/storage';

// Gemini API 설정 - art-generation-service와 동일한 방식
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent';

// 지수 백오프를 사용하여 API 호출을 시도하는 헬퍼 함수 - art-generation-service에서 가져옴
const fetchWithRetry = async (url: string, payload: any, apiKey: string, maxRetries = 3) => {
    let lastError = null;
    for (let i = 0; i < maxRetries; i++) {
        const fullUrl = apiKey ? `${url}?key=${apiKey}` : url;

        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            return response;
        }

        if (response.status === 429 || response.status >= 500) {
            lastError = response;
            const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
            console.log(`API 요청 실패 (상태: ${response.status}). ${delay.toFixed(0)}ms 후 재시도... (시도 횟수: ${i + 1}/${maxRetries})`);
            
            if (i === maxRetries - 1) {
                break;
            }

            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
        }

        throw new Error(`API 호출 실패: ${response.statusText}`);
    }
    if (lastError) {
        throw new Error(`최대 재시도 횟수 초과: ${lastError.statusText}`);
    }
    throw new Error("API 호출 실패"); 
};

// 감정별 스타일 매핑 객체 (한글/영어 감정명으로 매핑)
const emotionStyleMap = {
  // 한국어 감정명
  '기쁨': { artStyle: 'pop_art', colorTheme: 'intense', specialEffects: '순수한 환희: 강렬한 대비와 원색' },
  '설렘': { artStyle: 'pixar_3d', colorTheme: 'warm', specialEffects: '에너지와 역동성' },
  '만족': { artStyle: 'ghibli', colorTheme: 'warm', specialEffects: '아늑한 포근함' },
  '평온': { artStyle: 'watercolor', colorTheme: 'cool', specialEffects: '맑은 안정감' },
  '기대': { artStyle: 'synthwave', colorTheme: 'cool', specialEffects: '미래를 향한 시선' },
  '희망': { artStyle: 'dreamy', colorTheme: 'warm', specialEffects: '부드러운 전망' },
  '슬픔': { artStyle: 'sketch', colorTheme: 'bw', specialEffects: '고독한 내면' },
  '그리움': { artStyle: 'impressionism', colorTheme: 'cool', specialEffects: '아련한 회상' },
  '분노': { artStyle: 'cubism', colorTheme: 'intense', specialEffects: '파괴적인 충돌' },
  '짜증': { artStyle: 'post_impressionism', colorTheme: 'intense', specialEffects: '통제 불가능한 에너지' },
  '불안': { artStyle: 'glitch', colorTheme: 'cool', specialEffects: '시각적 왜곡' },
  '걱정': { artStyle: 'kaleidoscope', colorTheme: 'bw', specialEffects: '복잡한 사고' },
  '중립': { artStyle: 'minimalism', colorTheme: 'bw', specialEffects: '객관적 상태' },
  
  // 영어 감정명 (호환성)
  'joy': { artStyle: 'pop_art', colorTheme: 'intense', specialEffects: '순수한 환희: 강렬한 대비와 원색' },
  'excitement': { artStyle: 'pixar_3d', colorTheme: 'warm', specialEffects: '에너지와 역동성' },
  'satisfaction': { artStyle: 'ghibli', colorTheme: 'warm', specialEffects: '아늑한 포근함' },
  'peace': { artStyle: 'watercolor', colorTheme: 'cool', specialEffects: '맑은 안정감' },
  'anticipation': { artStyle: 'synthwave', colorTheme: 'cool', specialEffects: '미래를 향한 시선' },
  'hope': { artStyle: 'dreamy', colorTheme: 'warm', specialEffects: '부드러운 전망' },
  'sadness': { artStyle: 'sketch', colorTheme: 'bw', specialEffects: '고독한 내면' },
  'longing': { artStyle: 'impressionism', colorTheme: 'cool', specialEffects: '아련한 회상' },
  'anger': { artStyle: 'cubism', colorTheme: 'intense', specialEffects: '파괴적인 충돌' },
  'irritation': { artStyle: 'post_impressionism', colorTheme: 'intense', specialEffects: '통제 불가능한 에너지' },
  'anxiety': { artStyle: 'glitch', colorTheme: 'cool', specialEffects: '시각적 왜곡' },
  'worry': { artStyle: 'kaleidoscope', colorTheme: 'bw', specialEffects: '복잡한 사고' },
  'neutral': { artStyle: 'minimalism', colorTheme: 'bw', specialEffects: '객관적 상태' }
};

// **[수정 추가] 구조적 변형이 필요한 극단적 스타일 목록**
const structuralTransformationStyles = [
    'post_impressionism', // 짜증/Irritation
    'cubism',             // 분노/Anger
    'glitch',             // 불안/Anxiety
    'kaleidoscope',       // 걱정/Worry
    'pop_art',            // 기쁨/Joy (과감한 색상/구도 변형 허용)
    'synthwave',          // 기대/Anticipation (강력한 배경 변형 필요)
];

export async function POST(req: Request) {
  try {
    // API 키 확인
    if (!process.env.GOOGLE_AI_KEY) {
      return NextResponse.json(
        { error: "GOOGLE_AI_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    // 1. 데이터 파싱: 감정 분석 결과 포함 + 인증 토큰
    const { imageBase64, emotion, userId, token } = await req.json();
    
    // 🔍 요청 데이터 디버깅 로그
    console.log('📤 받은 요청 데이터:', {
      imageBase64: imageBase64 ? '✅ 이미지 데이터 존재' : '❌ 이미지 데이터 없음',
      emotion: emotion,
      imageBase64Length: imageBase64?.length || 0
    });

    if (!imageBase64) {
      console.error('❌ 이미지 데이터 누락');
      return NextResponse.json(
        { error: "이미지 데이터가 제공되지 않았습니다." },
        { status: 400 }
      );
    }

    if (!userId) {
      console.error('❌ 사용자 ID 누락');
      return NextResponse.json(
        { error: "사용자 ID가 제공되지 않았습니다." },
        { status: 400 }
      );
    }

    // 인증 토큰 검증
    if (!token) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    let verifiedUserId;
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      verifiedUserId = decodedToken.uid;
      
      // 요청한 userId와 토큰의 userId가 일치하는지 확인
      if (verifiedUserId !== userId) {
        return NextResponse.json(
          { error: '권한이 없습니다.' },
          { status: 403 }
        );
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json(
        { error: '인증에 실패했습니다.' },
        { status: 401 }
      );
    }

    // 2. 감정에 따른 스타일 자동 선택
    const styleConfig = emotionStyleMap[emotion as keyof typeof emotionStyleMap] || {
      artStyle: 'realistic',
      colorTheme: 'natural', 
      specialEffects: '기본 효과'
    };

    const { artStyle, colorTheme, specialEffects } = styleConfig;
    
    // 🔍 스타일 매핑 디버깅 로그
    console.log('🎨 감정-스타일 매핑:', {
      입력감정: emotion,
      매핑결과: styleConfig,
      적용스타일: artStyle,
      색상테마: colorTheme,
      특수효과: specialEffects
    });

    // 3. 이미지 데이터 처리
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    
    let mimeType = "image/png";
    if (imageBase64.includes("image/jpeg")) mimeType = "image/jpeg";
    else if (imageBase64.includes("image/webp")) mimeType = "image/webp";
    else if (imageBase64.includes("image/heic")) mimeType = "image/heic";

    // 4. 프롬프트 작성: **[수정됨] 조건부 변형 로직 적용**
    const isStructuralTransformation = structuralTransformationStyles.includes(artStyle);

    // A. 모든 경우에 적용되는 절대 제약 (피사체, 성별, 종횡비)
    const absoluteConstraint = "Do NOT introduce new subjects, change the subject's gender, or crop the main subject out of the frame. Maintain the aspect ratio and lighting color temperature.";

    // B. 조건부 원본 보존/변형 명령
    const contentPreservationClause = isStructuralTransformation
        ? `You must **MAINTAIN** the subject matter and general background but **RADICALLY TRANSFORM** the composition, pose, and color palette to fully fit the artistic style and express the emotion: ${emotion}. You must ignore the original pose and facial expression if necessary for the style.`
        : `You must **STRICTLY MAINTAIN** the subject matter, composition, pose, facial expression, and background elements of the original photograph. ABSOLUTELY DO NOT change the gender or introduce new objects. The style must be applied subtly to the existing structure.`;


    const prompt = `${absoluteConstraint} ${contentPreservationClause}

Transform the uploaded photo into a ${artStyle} persona portrait that visually represents the emotion: ${emotion}.
    
Style: ${artStyle} with ${colorTheme} color palette
Special Effects: ${specialEffects}

Create a dramatic transformation that emotionally resonates with ${emotion} feeling.`;
    
    // 🔍 최종 프롬프트 디버깅 로그
    console.log('💬 최종 프롬프트:\n', prompt);

    // 5. REST API 호출
    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
        inlineData: {
                mimeType: mimeType,
                data: base64Data,
                        }
                    }
                ]
            }
        ],
        generationConfig: {
            responseModalities: ["IMAGE"]
        },
    };

    // 6. 재시도 헬퍼 함수를 사용하여 API 호출
    console.log('🚀 Gemini API 호출 시작...');
    const response = await fetchWithRetry(GEMINI_API_URL, payload, process.env.GOOGLE_AI_KEY);
    const result = await response.json();
    
    // 🔍 Gemini API 응답 디버깅 로그
    console.log('📥 Gemini API 응답:', {
      candidates수: result.candidates?.length || 0,
      // 전체응답: JSON.stringify(result, null, 2) // 응답이 너무 길 수 있으므로 주석 처리
    });
    
    const candidate = result.candidates?.[0];
    
    // **[수정 추가] 안전 필터링 체크**
    if (candidate && candidate.safetyRatings && candidate.safetyRatings.length > 0) {
        const blocked = candidate.safetyRatings.some((rating: any) => 
            rating.probability && rating.probability !== 'NEGLIGIBLE' && rating.probability !== 'LOW'
        );
        if (blocked) {
            const categories = candidate.safetyRatings
                .filter((r: any) => r.probability && r.probability !== 'NEGLIGIBLE' && r.probability !== 'LOW')
                .map((r: any) => r.category.split('_').pop())
                .join(', ');
                
            console.error('❌ 안전 정책 위반으로 이미지 차단됨:', categories);
            throw new Error(`생성된 이미지 내용이 안전 정책을 위반하여 차단되었습니다. (차단 등급: ${categories}) 다른 사진이나 스타일을 시도해 주세요.`);
        }
    }
    
    // 이미지 데이터 추출
    const base64ImagePart = candidate?.content?.parts?.find((p: any) => 
        p.inlineData && p.inlineData.data
    );
    const base64DataResult = base64ImagePart?.inlineData?.data;

    console.log('🖼️ 이미지 데이터 추출 결과:', {
      후보존재: !!candidate,
      이미지파트존재: !!base64ImagePart,
      이미지데이터존재: !!base64DataResult,
      이미지데이터길이: base64DataResult?.length || 0
    });

    if (!base64DataResult) {
        console.error('❌ 이미지 생성 실패: 데이터 없음');
        return NextResponse.json(
            { error: "이미지 생성에 실패했습니다. 생성된 이미지 데이터가 없습니다." },
            { status: 500 }
        );
    }

    try {
        // 7. Base64 이미지를 Buffer로 변환
      const imageBuffer = Buffer.from(base64DataResult, 'base64');
      
        // 8. Firebase Admin Storage에 저장
        const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'mtree-e0249.firebasestorage.app';
        console.log('🪣 사용할 bucket 이름:', bucketName);
        const bucket = getStorage().bucket(bucketName);
        const fileExtension = base64ImagePart?.inlineData?.mimeType.split('/')[1] || 'png';
        const sanitizedStyle = artStyle.replace(/[^a-z0-9]/gi, '_');
        const fileName = `persona_images/${userId}/${emotion}_${sanitizedStyle}_${Date.now()}.${fileExtension}`;
        
        const file = bucket.file(fileName);
        await file.save(imageBuffer, {
          metadata: {
            contentType: base64ImagePart?.inlineData?.mimeType || 'image/png',
          },
        });
        
        // 9. 다운로드 URL 얻기
        const [downloadURL] = await file.getSignedUrl({
          action: 'read',
          expires: '03-09-2491', // 장기간 유효한 URL
        });
        
        // 10. Storage URL 반환
        console.log('✅ 이미지 저장 성공:', {
          downloadURL: downloadURL,
          emotion: emotion,
          appliedStyle: artStyle
        });
        
      return NextResponse.json({
        success: true,
            imageUrl: downloadURL,
            emotion: emotion,
            appliedStyle: artStyle
      });
    } catch (storageError) {
      console.error('이미지 Storage 저장 실패:', storageError);
        
        // Storage 저장 실패 시 에러 반환 (Base64는 너무 커서 Firestore 제한 초과)
      return NextResponse.json({
            success: false,
            error: "이미지 저장에 실패했습니다. 다시 시도해주세요.",
            details: storageError instanceof Error ? storageError.message : '알 수 없는 오류'
        }, { status: 500 });
    }

  } catch (error: any) {
    console.error("매거진 이미지 생성 중 오류:", error);
    
    // 안전 필터링 오류는 상세 메시지를 반환
    const errorMessage = error.message.includes('안전 정책을 위반')
      ? error.message
      : "매거진 이미지 생성 실패";
    
    return NextResponse.json(
      { 
        error: errorMessage, 
        details: error.message 
      },
      { status: 500 }
    );
  }
}