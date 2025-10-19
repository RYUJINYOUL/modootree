import { NextRequest, NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase-admin'; // Firebase Admin SDK 임포트
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const { articleId, optionId } = await req.json();

    if (!articleId || !optionId) {
      return NextResponse.json({ error: 'articleId 또는 optionId가 누락되었습니다.' }, { status: 400 });
    }

    // TODO: userId (로그인 사용자) 또는 ip_hash/device_id (비로그인 사용자)를 통한 중복 투표 방지 구현 필요
    // 현재는 클라이언트에서 로컬 스토리지로만 중복 방지하고 있으므로 서버에서는 추가적인 중복 검사 로직이 필요합니다.

    // 트랜잭션을 사용하여 Firestore 데이터 일관성 유지
    await db.runTransaction(async (transaction) => {
      const articleRef = db.collection('articles').doc(articleId);
      const articleDoc = await transaction.get(articleRef);

      if (!articleDoc.exists) {
        throw new Error('존재하지 않는 뉴스 기사입니다.');
      }

      const articleData = articleDoc.data();
      const voteOptions = articleData?.vote_options || [];
      const optionIndex = voteOptions.findIndex((opt: any) => opt.id === optionId);

      if (optionIndex === -1) {
        throw new Error('유효하지 않은 투표 선택지입니다.');
      }

      // 투표 수 증가
      voteOptions[optionIndex].votes = (voteOptions[optionIndex].votes || 0) + 1;
      const newTotalVotes = (articleData?.total_votes || 0) + 1;

      transaction.update(articleRef, {
        vote_options: voteOptions,
        total_votes: newTotalVotes,
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('투표 API 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
