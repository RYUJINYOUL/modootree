import { NextResponse } from 'next/server';
import admin from '@/firebase-admin';

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    // 카카오 토큰 발급 요청
    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID!,
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/kakao/callback`,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('카카오 토큰 발급 실패');
    }

    const tokenData = await tokenResponse.json();

    // 카카오 사용자 정보 요청
    const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('카카오 사용자 정보 요청 실패');
    }

    const userData = await userResponse.json();

    // 카카오 계정 정보
    const kakaoUserInfo = {
      id: userData.id,
      email: userData.kakao_account?.email,
      profile_image: userData.kakao_account?.profile?.profile_image_url,
    };

    // Firebase Custom Token 생성
    const firebaseToken = await admin.auth().createCustomToken(String(userData.id));

    return NextResponse.json({
      customToken: firebaseToken,
      kakaoUserInfo,
    });
  } catch (error) {
    console.error('카카오 인증 처리 중 오류가 발생했습니다.');
    return NextResponse.json(
      { error: '인증에 실패했습니다. 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
} 