import { NextResponse } from 'next/server';
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { token, category, description, imageUrl } = await request.json();

    // 토큰 검증
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // 이미지 URL 처리
    let finalImageUrl = imageUrl;
    if (imageUrl.startsWith('data:image')) {
      try {
        // base64 이미지를 Buffer로 변환
        const base64Data = imageUrl.split(',')[1];
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // Storage에 업로드
        const bucket = adminStorage.bucket();
        const timestamp = Date.now();
        const fileName = `likes/${userId}/${timestamp}_artwork.jpg`;
        const file = bucket.file(fileName);

        // 파일 업로드 및 메타데이터 설정
        await file.save(imageBuffer, {
          metadata: {
            contentType: 'image/jpeg',
            metadata: {
              userId,
              timestamp,
              category
            }
          }
        });

        // 공개 URL 가져오기
        finalImageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      } catch (error) {
        console.error('Storage upload error:', error);
        throw new Error('이미지 업로드 중 오류가 발생했습니다.');
      }
    }

    // Firestore에 저장
    const itemRef = adminDb.collection('likes').doc(userId).collection('items');
    await itemRef.add({
      userId,
      category,
      description,
      imageUrl: finalImageUrl,
      createdAt: FieldValue.serverTimestamp()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}