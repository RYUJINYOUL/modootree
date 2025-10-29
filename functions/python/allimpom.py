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
from io import BytesIO

from google import genai
from google.genai import types
from flask import Flask, request, Response, jsonify, send_from_directory
from flask_cors import CORS
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    # ✨ 추가된 부분 ✨
    QuantizationConfig,
    ScalarQuantization,
    ScalarType,
    HnswConfig,
)

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False
    print("⚠️ Pillow가 설치되지 않았습니다.")

# Google Cloud Storage 지원
try:
    from google.cloud import storage as gcs
    HAS_GCS = True
except ImportError:
    HAS_GCS = False
    print("⚠️ Google Cloud Storage 라이브러리가 없습니다. 로컬 캐시 사용")

# ===== Qdrant 클라이언트 초기화 =====
qdrant_url = os.environ.get("QDRANT_URL", "http://localhost:6333")
qdrant_api_key = os.environ.get("QDRANT_API_KEY", None)

try:
    qdrant_client = QdrantClient(
        url=qdrant_url,
        api_key=qdrant_api_key,
        prefer_grpc=True,
    )
    print(f"✅ Qdrant 연결 성공: {qdrant_url}")   # 1. qdrant연결 성공
except Exception as e:
    print(f"⚠️ Qdrant 연결 실패: {e}")
    qdrant_client = None

QDRANT_COLLECTION_NAME = "search_results"
VECTOR_SIZE = 768

