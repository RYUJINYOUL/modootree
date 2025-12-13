import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { images } = await request.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: '이미지가 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // 여러 이미지에서 텍스트 추출
    const extractedTexts: string[] = [];

    for (const imageBase64 of images) {
      try {
        // Google Cloud Vision API 사용
        const vision = require('@google-cloud/vision');
        
        // 환경변수에서 Google Cloud 인증 정보를 가져오거나
        // 서비스 계정 키 파일을 사용할 수 있습니다.
        const client = new vision.ImageAnnotatorClient({
          // keyFilename: 'path/to/service-account-key.json', // 서비스 계정 키 파일 경로
          // 또는 환경변수 GOOGLE_APPLICATION_CREDENTIALS 사용
        });
        
        // base64 이미지에서 data:image/... 부분 제거
        const base64Data = imageBase64.includes(',') 
          ? imageBase64.split(',')[1] 
          : imageBase64;
        
        const [result] = await client.textDetection({
          image: {
            content: base64Data
          }
        });
        
        const detections = result.textAnnotations;
        const text = detections && detections.length > 0 ? detections[0].description : '';
        
        if (text && text.trim()) {
          extractedTexts.push(text.trim());
        }
      } catch (imageError) {
        console.error('이미지 OCR 처리 중 오류:', imageError);
        
        // Google Cloud Vision API가 설정되지 않은 경우 더미 텍스트 반환
        if (imageError.message?.includes('Could not load the default credentials') || 
            imageError.message?.includes('GOOGLE_APPLICATION_CREDENTIALS')) {
          extractedTexts.push("OCR 기능을 사용하려면 Google Cloud Vision API 인증이 필요합니다.\n환경변수 GOOGLE_APPLICATION_CREDENTIALS를 설정하거나 서비스 계정 키를 구성해주세요.");
        }
        // 개별 이미지 오류는 무시하고 계속 진행
      }
    }

    if (extractedTexts.length === 0) {
      return NextResponse.json(
        { error: '텍스트를 추출할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 추출된 텍스트들을 합침
    const combinedText = extractedTexts.join('\n\n');

    return NextResponse.json({
      success: true,
      extractedText: combinedText,
      imageCount: images.length,
      extractedCount: extractedTexts.length
    });

  } catch (error) {
    console.error('OCR API 오류:', error);
    return NextResponse.json(
      { error: 'OCR 처리 중 서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
