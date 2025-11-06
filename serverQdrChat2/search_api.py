import requests
import json
import traceback
import time
import re
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError
from typing import Dict, List, Tuple, Optional
from enum import Enum

# Trafilatura for fast web scraping
try:
    import trafilatura
    HAS_TRAFILATURA = True
    print("✅ Trafilatura 로드 완료")
except ImportError:
    HAS_TRAFILATURA = False
    print("⚠️ Trafilatura가 설치되지 않았습니다. pip install trafilatura")

def clean_query(query: str) -> str:
    """
    쿼리에서 불필요한 태그 제거
    - [refresh:타임스탬프] 제거
    - 공백 정리
    """
    # [refresh:숫자] 패턴 제거
    cleaned = re.sub(r'\[refresh:\d+\]', '', query)
    # 연속된 공백을 하나로
    cleaned = re.sub(r'\s+', ' ', cleaned)
    # 앞뒤 공백 제거
    cleaned = cleaned.strip()
    
    if query != cleaned:
        print(f"🧹 쿼리 정제: '{query}' → '{cleaned}'")
    
    return cleaned

class SearchCategory(Enum):
    RESTAURANT = "restaurant"
    CAFE = "cafe"
    ACCOMMODATION = "accommodation"
    SHOPPING = "shopping"
    NEWS = "news"
    PRODUCT = "product"
    ACTIVITY = "activity"
    VIDEO = "video"
    MUSIC = "music"
    GENERAL = "general"

def classify_query(query: str) -> Tuple[SearchCategory, str]:
    """쿼리 분류 (검색 전용)"""
    # ✅ 1. 먼저 refresh 태그 제거
    clean_q = clean_query(query)
    q = clean_q.lower()
    
    if query != clean_q:
        print(f"[쿼리 정제] 원본: '{query}' → 정제됨: '{clean_q}'")
    
    # 검색 키워드 매칭 (확장된 범위)
    keywords = {
        SearchCategory.VIDEO: [
            "유튜브", "youtube", "영상", "동영상", "비디오", "video", "영화", "드라마", 
            "예능", "다큐", "리뷰", "튜토리얼", "강의", "클립", "쇼츠"
        ],
        SearchCategory.MUSIC: [
            "노래", "음악", "뮤직", "곡", "song", "music", "가수", "아티스트", 
            "앨범", "싱글", "차트", "멜론", "스포티파이", "플레이리스트"
        ],
        SearchCategory.RESTAURANT: [
            "맛집", "음식점", "레스토랑", "먹을곳", "식당", "요리", "음식", "메뉴",
            "한식", "중식", "일식", "양식", "분식", "치킨", "피자", "햄버거",
            "카페", "디저트", "베이커리", "빵집"
        ],
        SearchCategory.CAFE: [
            "카페", "커피", "디저트", "베이커리", "빵집", "스타벅스", "이디야",
            "투썸", "할리스", "커피빈", "라떼", "아메리카노", "케이크"
        ],
        SearchCategory.ACCOMMODATION: [
            "숙소", "호텔", "모텔", "펜션", "리조트", "게스트하우스", "에어비앤비",
            "민박", "콘도", "캠핑", "글램핑", "여관", "찜질방"
        ],
        SearchCategory.NEWS: [
            "뉴스", "기사", "소식", "보도", "언론", "신문", "방송", "뉴스룸",
            "속보", "헤드라인", "이슈", "사건", "정치", "경제", "사회", "문화"
        ],
        SearchCategory.SHOPPING: [
            "쇼핑", "구매", "온라인쇼핑", "쿠팡", "11번가", "지마켓", "옥션",
            "네이버쇼핑", "아마존", "이베이", "할인", "세일", "특가"
        ],
        SearchCategory.PRODUCT: [
            "제품", "상품", "추천", "리뷰", "후기", "평점", "가격", "비교",
            "스펙", "성능", "브랜드", "모델", "신제품", "베스트"
        ],
        SearchCategory.ACTIVITY: [
            "체험", "관광", "여행", "놀거리", "데이트", "나들이", "축제", "이벤트",
            "전시", "공연", "콘서트", "뮤지컬", "연극", "스포츠", "운동", "취미"
        ],
        SearchCategory.GENERAL: [
            # 일반적인 검색 의도를 나타내는 키워드들
            "정보", "자료", "데이터", "알아보기", "찾기", "검색", "조회",
            "확인", "문의", "질문", "답변", "해결", "방법", "가이드",
            "튜토리얼", "설명", "안내", "도움", "지원", "서비스"
        ]
    }
    
    for category, kws in keywords.items():
        if any(kw in q for kw in kws):
            # ✅ 추천/알려줘 등 제거
            final_clean = clean_q
            for word in ["추천", "알려줘", "찾아줘", "검색", "해줘"]:
                final_clean = final_clean.replace(word, "").strip()
            return category, final_clean
    
    return SearchCategory.GENERAL, clean_q