app = Flask(__name__)
CORS(app, resources={                                         # 2. cors설정
    r"/*": {
        "origins": ["http://localhost:3000", "https://*"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "expose_headers": ["Content-Type"],
        "supports_credentials": False,
        "max_age": 3600
    }
})

# ===== 환경 변수 =====
SERPER_KEY = os.environ.get("SERPER_KEY")
NAVER_ID = os.environ.get("NAVER_CLIENT_ID")
NAVER_SECRET = os.environ.get("NAVER_CLIENT_SECRET")
GEMINI_KEY = os.environ.get("GEMINI_API_KEY")
GCS_BUCKET_NAME = os.environ.get("GCS_BUCKET_NAME")  # 선택사항
USE_GCS = HAS_GCS and GCS_BUCKET_NAME is not None

gcs_client = None                                            # 3. 캐쉬 연결
if USE_GCS:
    try:
        gcs_client = gcs.Client()
        bucket = gcs_client.bucket(GCS_BUCKET_NAME)
        print(f"✅ Google Cloud Storage 연결 성공: {GCS_BUCKET_NAME}")
    except Exception as e:
        print(f"⚠️ GCS 연결 실패: {e}, 로컬 캐시 사용")
        USE_GCS = False

client = None
if GEMINI_KEY:
    try:
        client = genai.Client(api_key=GEMINI_KEY)
    except Exception as e:
        print(f"❌ Gemini Client 초기화 실패: {e}")

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

CATEGORY_SCHEMAS = {                                # 4. 동적 스키마 설정
    SearchCategory.GENERAL: {
        "fields": [
            {"name": "name", "type": "string", "required": True},
            {"name": "category", "type": "string", "required": True},
            {"name": "summary", "type": "string", "required": True},
            {"name": "imageUrl", "type": "string", "required": False},
            {"name": "source", "type": "string", "required": True},
            {"name": "sourceURL", "type": "string", "required": True},
        ],
        "ranking": ["relevance"],
        "count": 10,
    },
    SearchCategory.RESTAURANT: {
        "fields": [
            {"name": "name", "type": "string", "required": True},
            {"name": "category", "type": "string", "required": True},
            {"name": "address", "type": "string", "required": False},
            {"name": "rating", "type": "string", "required": False},
            {"name": "price_range", "type": "string", "required": False},
            {"name": "menu", "type": "string", "required": False},
            {"name": "summary", "type": "string", "required": True},
            {"name": "imageUrl", "type": "string", "required": False},
            {"name": "source", "type": "string", "required": True},
            {"name": "sourceURL", "type": "string", "required": True},
        ],
        "ranking": ["rating", "relevance"],
        "count": 10,
    },
    SearchCategory.CAFE: {
        "fields": [
            {"name": "name", "type": "string", "required": True},
            {"name": "category", "type": "string", "required": True},
            {"name": "address", "type": "string", "required": False},
            {"name": "rating", "type": "string", "required": False},
            {"name": "menu", "type": "string", "required": False},
            {"name": "summary", "type": "string", "required": True},
            {"name": "imageUrl", "type": "string", "required": False},
            {"name": "source", "type": "string", "required": True},
            {"name": "sourceURL", "type": "string", "required": True},
        ],
        "ranking": ["rating", "relevance"],
        "count": 10,
    },
    SearchCategory.ACCOMMODATION: {
        "fields": [
            {"name": "name", "type": "string", "required": True},
            {"name": "category", "type": "string", "required": True},
            {"name": "address", "type": "string", "required": False},
            {"name": "rating", "type": "string", "required": False},
            {"name": "price_range", "type": "string", "required": True},
            {"name": "summary", "type": "string", "required": True},
            {"name": "imageUrl", "type": "string", "required": False},
            {"name": "source", "type": "string", "required": True},
            {"name": "sourceURL", "type": "string", "required": True},
        ],
        "ranking": ["rating", "price"],
        "count": 10,
    },
    SearchCategory.NEWS: {
        "fields": [
            {"name": "title", "type": "string", "required": True},
            {"name": "category", "type": "string", "required": True},
            {"name": "summary", "type": "string", "required": True},
            {"name": "published_date", "type": "string", "required": False},
            {"name": "imageUrl", "type": "string", "required": False},
            {"name": "source", "type": "string", "required": True},
            {"name": "sourceURL", "type": "string", "required": True},
        ],
        "ranking": ["recency", "relevance"],
        "count": 10,
    },
}

# ===== 이미지 캐시 (GCS 지원) =====                                     5. 이미지 클래스 저장 만듬
class ImageCache:
    def __init__(self, cache_dir="./image_cache", use_gcs=False, gcs_client=None, bucket_name=None):
        self.use_gcs = use_gcs
        self.gcs_client = gcs_client
        self.bucket_name = bucket_name
        self.cache_dir = cache_dir
        
        if not self.use_gcs:
            os.makedirs(cache_dir, exist_ok=True)
    
    def get_hash(self, name: str, source_url: str = "") -> str:
        combined = f"{name}_{source_url}"
        return hashlib.md5(combined.encode()).hexdigest()
    
    def get_path(self, hash_val: str) -> str:
        return os.path.join(self.cache_dir, f"{hash_val}.jpg")
    
    def exists(self, hash_val: str) -> bool:
        if self.use_gcs:
            try:
                blob = self.gcs_client.bucket(self.bucket_name).blob(f"images/{hash_val}.jpg")
                return blob.exists()
            except Exception as e:
                print(f"⚠️ GCS exists 확인 실패: {e}")
                return False
        else:
            return os.path.exists(self.get_path(hash_val))
    
    def get_url(self, hash_val: str, full_url: bool = True) -> Optional[str]:
        if self.exists(hash_val):
            if self.use_gcs:
                # base_url = os.environ.get("BASE_URL", "https://storage.googleapis.com")
                return f"https://storage.googleapis.com/{self.bucket_name}/images/{hash_val}.jpg"
            else:
                if full_url:
                    base_url = os.environ.get("BASE_URL", "https://allimpom-run-service.run.app")
                    return f"{base_url}/images/{hash_val}.jpg"
                return f"/images/{hash_val}.jpg"
        return None
    
    def save(self, hash_val: str, image_url: str) -> Optional[str]:
        try:
            resp = requests.get(image_url, timeout=5)
            resp.raise_for_status()
            
            if HAS_PIL:
                img = Image.open(BytesIO(resp.content))
                img.thumbnail((400, 400))
                img_bytes = BytesIO()
                img.save(img_bytes, "JPEG", quality=85, optimize=True)
                image_data = img_bytes.getvalue()
            else:
                image_data = resp.content
            
            if self.use_gcs:
                blob = self.gcs_client.bucket(self.bucket_name).blob(f"images/{hash_val}.jpg")
                blob.upload_from_string(image_data, content_type="image/jpeg")
                print(f"✅ GCS에 이미지 저장: {hash_val}")
            else:
                path = self.get_path(hash_val)
                with open(path, 'wb') as f:
                    f.write(image_data)
                print(f"✅ 로컬에 이미지 저장: {hash_val}")
            
            return self.get_url(hash_val, full_url=True)
        except Exception as e:
            print(f"⚠️ 이미지 저장 실패 ({hash_val}): {e}")
            return None
    
    def cleanup_old_cache(self, days=30):
        """30일 이상 된 캐시 삭제"""
        try:
            cutoff = datetime.now() - timedelta(days=days)
            
            if self.use_gcs:
                bucket = self.gcs_client.bucket(self.bucket_name)
                blobs = bucket.list_blobs(prefix="images/")
                
                for blob in blobs:
                    updated_time = blob.updated
                    if updated_time and updated_time.replace(tzinfo=None) < cutoff:
                        blob.delete()
                        print(f"🗑️ GCS에서 삭제: {blob.name}")
            else:
                if not os.path.exists(self.cache_dir):
                    return
                
                for f in os.listdir(self.cache_dir):
                    path = os.path.join(self.cache_dir, f)
                    if os.path.isfile(path) and os.path.getmtime(path) < cutoff.timestamp():
                        os.remove(path)
                        print(f"🗑️ 로컬에서 삭제: {f}")
        except Exception as e:
            print(f"⚠️ 캐시 정리 중 오류: {e}")

image_cache = ImageCache(use_gcs=USE_GCS, gcs_client=gcs_client, bucket_name=GCS_BUCKET_NAME)

# ===== Qdrant 관리 =====
class QdrantManager:                                                            # 6. qdrant 클래스 만듬
    def __init__(self, client, collection_name: str, vector_size: int):
        self.client = client
        self.collection_name = collection_name
        self.vector_size = vector_size
        self._init_collection()
    
    def _init_collection(self):
        """컬렉션 초기화 (없으면 생성)"""

        try:
            collection = self.client.get_collection(self.collection_name)
            print(f"✅ Qdrant 컬렉션 이미 존재: {self.collection_name}")
            print(f"   - 포인트 수: {collection.points_count}")
            return  

        except Exception: # 컬렉션이 없으면 예외 발생
            print(f"📝 Qdrant 컬렉션 생성: {self.collection_name}")


        try:
            print(f"  → 생성 중: {self.collection_name}")
            
            # ⭐ 핵심: Qdrant Cloud는 ScalarQuantization을 지원하지 않음
            # 간단한 설정만 사용
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=self.vector_size,
                    distance=Distance.COSINE
                )
                # quantization_config와 hnsw_config는 제거
            )
            
            print(f"✅ Qdrant 컬렉션 생성 완료: {self.collection_name}")
            print(f"   - 벡터 크기: {self.vector_size}")
            print(f"   - 거리 메트릭: COSINE")
        
        except Exception as create_err:
            print(f"❌ 컬렉션 생성 실패: {type(create_err).__name__}: {create_err}")
            raise RuntimeError(f"Qdrant 컬렉션 초기화 실패: {create_err}") from create_err
    
    def store_search(self, query: str, category: str, vector: List[float],    # 검색 과정이 끝난 후, 그 결과를 기록으로 남기기 위한 용도
                    recommendations: List[Dict], sources: List[Dict]):
        try:
            point_id = int(hashlib.md5(f"{query}_{datetime.now().timestamp()}".encode()).hexdigest(), 16) % (2**31)
            
            payload = {
                "query": query,
                "category": category,
                "timestamp": datetime.now().isoformat(),
                "recommendations_count": len(recommendations),
                "recommendation_names": [r.get("name", "") for r in recommendations[:5]],
                "sources_count": len(sources),
            }
            
            self.client.upsert(
                collection_name=self.collection_name,
                points=[
                    PointStruct(
                        id=point_id,
                        vector=vector,
                        payload=payload
                    )
                ]
            )
            print(f"✅ Qdrant 메타데이터 저장: {query} (ID: {point_id})")
        except Exception as e:
            print(f"⚠️ Qdrant 저장 실패: {e}")
    
    def search_similar(self, query_vector: List[float], limit: int = 3) -> List[Dict]:   # qdrant 검색 용도
        try:
            results = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                limit=limit,
                score_threshold=0.75
            )
            
            similar = []
            for hit in results:
                payload = hit.payload
                similar.append({
                    "score": hit.score,
                    "query": payload.get("query"),
                    "category": payload.get("category"),
                    "recommendation_count": payload.get("recommendations_count", 0),
                })
            
            print(f"✅ Qdrant 유사 검색: {len(similar)}개 발견")
            return similar
        except Exception as e:
            print(f"⚠️ Qdrant 검색 실패: {e}")
            return []

