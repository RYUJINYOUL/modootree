import axios from 'axios';

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

interface NaverSearchResult {
  title: string;
  link: string;
  description: string;
  bloggername?: string;
  postdate?: string;
  pubDate?: string;
}

interface SearchResults {
  news?: NaverSearchResult[];
  blog?: NaverSearchResult[];
  web?: NaverSearchResult[];
  error?: string;
}

async function searchNaver(query: string, type: 'news' | 'blog' | 'webkr' = 'news'): Promise<NaverSearchResult[]> {
  try {
    console.log('네이버 API 키 확인:', {
      hasClientId: !!NAVER_CLIENT_ID,
      hasClientSecret: !!NAVER_CLIENT_SECRET
    });
    
    if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
      throw new Error('네이버 API 키가 설정되지 않았습니다.');
    }
    
    console.log('네이버 검색 시도:', {
      type,
      query
    });

    const endpoint = `https://openapi.naver.com/v1/search/${type === 'webkr' ? 'webkr' : type}?query=${encodeURIComponent(query)}&display=2&sort=date`;
    
    const response = await axios.get(endpoint, {
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
      }
    });

    return response.data.items.map((item: any) => ({
      title: item.title.replace(/(<([^>]+)>)/gi, ''),  // HTML 태그 제거
      link: item.link,
      description: item.description.replace(/(<([^>]+)>)/gi, ''),  // HTML 태그 제거
      bloggername: item.bloggername,
      postdate: item.postdate,
      pubDate: item.pubDate,
    }));
  } catch (error) {
    console.error('네이버 검색 API 오류:', error);
    return [];
  }
}

export async function searchNaverContent(query: string): Promise<SearchResults> {
  try {
    const [newsResults, blogResults, webResults] = await Promise.all([
      searchNaver(query, 'news'),
      searchNaver(query, 'blog'),
      searchNaver(query, 'webkr')
    ]);

    return {
      news: newsResults,
      blog: blogResults,
      web: webResults
    };
  } catch (error) {
    return {
      error: '검색 중 오류가 발생했습니다.'
    };
  }
}
