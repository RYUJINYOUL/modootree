import { NextResponse } from 'next/server';
import admin from '../../../../firebase-admin';

// 환경에 따른 리다이렉트 URI 설정
const getRedirectUri = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (isDevelopment ? 'http://localhost:3000' : 'https://www.modootree.com');
  return `${baseUrl}/auth/kakao/callback`;
};

export async function POST(request: Request) {
  try {
    // request body 파싱 시도
    let code;
    try {
      const body = await request.json();
      code = body.code;
      console.log('Received code:', code?.substring(0, 10) + '...');
    } catch (error) {
      console.error('Body parsing error:', error);
      return new NextResponse(
        JSON.stringify({ 
          error: '잘못된 요청 형식입니다.', 
          details: '요청 본문이 올바른 JSON 형식이 아닙니다.' 
        }), 
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    // 필수 파라미터 검증
    if (!code) {
      console.error('Code is missing');
      return new NextResponse(
        JSON.stringify({ error: '인증 코드가 누락되었습니다.' }), 
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    // 환경 변수 검증
    const clientId = process.env.KAKAO_CLIENT_ID || process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID;
    const clientSecret = process.env.KAKAO_CLIENT_SECRET;
    const redirectUri = getRedirectUri();

    if (!clientId || !clientSecret) {
      console.error('Missing environment variables:', {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret
      });
      return new NextResponse(
        JSON.stringify({ 
          error: '서버 설정 오류가 발생했습니다.', 
          details: '필수 환경 변수가 설정되지 않았습니다.' 
        }), 
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    console.log('Kakao auth process started with:', {
      redirectUri,
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret
    });

    // 카카오 토큰 발급 요청
    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });

    let tokenData;
    try {
      const tokenText = await tokenResponse.text();
      console.log('Raw token response:', tokenText);
      tokenData = JSON.parse(tokenText);
    } catch (error) {
      console.error('Token response parsing error:', error);
      return new NextResponse(
        JSON.stringify({ 
          error: '카카오 인증에 실패했습니다.',
          details: '토큰 응답을 처리할 수 없습니다.'
        }), 
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    if (!tokenResponse.ok || !tokenData) {
      console.error('Kakao token request failed:', {
        status: tokenResponse.status,
        error: tokenData
      });
      return new NextResponse(
        JSON.stringify({ 
          error: '카카오 인증에 실패했습니다.',
          details: tokenData?.error_description || '토큰 발급 중 오류가 발생했습니다.'
        }), 
        { 
          status: tokenResponse.status,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    // 카카오 사용자 정보 요청
    const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    let userData;
    try {
      const userText = await userResponse.text();
      console.log('Raw user response:', userText);
      userData = JSON.parse(userText);
    } catch (error) {
      console.error('User info parsing error:', error);
      return new NextResponse(
        JSON.stringify({ 
          error: '사용자 정보를 가져오는데 실패했습니다.',
          details: '사용자 정보 응답을 처리할 수 없습니다.'
        }), 
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    if (!userResponse.ok || !userData) {
      console.error('Kakao user info request failed:', {
        status: userResponse.status,
        error: userData
      });
      return new NextResponse(
        JSON.stringify({ 
          error: '사용자 정보를 가져오는데 실패했습니다.',
          details: '카카오 API 호출 중 오류가 발생했습니다.'
        }), 
        { 
          status: userResponse.status,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    // 이메일 필수 체크
    if (!userData.kakao_account?.email) {
      return new NextResponse(
        JSON.stringify({ 
          error: '이메일 정보 없음',
          details: '카카오 계정의 이메일 정보가 필요합니다. 카카오 로그인 시 이메일 제공에 동의해주세요.'
        }), 
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    // 카카오 계정 정보
    const kakaoUserInfo = {
      id: userData.id,
      email: userData.kakao_account.email,
      profile_image: userData.kakao_account?.profile?.profile_image_url || null,
    };

    try {
      // Firebase Custom Token 생성
      const firebaseToken = await admin.auth().createCustomToken(String(userData.id));
      console.log('Firebase token created successfully for user:', userData.id);

      return new NextResponse(
        JSON.stringify({
        customToken: firebaseToken,
        kakaoUserInfo,
        }), 
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    } catch (error: any) {
      console.error('Firebase token creation failed:', error);
      return new NextResponse(
        JSON.stringify({ 
          error: '인증 토큰 생성에 실패했습니다.',
          details: error?.message || 'Firebase 토큰 생성 중 오류가 발생했습니다.'
        }), 
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }
  } catch (error: any) {
    console.error('카카오 인증 처리 중 오류 발생:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: '인증 처리 중 오류가 발생했습니다.',
        details: error?.message || '알 수 없는 오류가 발생했습니다.'
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
} 