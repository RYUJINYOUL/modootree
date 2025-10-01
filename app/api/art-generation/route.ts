import { NextRequest, NextResponse } from 'next/server';
import { generateArtwork } from '@/lib/art-generation-service';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

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
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json(
        { error: '인증에 실패했습니다.' },
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
      imageUrl: result.imageUrl
    });

  } catch (error) {
    console.error('Art generation API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}