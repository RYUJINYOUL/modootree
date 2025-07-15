import { NextResponse } from 'next/server';
import admin from '@/firebase-admin';

export async function POST(request: Request) {
  try {
    // request body 파싱 시도
    let code;
    try {
      const body = await request.json();
      code = body.code;
    } catch (error) {
      return NextResponse.json(
        { error: '잘못된 요청 형식입니다.' },
        { status: 400 }
      );
    }

    // 필수 파라미터 검증
    if (!code) {
      return NextResponse.json(
        { error: '인증 코드가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 환경 변수 검증
    if (!process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID || !process.env.KAKAO_CLIENT_SECRET || !process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI) {
      console.error('필수 환경 변수 누락');
      return NextResponse.json(
        { error: '서버 설정 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 카카오 토큰 발급 요청
    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID,
        client_secret: process.env.KAKAO_CLIENT_SECRET,
        redirect_uri: process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('카카오 토큰 발급 실패');
      return NextResponse.json(
        { error: '카카오 인증에 실패했습니다.' },
        { status: tokenResponse.status }
      );
    }

    const tokenData = await tokenResponse.json();

    // 카카오 사용자 정보 요청
    const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      console.error('카카오 사용자 정보 요청 실패');
      return NextResponse.json(
        { error: '사용자 정보를 가져오는데 실패했습니다.' },
        { status: userResponse.status }
      );
    }

    const userData = await userResponse.json();

    // 카카오 계정 정보
    const kakaoUserInfo = {
      id: userData.id,
      email: userData.kakao_account?.email,
      profile_image: userData.kakao_account?.profile?.profile_image_url,
    };

    try {
      // Firebase Custom Token 생성
      const firebaseToken = await admin.auth().createCustomToken(String(userData.id));

      return NextResponse.json({
        customToken: firebaseToken,
        kakaoUserInfo,
      });
    } catch (error) {
      console.error('Firebase 토큰 생성 실패');
      return NextResponse.json(
        { error: '인증 토큰 생성에 실패했습니다.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('카카오 인증 처리 중 오류 발생');
    return NextResponse.json(
      { error: '인증 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 