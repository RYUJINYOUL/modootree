import requests
import json
import os
import traceback
import time
import re
import hashlib
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError
from typing import Dict, List, Tuple, Optional
from enum import Enum
from datetime import datetime, timedelta

from google import genai
from google.genai import types
from flask import Flask, request, Response, jsonify
from flask_cors import CORS

# Trafilatura for fast web scraping
try:
    import trafilatura
    HAS_TRAFILATURA = True
    print("✅ Trafilatura 로드 완료")
except ImportError:
    HAS_TRAFILATURA = False
    print("⚠️ Trafilatura가 설치되지 않았습니다. pip install trafilatura")

app = Flask(__name__)

# CORS 설정 (모든 출처 허용)
CORS(app, 
     resources={r"/*": {"origins": "*"}},
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "OPTIONS"],
     expose_headers=["Content-Type"],
     max_age=3600)

# ===== 환경 변수 =====
SERPER_KEY = os.environ.get("SERPER_KEY")
NAVER_ID = os.environ.get("NAVER_CLIENT_ID")
NAVER_SECRET = os.environ.get("NAVER_CLIENT_SECRET")
GEMINI_KEY = os.environ.get("GEMINI_API_KEY")

client = None
if GEMINI_KEY:
    try:
        client = genai.Client(api_key=GEMINI_KEY)
        print("✅ Gemini Client 초기화 완료")
    except Exception as e:
        print(f"❌ Gemini Client 초기화 실패: {e}")
        # 계속 진행 (앱은 시작해야 함)
else:
    print("⚠️ GEMINI_API_KEY 환경 변수가 설정되지 않았습니다")

SEARCH_CONFIG = {
    "naver": {
        "url": "https://openapi.naver.com/v1/search/local.json",
        "headers": {
            "X-Naver-Client-Id": NAVER_ID,
            "X-Naver-Client-Secret": NAVER_SECRET,
        },
    },
    "google": {
        "url": "https://google.serper.dev/search",
        "headers": {"X-API-KEY": SERPER_KEY, "Content-Type": "application/json"},
    },
}

class SearchCategory(Enum):
    RESTAURANT = "restaurant"
    CAFE = "cafe"
    ACCOMMODATION = "accommodation"
    SHOPPING = "shopping"
    NEWS = "news"
    PRODUCT = "product"
    ACTIVITY = "activity"
    GENERAL = "general"

def classify_query(query: str) -> Tuple[SearchCategory, str]:
    """쿼리 분류"""
    q = query.lower()
    keywords = {
        SearchCategory.RESTAURANT: ["맛집", "음식점", "레스토랑", "먹을곳", "식당"],
        SearchCategory.CAFE: ["카페", "커피", "디저트", "베이커리"],
        SearchCategory.ACCOMMODATION: ["숙소", "호텔", "모텔", "펜션", "리조트"],
        SearchCategory.NEWS: ["뉴스", "기사", "소식"],
        SearchCategory.SHOPPING: ["쇼핑", "구매"],
        SearchCategory.PRODUCT: ["제품", "상품", "추천"],
        SearchCategory.ACTIVITY: ["체험", "관광", "여행"],
    }
    
    for category, kws in keywords.items():
        if any(kw in q for kw in kws):
            clean = query
            for word in ["추천", "알려줘", "찾아줘", "검색", "해줘"]:
                clean = clean.replace(word, "").strip()
            return category, clean
    
    return SearchCategory.GENERAL, query

