import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb as db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증 토큰이 누락되었습니다.' }, { status: 401 });
    }

    const idToken = authorization.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      console.error('ID 토큰 검증 실패:', error);
      return NextResponse.json({ error: '유효하지 않은 인증 토큰입니다.' }, { status: 401 });
    }

    const { articleId, commentText } = await req.json();

    if (!articleId || !commentText) {
      return NextResponse.json({ error: 'articleId 또는 commentText가 누락되었습니다.' }, { status: 400 });
    }

    // 사용자 정보 가져오기 (댓글 작성자 이름, 프로필 사진 등을 위해)
    const userRecord = await adminAuth.getUser(decodedToken.uid);
    const authorName = userRecord.displayName || userRecord.email?.split('@')[0] || '익명';
    const authorPhotoUrl = userRecord.photoURL || null;

    await db.collection('articles').doc(articleId).collection('comments').add({
      text: commentText,
      authorId: decodedToken.uid,
      authorName: authorName,
      authorPhotoUrl: authorPhotoUrl,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, message: '댓글이 성공적으로 등록되었습니다.' });
  } catch (error) {
    console.error('댓글 제출 API 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}



