import { NextRequest, NextResponse } from 'next/server';
import { searchNaverContent } from '@/src/lib/naver-search';

export async function GET(req: NextRequest) {
  try {
    const searchQuery = req.nextUrl.searchParams.get('q') || '모두트리';
    const results = await searchNaverContent(searchQuery);
    
    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('네이버 검색 테스트 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    }, { status: 500 });
  }
}

