def fetch_api_data(source: str, query: str) -> Dict:
    """API 데이터 가져오기"""
    config = SEARCH_CONFIG.get(source)
    if not config:
        return {"source": source, "error": "config not found"}
    
    try:
        if source == "naver":
            r = requests.get(
                config["url"],
                headers=config["headers"],
                params={"query": query, "display": 10},
                timeout=5
            )
        elif source == "google":
            r = requests.post(
                config["url"],
                headers=config["headers"],
                json={"q": query, "num": 10},
                timeout=5
            )
        else:
            return {"source": source, "error": "unknown"}
        
        r.raise_for_status()
        return {"source": source, "data": r.json()}
    
    except Exception as e:
        print(f"⚠️ {source} API 에러: {e}")
        return {"source": source, "error": str(e)}

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
        # HTML 가져오기
        response = requests.get(url, timeout=5, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        response.raise_for_status()
        
        # Trafilatura로 본문 추출
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
        
        # 요약
        summary = text[:max_chars].strip()
        if len(text) > max_chars:
            summary += "..."
        
        return {
            "url": url,
            "summary": summary,
            "full_text": text[:1500],  # LLM에 보낼 전체 텍스트
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
            for url in urls[:10]  # 최대 10개
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

def sse_format(data: Dict) -> str:
    """SSE 형식으로 변환"""
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

@app.route("/stream", methods=["POST", "OPTIONS"])
def stream_search():
    """최적화된 스트리밍 검색"""
    # OPTIONS 요청 처리 (CORS preflight)
    if request.method == "OPTIONS":
        print("📨 OPTIONS 요청 수신")
        response = Response("", status=200)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Max-Age"] = "3600"
        return response

    print(f"📨 POST 요청 수신")
    req = request.get_json(silent=True) or {}
    user_input = req.get("query", "").strip()
    
    if not user_input:
        return Response(
            sse_format({"error": "query 필수"}),
            mimetype="text/event-stream"
        )

    def generate():
        start = time.time()
        
        try:
            # ===== 1️⃣ 쿼리 분류 =====
            yield sse_format({
                "stage": "classify",
                "status": "started",
                "message": "🔍 검색 준비 중..."
            })
            
            category, clean_query = classify_query(user_input)
            
            yield sse_format({
                "stage": "classify",
                "status": "finished",
                "category": category.value,
                "message": f"📂 카테고리: {category.value}"
            })

            # ===== 2️⃣ 검색 API (병렬) =====
            yield sse_format({
                "stage": "search",
                "status": "started",
                "message": "🔍 검색 중...",
                "progress": 10
            })
            
            raw_results = []
            with ThreadPoolExecutor(max_workers=2) as ex:
                naver_fut = ex.submit(fetch_api_data, "naver", clean_query)
                
                try:
                    naver_result = naver_fut.result(timeout=3)
                    raw_results.append(naver_result)
                    print(f"✅ NAVER 검색 완료")
                except TimeoutError:
                    print(f"⏰ NAVER API 시간 초과")
                
                if SERPER_KEY:
                    google_fut = ex.submit(fetch_api_data, "google", clean_query)
                    try:
                        google_result = google_fut.result(timeout=3)
                        raw_results.append(google_result)
                        print(f"✅ Google 검색 완료")
                    except TimeoutError:
                        print(f"⏰ Google API 시간 초과")
            
            yield sse_format({
                "stage": "search",
                "status": "finished",
                "message": "✅ 검색 완료",
                "progress": 25
            })

            # ===== 3️⃣ 결과 필터링 =====
            cleaned = filter_search_results(raw_results)
            
            if not cleaned:
                yield sse_format({
                    "stage": "error",
                    "error": "검색 결과가 없습니다."
                })
                return
            
            yield sse_format({
                "stage": "filter",
                "status": "finished",
                "count": len(cleaned),
                "message": f"📋 {len(cleaned)}개 결과 발견",
                "progress": 30
            })

            # ===== 4️⃣ 페이지 스크래핑 (병렬) =====
            if HAS_TRAFILATURA:
                yield sse_format({
                    "stage": "scrape",
                    "status": "started",
                    "message": "📄 페이지 분석 중...",
                    "progress": 35
                })
                
                # 링크 추출
                links = [item["link"] for item in cleaned if item.get("link")]
                
                # 병렬 스크래핑
                scraped_data = scrape_multiple_pages(links, max_workers=5)
                
                success_count = sum(1 for s in scraped_data if s["success"])
                
                yield sse_format({
                    "stage": "scrape",
                    "status": "finished",
                    "count": success_count,
                    "total": len(scraped_data),
                    "message": f"✅ {success_count}/{len(scraped_data)}개 페이지 분석 완료",
                    "progress": 60
                })
            else:
                scraped_data = []
                yield sse_format({
                    "stage": "scrape",
                    "status": "skipped",
                    "message": "⚠️ 스크래핑 라이브러리 없음",
                    "progress": 60
                })

            # ===== 5️⃣ LLM 요약 (스트리밍) =====
            yield sse_format({
                "stage": "synthesis",
                "status": "started",
                "message": "✨ 답변 생성 중...",
                "progress": 65
            })
            
            # 프롬프트 구성
            context_data = []
            
            # 스크래핑 성공한 데이터 우선
            for item in scraped_data:
                if item["success"]:
                    context_data.append({
                        "url": item["url"],
                        "content": item["full_text"]
                    })
            
            # snippet도 추가 (스크래핑 실패 시 폴백)
            for item in cleaned[:10]:
                context_data.append({
                    "title": item.get("title", ""),
                    "snippet": item.get("snippet", ""),
                    "url": item.get("link", "")
                })
            
            prompt = f"""사용자 쿼리: {user_input}

다음 정보를 바탕으로 종합적이고 명확한 답변을 생성하세요:

{json.dumps(context_data[:10], ensure_ascii=False, indent=2)}

답변 형식:
- 5~7개 문장으로 구성
- 핵심 정보 중심으로 요약
- 자연스러운 한국어
- 구체적인 정보 포함 (주소, 가격, 평점 등)"""
            
            # 🔥 스트리밍 LLM 응답
            full_answer = ""
            chunk_count = 0
            
            for chunk in client.models.generate_content_stream(
                model="gemini-2.0-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.3,
                    max_output_tokens=600
                )
            ):
                if chunk.text:
                    full_answer += chunk.text
                    chunk_count += 1
                    
                    # 실시간 청크 전송
                    yield sse_format({
                        "stage": "synthesis",
                        "status": "streaming",
                        "chunk": chunk.text,
                        "partial_answer": full_answer,
                        "progress": min(65 + (chunk_count * 2), 95)
                    })
            
            yield sse_format({
                "stage": "synthesis",
                "status": "finished",
                "message": "✅ 답변 생성 완료",
                "progress": 100
            })

            # ===== 6️⃣ 완료 =====
            duration = round(time.time() - start, 2)
            
            yield sse_format({
                "stage": "complete",
                "status": "finished",
                "category": category.value,
                "duration_sec": duration,
                "answer_summary": full_answer,
                "sources": [
                    {
                        "title": item.get("title", ""),
                        "snippet": item.get("snippet", "")[:150],
                        "link": item.get("link", ""),
                        "source": item.get("source", "")
                    }
                    for item in cleaned[:10]
                ],
                "scraped_count": success_count if HAS_TRAFILATURA else 0,
                "message": f"✅ 완료 ({duration}초)"
            })

        except Exception as e:
            trace = traceback.format_exc()
            print(f"❌ 에러: {e}\n{trace}")
            yield sse_format({
                "stage": "error",
                "error": str(e),
                "message": f"❌ 오류 발생: {str(e)[:100]}"
            })

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )

@app.route("/health", methods=["GET"])
def health_check():
    """서비스 상태 확인"""
    return jsonify({
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "gemini": client is not None,
            "naver": NAVER_ID is not None,
            "serper": SERPER_KEY is not None,
            "trafilatura": HAS_TRAFILATURA,
        },
    }), 200

# 앱 시작 시 정보 출력
print("🚀 최적화된 AllimPom 서버 초기화...")
print(f"✅ Gemini: {'연결됨' if client else '연결 안 됨'}")
print(f"✅ NAVER: {'연결됨' if NAVER_ID else '연결 안 됨'}")
print(f"✅ Trafilatura: {'활성화' if HAS_TRAFILATURA else '비활성화'}")
print(f"📍 등록된 라우트:")
for rule in app.url_map.iter_rules():
    print(f"  - {rule.rule} [{', '.join(rule.methods)}]")

if __name__ == "__main__":
    print("🚀 Flask 개발 서버로 실행...")
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8080)),
        debug=False,
        threaded=True
    )
