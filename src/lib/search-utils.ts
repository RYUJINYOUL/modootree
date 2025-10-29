// 검색에서 제외할 키워드
export const EXCLUDED_KEYWORDS = [
  // 일반 인사말
  '안녕', '반가워', '모두트리', '하이', '헬로', '반갑', '굿', '땡큐', '감사',
  
  // 메모/일기 관련
  '메모', '일기', '저장', '기록', '작성', '써줘', '적어줘', '등록', '보관',
  
  // 감정/상담 관련
  '기분', '감정', '상담', '위로', '힘들', '슬픔', '우울', '행복',
  
  // 요청/응답 관련 (단독으로 사용된 경우만)
  '가능', '할 수', '오케이', '그래', '응',
  
  // 기타 일반 대화
  '응', '네', '어', '음', '그래', '아니', '괜찮', '좋아요', '싫어요',
  
  // 대화 종료
  '잘가', '바이', '끝', '종료', '그만', '중지'
];

// 검색이 필요한 키워드
export const SEARCH_CATEGORIES = {
  // 시간성 정보 (최신성이 중요한 정보)
  현재: ['날씨', '기온', '미세먼지', '강수', '기상', '예보', '오늘', '내일', '주말'],
  뉴스: ['뉴스', '속보', '사건', '사고', '발표', '출시', '신제품', '새로운', '발생'],
  트렌드: ['핫', '인기', '화제', '유행', '최근', '요즘', '이슈', '트렌드', '뜨는', '급상승'],
  
  // 지역성 정보 (장소 기반 정보)
  장소: ['맛집', '카페', '식당', '레스토랑', '가게', '매장', '음식점', '주차', '위치'],
  여행: ['여행', '관광', '명소', '축제', '볼거리', '가볼만한', '투어', '방문', '숙소'],
  교통: ['버스', '지하철', '택시', '열차', '항공', '노선', '시간표', '배차', '환승'],
  
  // 상품/서비스 정보
  쇼핑: ['상품', '제품', '가격', '구매', '할인', '세일', '최저가', '구입', '사려고'],
  리뷰: ['후기', '리뷰', '평가', '비교', '추천', '장단점', '사용기', '괜찮', '어때'],
  
  // 방법/해결 정보
  방법: ['방법', '어떻게', '하는법', '만드는', '사용법', '팁', '노하우', '하면', '해서'],
  해결: ['고장', '문제', '해결', '대처', '조치', '수리', '대안', '안되', '에러'],
  
  // 일반 질문
  정보: ['무엇', '언제', '어디', '누구', '왜', '얼마', '어느', '어떤', '몇']
};

// 검색이 필요한지 확인하는 함수
export function shouldPerformSearch(message: string): boolean {
  // 메시지를 소문자로 변환
  const lowerMessage = message.toLowerCase();
  
  // 최소 단어 수 체크 (2단어 이상)
  const words = message.trim().split(/\s+/);
  if (words.length < 2) {
    return false;
  }

  // 제외 키워드 체크 (단, 다른 의미있는 단어가 포함된 경우는 허용)
  const meaningfulWords = words.filter(word => 
    !EXCLUDED_KEYWORDS.includes(word) && 
    word.length > 1
  );
  
  if (meaningfulWords.length < 1) {
    return false;
  }

  // 검색 카테고리 키워드 체크
  const hasSearchKeyword = Object.values(SEARCH_CATEGORIES).some(
    keywords => keywords.some(keyword => lowerMessage.includes(keyword))
  );

  // 질문형 체크
  const isQuestion = message.includes('?') || 
                    message.includes('어떻게') || 
                    message.includes('어디') || 
                    message.includes('언제') || 
                    message.includes('무엇') || 
                    message.includes('누구') ||
                    message.includes('왜') ||
                    message.includes('얼마');

  // 검색 카테고리 키워드가 있거나 질문형이면 검색 수행
  return hasSearchKeyword || isQuestion;
}

// 검색 쿼리 정제 함수
export function cleanSearchQuery(message: string): string {
  return message
    .replace(/[?!.,]/g, '') // 특수문자 제거
    .split(' ')
    .slice(0, 10)          // 최대 10단어까지만 사용
    .join(' ')
    .trim();
}