qdrant_manager = None
if qdrant_client:
    qdrant_manager = QdrantManager(qdrant_client, QDRANT_COLLECTION_NAME, VECTOR_SIZE)

def get_embedding(text: str) -> Optional[List[float]]:
    try:
        response = client.models.embed_content(
            model="text-embedding-004", # 사용하던 모델 그대로 유지
            contents=text,
            config=types.EmbedContentConfig(output_dimensionality=VECTOR_SIZE)
        )
        
        # 🎯 공식 문서 방식 적용: .embeddings 리스트의 첫 번째 요소를 추출
        if response.embeddings and len(response.embeddings) > 0:
            # 리스트의 첫 번째 요소(Embedding 객체)에서 .values를 가져옵니다.
            return response.embeddings[0].values
        
        raise ValueError("Embedding list is empty.")

    except Exception as e:
        print(f"⚠️ 임베딩 생성 실패: {type(e).__name__}: {e}")
        return None

def classify_query(query: str) -> Tuple[SearchCategory, str]:
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

def fetch_image_with_cache(name: str, category: SearchCategory, source_url: str = "") -> str:
    hash_val = image_cache.get_hash(name, source_url)
    
    cached_url = image_cache.get_url(hash_val, full_url=True)
    if cached_url:
        print(f"✅ [이미지 캐시 히트] {name}")
        return cached_url
    
    print(f"📥 [이미지 캐시 없음] {name} → NAVER 검색 시작")
    
    if NAVER_ID and NAVER_SECRET:
        try:
            resp = requests.get(
                "https://openapi.naver.com/v1/search/image",
                headers={
                    "X-Naver-Client-Id": NAVER_ID,
                    "X-Naver-Client-Secret": NAVER_SECRET,
                },
                params={
                    "query": f"{name} {category.value}",
                    "display": 1,
                    "sort": "sim",
                    "filter": "small"
                },
                timeout=3
            )
            
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("items", [])
                
                if items:
                    img_url = items[0].get("link")
                    saved_url = image_cache.save(hash_val, img_url)
                    
                    if saved_url:
                        print(f"💾 [이미지 캐시 저장] {name}")
                        return saved_url
                        
        except Exception as e:
            print(f"⚠️ [NAVER 이미지 검색 오류] {name}: {e}")
    
    print(f"🎨 [Placeholder 사용] {name}")
    seed = abs(hash(name)) % 1000
    return f"https://placehold.co/400x400/e0e0e0/666666?text={name[:2]}"

