import { NextRequest, NextResponse } from 'next/server';
import { generateArtwork } from '@/lib/art-generation-service';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { checkAndUpdateArtGenerationLimit } from '@/src/lib/art-generation-limit-service';

export async function POST(req: NextRequest) {
  try {
    const { style, colorMood, token, imageData } = await req.json();

    // 필수 파라미터 검증
    if (!style || !colorMood || !imageData) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 인증 토큰 필수 체크
    if (!token) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // Firebase Admin으로 토큰 검증
    let userId;
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      userId = decodedToken.uid;

      // 작품 생성 횟수 제한 체크
      try {
        const { canGenerate, remainingGenerations } = await checkAndUpdateArtGenerationLimit(userId);
        if (!canGenerate) {
          return NextResponse.json(
            { 
              error: '일일 작품 생성 한도(2회)를 초과했습니다. 내일 다시 시도해주세요.',
              remainingGenerations: 0 
            },
            { status: 429 }
          );
        }
        // 남은 생성 횟수를 전역 변수로 저장
        (global as any).remainingGenerations = remainingGenerations;
      } catch (limitError) {
        console.error('작품 생성 횟수 확인 중 오류:', limitError);
        return NextResponse.json(
          { error: '작품 생성 횟수를 확인하는 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json(
        { error: `인증에 실패했습니다. 상세: ${error instanceof Error ? error.message : '알 수 없는 오류'}` },
        { status: 401 }
      );
    }

    // 이미지 생성 요청
    const result = await generateArtwork({
      style,
      colorMood,
      userId,
      imageData
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Admin SDK로 Firestore에 저장
    const appId = 'modoo-tree';
    const collectionPath = `artifacts/${appId}/users/${userId}/artworks`;
    
    // TODO: Firebase Storage 구현 후 이미지 업로드 및 URL 저장 로직 추가 필요
    await adminDb.collection(collectionPath).add({
      userId,
      imageUrl: '', // 임시: Base64 데이터가 너무 커서 빈 문자열로 저장 (Storage 구현 후 result.imageUrl로 변경 예정)
      style: result.style,
      colorMood: result.colorMood,
      createdAt: FieldValue.serverTimestamp(),
      isShared: false
    });

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      remainingGenerations: (global as any).remainingGenerations
    });

  } catch (error) {
    console.error('Art generation API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}