def fetch_api_data(source: str, query: str, naver_id: str = None, naver_secret: str = None, serper_key: str = None) -> Dict:
    """API 데이터 가져오기"""
    print(f"🔍 {source.upper()} 검색 시도: '{query}' (naver_id: {bool(naver_id)}, serper_key: {bool(serper_key)})")
    
    try:
        if source == "naver" and naver_id and naver_secret:
            print(f"📍 네이버 로컬 검색 실행: {query}")
            r = requests.get(
                "https://openapi.naver.com/v1/search/local.json",
                headers={
                    "X-Naver-Client-Id": naver_id,
                    "X-Naver-Client-Secret": naver_secret,
                },
                params={"query": query, "display": 10},
                timeout=5
            )
            r.raise_for_status()
            result = r.json()
            print(f"✅ 네이버 검색 성공: {len(result.get('items', []))}개 결과")
            return {"source": source, "data": result}
            
        elif source == "google" and serper_key:
            print(f"🌐 구글(Serper) 검색 실행: {query}")
            r = requests.post(
                "https://google.serper.dev/search",
                headers={"X-API-KEY": serper_key, "Content-Type": "application/json"},
                json={"q": query, "num": 10},
                timeout=5
            )
            r.raise_for_status()
            result = r.json()
            print(f"✅ 구글 검색 성공: {len(result.get('organic', []))}개 결과")
            return {"source": source, "data": result}
            
        elif source == "youtube":
            try:
                from youtube_search import YoutubeSearch
                results = YoutubeSearch(query, max_results=10).to_dict()
                return {"source": source, "data": {"videos": results}}
            except ImportError:
                print("⚠️ youtube-search 패키지가 설치되지 않았습니다")
                return {"source": source, "error": "youtube-search not installed"}
            
        else:
            return {"source": source, "error": "config not found"}
    
    except Exception as e:
        print(f"⚠️ {source.upper()} API 에러: {e}")
        return {"source": source, "error": str(e)}
    
    # 🔥 조건에 맞지 않는 경우 (네이버 키 없음, 구글 키 없음 등)
    print(f"⚠️ {source.upper()} 검색 조건 불충족: naver_id={bool(naver_id)}, serper_key={bool(serper_key)}")
    return {"source": source, "error": "API 키 또는 조건 불충족"}