def generate_prompt(category: SearchCategory, query: str, results: List[Dict]) -> str:
    schema = CATEGORY_SCHEMAS.get(category, CATEGORY_SCHEMAS[SearchCategory.GENERAL])
    
    fields_desc = []
    for f in schema["fields"]:
        req = "필수" if f["required"] else "선택"
        fields_desc.append(f"- {f['name']} ({f['type']}): {req}")
    
    context = []
    for r in results[:12]:
        context.append({
            "title": r.get("title", ""),
            "snippet": r.get("snippet", "")[:150],
            "source": r.get("source", ""),
            "link": r.get("link", ""),
        })
    
    return f"""# 사용자 쿼리
{query}

# 카테고리
{category.value}

# 출력 형식
다음 JSON 스키마에 맞춰 **정확히 {schema['count']}개**의 결과를 배열로 반환하세요.

## 필드
{chr(10).join(fields_desc)}

## 랭킹 기준
{', '.join(schema['ranking'])} 순으로 상위 {schema['count']}개 선정

# 검색 결과
{json.dumps(context, ensure_ascii=False, indent=2)}

**중요:**
1. 오직 JSON 배열만 출력
2. 정확히 {schema['count']}개
3. 필수 필드 포함
4. 중복 제거
5. Summary: 종합적이고 객관적인 2~3문장 요약"""

def generate_system_instruction(category: SearchCategory) -> str:
    schema = CATEGORY_SCHEMAS.get(category, CATEGORY_SCHEMAS[SearchCategory.GENERAL])
    
    return f"""당신은 {category.value} 검색 전문 AI입니다.

규칙:
- 오직 유효한 JSON 배열만 출력
- 마크다운, 설명, 주석 금지
- {schema['ranking']} 기준으로 정렬
- 정확히 {schema['count']}개 생성"""

def clean_json_response(text: str) -> str:
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    match = re.search(r'\[.*\]', text, re.DOTALL)
    return match.group(0) if match else text

