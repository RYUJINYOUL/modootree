import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb as db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { conversation, userId, type } = await req.json();

    if (!userId) {
      return NextResponse.json({ success: false, error: '사용자 ID가 필요합니다.' }, { status: 400 });
    }

    // 대화 내용을 기반으로 최종 저장할 텍스트를 추출 (예: AI의 마지막 응답 또는 전체 대화)
    // 여기서는 AI의 마지막 응답을 저장 텍스트로 사용하거나, 모든 대화를 합칠 수 있습니다.
    // 편의를 위해 여기서는 모든 대화를 합쳐서 저장하도록 하겠습니다.
    const savedContent = conversation
      .map((msg: any) => `${msg.role === 'user' ? '사용자' : 'AI'}: ${msg.content}`)
      .join('\n\n');

    let collectionName = '';
    if (type === 'diary') {
      collectionName = 'diaries';
    } else if (type === 'memo') {
      collectionName = 'memos';
    } else {
      // 기본값 또는 에러 처리
      collectionName = 'memos';
    }

    await db.collection(collectionName).add({
      userId: userId,
      content: savedContent, // AI와 나눈 전체 대화 내용을 저장
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      // 필요한 경우, AI가 요약한 내용이나 제목 등을 추가 필드로 저장할 수 있습니다.
      // 예를 들어, AI의 마지막 요약 응답을 추출하여 여기에 저장할 수 있습니다.
    });

    return NextResponse.json({ success: true, message: '대화 내용이 성공적으로 저장되었습니다.' });

  } catch (error: any) {
    console.error('Final save API 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

























