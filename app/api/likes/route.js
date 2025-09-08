import { db } from '../../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { content, category, targetUsername } = await request.json();

    if (!content || !category || !targetUsername) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 카테고리 유효성 검사
    const validCategories = ['일상', '감정', '관계', '목표/취미', '특별한 날', '기타/자유'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: '유효하지 않은 카테고리입니다.' },
        { status: 400 }
      );
    }

    const likeData = {
      content,
      category,
      targetUsername,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'likes'), likeData);

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (error) {
    console.error('Error adding like:', error);
    return NextResponse.json(
      { error: '공감을 추가하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 