def filter_search_results(raw_results: List[Dict]) -> List[Dict]:
    """검색 결과 필터링 및 링크 추출"""
    cleaned = []
    
    for result in raw_results:
        source = result.get("source")
        data = result.get("data", {})
        
        if source == "naver":
            items = data.get("items", [])
            for item in items[:5]:
                title = re.sub(r'<[^>]+>', '', item.get("title", ""))
                desc = re.sub(r'<[^>]+>', '', item.get("description", ""))
                
                cleaned.append({
                    "source": source,
                    "title": title,
                    "link": item.get("link", ""),
                    "snippet": desc,
                    "address": item.get("address", ""),
                })
        
        elif source == "google":
            items = data.get("organic", [])
            for item in items[:5]:
                cleaned.append({
                    "source": source,
                    "title": item.get("title", ""),
                    "link": item.get("link", ""),
                    "snippet": item.get("snippet", ""),
                })
        
        elif source == "youtube":
            videos = data.get("videos", [])
            for video in videos[:5]:
                cleaned.append({
                    "source": source,
                    "title": video.get("title", ""),
                    "link": f"https://www.youtube.com{video.get('url_suffix', '')}",
                    "snippet": f"{video.get('channel', '')} · {video.get('duration', '')} · {video.get('views', '')}",
                    "channel": video.get("channel", ""),
                    "duration": video.get("duration", ""),
                    "views": video.get("views", ""),
                    "thumbnail": f"https://i.ytimg.com/vi/{video.get('id', '')}/hqdefault.jpg" if video.get('id') else ""
                })
    
    return cleaned

