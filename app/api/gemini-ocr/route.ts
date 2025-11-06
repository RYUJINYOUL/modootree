import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { images } = await request.json();

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: '이미지가 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // Gemini API 키 확인
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // 최신 Gemini Flash 모델 사용
    const GEMINI_FLASH = "gemini-2.5-flash-preview-09-2025";
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_FLASH}:generateContent?key=${apiKey}`;

    let extractedTexts: string[] = [];

    // 각 이미지에 대해 OCR 수행
    for (const imageBase64 of images) {
      let base64Data = '';
      let mimeType = '';
      
      try {
        // Base64 데이터에서 MIME 타입과 실제 데이터 분리
        const [mimeData, imageData] = imageBase64.split(',');
        base64Data = imageData;
        mimeType = mimeData.match(/data:([^;]+)/)?.[1] || 'image/jpeg';

        // 이미지 크기 체크 (4MB 제한)
        const imageSizeInBytes = (base64Data.length * 3) / 4;
        if (imageSizeInBytes > 4 * 1024 * 1024) {
          extractedTexts.push('[이미지 크기가 너무 큽니다 (4MB 초과)]');
          continue;
        }

        // 지원되는 이미지 형식 체크
        const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
        if (!supportedTypes.includes(mimeType)) {
          extractedTexts.push(`[지원하지 않는 이미지 형식: ${mimeType}]`);
          continue;
        }

        // Gemini REST API 요청 페이로드 구성
        const requestPayload = {
          contents: [
            {
              parts: [
                {
                  text: `이 이미지에서 모든 텍스트를 정확하게 추출해주세요. 
다음 사항을 고려해주세요:
1. 한글, 영어, 숫자 모두 추출
2. 표, 목록, 메모 형태의 텍스트도 포함
3. 텍스트의 구조와 순서를 유지
4. 읽기 어려운 부분은 [불명확]으로 표시
5. 텍스트가 없다면 "텍스트 없음"으로 응답

추출된 텍스트만 반환해주세요:`
                },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            topK: 32,
            topP: 1,
            maxOutputTokens: 4096,
          }
        };

        // 직접 fetch로 API 호출
        const response = await fetch(GEMINI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload)
        });

        if (!response.ok) {
          throw new Error(`API 호출 실패: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (text && text.trim() !== "텍스트 없음") {
          extractedTexts.push(text.trim());
        }
      } catch (error) {
        console.error('개별 이미지 OCR 오류:', error);
        console.error('오류 상세:', {
          message: error instanceof Error ? error.message : '알 수 없는 오류',
          stack: error instanceof Error ? error.stack : undefined,
          imageSize: base64Data ? base64Data.length : 0,
          mimeType: mimeType
        });
        extractedTexts.push(`[OCR 처리 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}]`);
      }
    }

    // 모든 추출된 텍스트를 합침
    const combinedText = extractedTexts.length > 0 
      ? extractedTexts.join('\n\n--- 다음 이미지 ---\n\n')
      : '추출된 텍스트가 없습니다.';

    return NextResponse.json({
      success: true,
      text: combinedText,
      imageCount: images.length,
      extractedCount: extractedTexts.filter(text => !text.includes('[OCR 처리 실패')).length,
      failedCount: extractedTexts.filter(text => text.includes('[OCR 처리 실패')).length,
      details: extractedTexts
    });

  } catch (error) {
    console.error('Gemini OCR API 오류:', error);
    return NextResponse.json(
      { 
        error: 'OCR 처리 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}