def sse_format(data: Dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

def generate_comprehensive_response(user_input: str, cleaned: List[Dict]) -> str:
    try:
        answer_prompt = f"""사용자 쿼리: {user_input}

요약 지침:
- 5-7개 문장으로 명확하고 간결하게 답변
- 핵심 정보 중심
- 일반 텍스트 형식

분석 정보:
{json.dumps([
    {"title": r.get("title", ""), "snippet": r.get("snippet", "")[:100]} 
    for r in cleaned[:5]
], ensure_ascii=False, indent=2)}

위 정보를 바탕으로 종합 답변을 제공하세요."""
        
        answer_response = client.models.generate_content(
            model="gemini-2.0-flash", 
            contents=answer_prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=300
            )
        )
        return answer_response.text.strip()
    
    except Exception as e:
        print(f"❌ 최종 답변 생성 실패: {e}")
        return "종합 답변을 생성하는 데 실패했습니다."

@app.route("/stream", methods=["POST", "OPTIONS"])
def stream_search():
    if request.method == "OPTIONS":
        response = Response()
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Access-Control-Max-Age"] = "3600"
        return response, 204

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
            yield sse_format({"stage": "qdrant_search", "status": "started"})
            
            use_cached_results = False
            if qdrant_manager:
                query_vector = get_embedding(user_input)
                if query_vector:
                    similar_results = qdrant_manager.search_similar(query_vector, limit=3)
                    
                    if similar_results and similar_results[0]["score"] > 0.82:
                        print(f"🎯 유사 검색 발견 (점수: {similar_results[0]['score']:.2f})")
                        use_cached_results = True
                        yield sse_format({
                            "stage": "qdrant_search",
                            "status": "found_similar",
                            "similar_query": similar_results[0]["query"],
                            "similarity_score": similar_results[0]["score"]
                        })
            
            yield sse_format({"stage": "qdrant_search", "status": "finished"})

            yield sse_format({"stage": "classify", "status": "started"})
            category, clean_query = classify_query(user_input)
            yield sse_format({
                "stage": "classify",
                "status": "finished",
                "category": category.value,
            })

            yield sse_format({"stage": "search", "status": "started"})
            
            with ThreadPoolExecutor(max_workers=2) as ex:
                naver_fut = ex.submit(fetch_api_data, "naver", clean_query)
                
                try:
                    naver_result = naver_fut.result(timeout=3)
                    raw = [naver_result]
                    print(f"✅ NAVER 검색 완료")
                except TimeoutError:
                    print(f"⏰ NAVER API 시간 초과")
                    raw = []
                
                if SERPER_KEY:
                    google_fut = ex.submit(fetch_api_data, "google", clean_query)
                    try:
                        google_result = google_fut.result(timeout=3)
                        raw.append(google_result)
                        print(f"✅ Google 검색 완료")
                    except TimeoutError:
                        print(f"⏰ Google API 시간 초과")
            
            yield sse_format({"stage": "search", "status": "finished"})

            yield sse_format({"stage": "filter", "status": "started"})
            cleaned = filter_search_results(raw)
            yield sse_format({"stage": "filter", "status": "finished", "count": len(cleaned)})

            yield sse_format({"stage": "synthesis", "status": "started"})
            
            prompt = generate_prompt(category, user_input, cleaned)
            system = generate_system_instruction(category)
            
            full_text = ""
            for chunk in client.models.generate_content_stream(
                model="gemini-2.0-flash",
                contents=[types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=prompt)]
                )],
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    response_mime_type="application/json",
                    temperature=0.2,
                    max_output_tokens=500
                ),
            ):
                if chunk.text:
                    full_text += chunk.text
            
            try:
                cleaned_json = clean_json_response(full_text)
                recommendations = json.loads(cleaned_json)
                
                if not isinstance(recommendations, list) or len(recommendations) == 0:
                    raise ValueError("빈 배열")
                
                print(f"✅ JSON 파싱 성공: {len(recommendations)}개")
                
            except Exception as e:
                print(f"❌ JSON 파싱 실패: {e}, 폴백 사용")
                recommendations = []
                for i, item in enumerate(cleaned[:5]):
                    recommendations.append({
                        "name": item.get("title", f"결과 {i+1}"),
                        "category": category.value,
                        "summary": item.get("snippet", ""),
                        "source": item.get("source", "unknown"),
                        "sourceURL": item.get("link", ""),
                        "imageUrl": "",
                    })
            
            yield sse_format({
                "stage": "synthesis",
                "status": "finished",
                "count": len(recommendations)
            })

            yield sse_format({"stage": "image_fetch", "status": "started"})
            
            for i, rec in enumerate(recommendations):
                name = rec.get("name") or rec.get("title", "")
                source_url = rec.get("sourceURL", "")
                
                rec["imageUrl"] = fetch_image_with_cache(name, category, source_url)
            
            yield sse_format({"stage": "image_fetch", "status": "finished"})

            if qdrant_manager and not use_cached_results:
                try:
                    query_vector = get_embedding(user_input)
                    if query_vector:
                        sources_data = [
                            {
                                "title": r.get("title", ""),
                                "snippet": r.get("snippet", "")[:100],
                                "link": r.get("link", ""),
                                "source": r.get("source", "")
                            }
                            for r in cleaned[:5]
                        ]
                        
                        qdrant_manager.store_search(
                            query=user_input,
                            category=category.value,
                            vector=query_vector,
                            recommendations=recommendations,
                            sources=sources_data
                        )
                        print(f"✅ Qdrant에 검색 결과 메타데이터 저장")
                except Exception as e:
                    print(f"⚠️ Qdrant 저장 중 오류: {e}")

            # 종합 답변 생성
            answer_summary = generate_comprehensive_response(user_input, cleaned)

            duration = round(time.time() - start, 2)
            yield sse_format({
                "stage": "complete",
                "status": "finished",
                "category": category.value,
                "duration_sec": duration,
                "recommendations": recommendations,
                "answer_summary": answer_summary,
                "from_cache": use_cached_results,
                "sources": [
                    {
                        "title": r.get("title", ""),
                        "snippet": r.get("snippet", "")[:100],
                        "link": r.get("link", ""),
                        "source": r.get("source", "")
                    }
                    for r in cleaned[:5]
                ]
            })

        except Exception as e:
            trace = traceback.format_exc()
            print(f"❌ 에러: {e}\n{trace}")
            yield sse_format({
                "stage": "error",
                "error": str(e),
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

@app.route("/images/<filename>")
def serve_image(filename):
    """로컬 이미지 서빙 (GCS 사용 시 불필요)"""
    if USE_GCS:
        return jsonify({"error": "GCS 사용 중, 이 엔드포인트는 필요 없습니다"}), 404
    return send_from_directory(image_cache.cache_dir, filename)

@app.route("/health", methods=["GET"])
def health_check():
    """서비스 상태 확인 - 모니터링 및 로드 밸런서용"""
    try:
        cache_info = {}
        
        if USE_GCS:
            try:
                bucket = gcs_client.bucket(GCS_BUCKET_NAME)
                blobs = list(bucket.list_blobs(prefix="images/"))
                cache_info["type"] = "gcs"
                cache_info["image_count"] = len(blobs)
                cache_info["status"] = "ok"
            except Exception as e:
                cache_info["type"] = "gcs"
                cache_info["status"] = "error"
                cache_info["error"] = str(e)
        else:
            if os.path.exists(image_cache.cache_dir):
                cache_info["type"] = "local"
                cache_info["image_count"] = len([f for f in os.listdir(image_cache.cache_dir) if f.endswith('.jpg')])
                cache_info["status"] = "ok"
            else:
                cache_info["type"] = "local"
                cache_info["status"] = "no_cache_dir"
        
        return jsonify({
            "status": "ok",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "gemini": client is not None,
                "qdrant": qdrant_manager is not None,
                "naver": NAVER_ID is not None,
                "gcs": USE_GCS,
            },
            "cache": cache_info,
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat(),
        }), 500

@app.route("/cleanup-cache", methods=["POST"])
def cleanup_cache():
    """수동으로 오래된 캐시 정리 (관리자용)"""
    try:
        days = request.get_json(silent=True).get("days", 30) if request.get_json(silent=True) else 30
        image_cache.cleanup_old_cache(days=days)
        
        return jsonify({
            "status": "success",
            "message": f"{days}일 이상 된 캐시를 정리했습니다.",
            "timestamp": datetime.now().isoformat(),
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e),
        }), 500

if __name__ == "__main__":
    print("🚀 AllimPom 서버 시작...")
    print(f"📁 이미지 저장소: {'GCS' if USE_GCS else '로컬'}")
    print(f"🔵 Qdrant: {'연결됨' if qdrant_manager else '연결 안 됨'}")
    
    # 시작 시 한 번 오래된 캐시 정리
    print("🧹 오래된 캐시 정리 중...")
    image_cache.cleanup_old_cache(days=30)
    
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8080)),
        debug=False,
        threaded=True
    )