def scrape_page(url: str, max_chars: int = 500) -> Dict:
    """단일 페이지 스크래핑 (Trafilatura 사용)"""
    if not HAS_TRAFILATURA:
        return {
            "url": url,
            "summary": "스크래핑 라이브러리가 없습니다.",
            "success": False
        }
    
    try:
        response = requests.get(url, timeout=5, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        response.raise_for_status()
        
        text = trafilatura.extract(
            response.text,
            include_comments=False,
            include_tables=False,
            no_fallback=False
        )
        
        if not text or len(text.strip()) < 50:
            return {
                "url": url,
                "summary": "내용을 추출할 수 없습니다.",
                "success": False
            }
        
        summary = text[:max_chars].strip()
        if len(text) > max_chars:
            summary += "..."
        
        return {
            "url": url,
            "summary": summary,
            "full_text": text[:1500],
            "success": True
        }
    
    except Exception as e:
        print(f"⚠️ 스크래핑 실패 ({url}): {e}")
        return {
            "url": url,
            "summary": f"페이지를 불러올 수 없습니다: {str(e)[:50]}",
            "success": False
        }

def scrape_multiple_pages(urls: List[str], max_workers: int = 5) -> List[Dict]:
    """병렬 페이지 스크래핑"""
    results = []
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_url = {
            executor.submit(scrape_page, url): url 
            for url in urls[:10]
        }
        
        for future in as_completed(future_to_url):
            url = future_to_url[future]
            try:
                result = future.result(timeout=7)
                results.append(result)
            except Exception as e:
                print(f"❌ 스크래핑 타임아웃: {url}")
                results.append({
                    "url": url,
                    "summary": "타임아웃",
                    "success": False
                })
    
    return results

def perform_search(query: str, genai_client, naver_id: str = None, naver_secret: str = None, serper_key: str = None) -> Dict:
    """통합 검색 수행"""
    try:
        # 1. 쿼리 분류 (classify_query 내부에서 clean_query 호출)
        category, final_query = classify_query(query)
        print(f"[검색] 카테고리: {category.value}, 쿼리: {final_query}")
        
        # 2. 검색 소스 선택
        search_sources = []
        if category in [SearchCategory.VIDEO, SearchCategory.MUSIC]:
            search_sources = ["youtube", "google"]
        else:
            # 🔥 네이버 우선, 구글 백업
            if naver_id and naver_secret:
                search_sources.append("naver")
            if serper_key:
                search_sources.append("google")
            
            # 둘 다 없으면 에러
            if not search_sources:
                return {
                    "success": False,
                    "error": "검색 API 키가 설정되지 않았습니다."
                }
        
        # 3. 병렬 검색 (우선순위: 네이버 → 구글)
        raw_results = []
        print(f"🚀 검색 소스: {search_sources}")
        
        with ThreadPoolExecutor(max_workers=3) as ex:
            futures = []
            
            # 🔥 네이버 우선 실행 (API 키 체크 강화)
            if "naver" in search_sources:
                if naver_id and naver_secret:
                    print(f"✅ 네이버 검색 큐에 추가: ID={naver_id[:4]}..., SECRET={bool(naver_secret)}")
                    futures.append(ex.submit(fetch_api_data, "naver", final_query, naver_id, naver_secret, None))
                else:
                    print(f"❌ 네이버 API 키 누락: ID={bool(naver_id)}, SECRET={bool(naver_secret)}")
            
            # 구글 실행
            if "google" in search_sources:
                if serper_key:
                    print(f"✅ 구글 검색 큐에 추가: KEY={serper_key[:10]}...")
                    futures.append(ex.submit(fetch_api_data, "google", final_query, None, None, serper_key))
                else:
                    print(f"❌ Serper API 키 누락")
            
            # 유튜브 실행
            if "youtube" in search_sources:
                print(f"✅ 유튜브 검색 큐에 추가")
                futures.append(ex.submit(fetch_api_data, "youtube", final_query, None, None, None))
            
            # 결과 수집
            for i, future in enumerate(futures):
                try:
                    result = future.result(timeout=10)  # 타임아웃 늘림
                    raw_results.append(result)
                    print(f"📦 검색 결과 {i+1}/{len(futures)} 수집: {result.get('source', 'unknown')}")
                except TimeoutError:
                    print(f"⏰ 검색 {i+1} API 타임아웃")
                except Exception as e:
                    print(f"❌ 검색 {i+1} 예외: {e}")
        
        # 4. 결과 필터링
        print(f"📦 raw_results: {json.dumps(raw_results, ensure_ascii=False, indent=2)}")
        cleaned = filter_search_results(raw_results)
        print(f"✅ cleaned 결과: {len(cleaned)}개")
        
        if not cleaned:
            print(f"❌ 검색 결과 없음. raw_results 상세:")
            for r in raw_results:
                print(f"  - source: {r.get('source')}, error: {r.get('error')}, data keys: {list(r.get('data', {}).keys())}")
            
            return {
                "success": False,
                "error": "검색 결과가 없습니다.",
                "debug_info": {
                    "raw_count": len(raw_results),
                    "raw_sources": [r.get('source') for r in raw_results],
                    "errors": [r.get('error') for r in raw_results if r.get('error')]
                }
            }
        
        # 5. 페이지 스크래핑
        scraped_data = []
        if HAS_TRAFILATURA:
            links = [item["link"] for item in cleaned if item.get("link")]
            scraped_data = scrape_multiple_pages(links, max_workers=5)
        
        # 6. LLM 요약
        context_data = []
        for item in scraped_data:
            if item["success"]:
                context_data.append({
                    "url": item["url"],
                    "content": item["full_text"]
                })
        
        for item in cleaned[:10]:
            context_data.append({
                "title": item.get("title", ""),
                "snippet": item.get("snippet", ""),
                "url": item.get("link", "")
            })
        
        prompt = f"""사용자 쿼리: {query}

다음 정보를 바탕으로 종합적이고 명확한 답변을 생성하세요:

{json.dumps(context_data[:10], ensure_ascii=False, indent=2)}

답변 형식:
- 5~7개 문장으로 구성
- 핵심 정보 중심으로 요약
- 자연스러운 한국어
- 구체적인 정보 포함 (주소, 가격, 평점 등)"""
        
        # LLM 호출
        import google.generativeai as genai
        model = genai.GenerativeModel(
            model_name='gemini-2.0-flash',
            generation_config={
                "temperature": 0.3,
                "max_output_tokens": 600
            }
        )
        
        response = model.generate_content(prompt)
        summary = response.text
        
        # 7. 결과 반환
        return {
            "success": True,
            "summary": summary,
            "sources": [
                {
                    "title": item.get("title", ""),
                    "snippet": item.get("snippet", "")[:150],
                    "link": item.get("link", ""),
                    "source": item.get("source", "")
                }
                for item in cleaned[:10]
            ],
            "category": category.value
        }
        
    except Exception as e:
        print(f"❌ 검색 오류: {e}")
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }

