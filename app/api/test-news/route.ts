import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

// 오늘 날짜의 주요 뉴스를 가져오는 함수
async function getTodayNews() {
  try {
    // 오늘 날짜 기준으로 검색
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    // 여러 분야의 뉴스를 가져오기
    const categories = [
      { query: '속보', display: 3 },
      { query: '이슈', display: 3 },
      { query: '핫이슈', display: 3 }
    ];

    const newsPromises = categories.map(category => 
      axios.get(`https://openapi.naver.com/v1/search/news.json`, {
        headers: {
          'X-Naver-Client-Id': NAVER_CLIENT_ID!,
          'X-Naver-Client-Secret': NAVER_CLIENT_SECRET!,
        },
        params: {
          query: `${category.query}`,
          display: category.display,
          sort: 'date'  // 최신순 정렬
        }
      })
    );

    const responses = await Promise.all(newsPromises);
    
    // 중복 제거 및 결과 병합
    const uniqueNews = new Map();
    
    responses.forEach(response => {
      response.data.items.forEach((item: any) => {
        // HTML 태그 제거 및 제목 정제
        const cleanTitle = item.title
          .replace(/(<([^>]+)>)/gi, '')  // HTML 태그 제거
          .replace(/&quot;/g, '"')       // 따옴표 변환
          .replace(/&amp;/g, '&')        // & 변환
          .trim();

        // URL을 키로 사용하여 중복 제거
        if (!uniqueNews.has(item.link)) {
          uniqueNews.set(item.link, {
            title: cleanTitle,
            description: item.description.replace(/(<([^>]+)>)/gi, '').trim(),
            link: item.link,
            pubDate: item.pubDate
          });
        }
      });
    });

    return Array.from(uniqueNews.values());

  } catch (error) {
    console.error('뉴스 검색 오류:', error);
    throw error;
  }
}

export async function GET(req: NextRequest) {
  try {
    const news = await getTodayNews();
    return NextResponse.json({
      success: true,
      news
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
















