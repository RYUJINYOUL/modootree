import os
import json
import re
import time
import traceback
from datetime import date, datetime, timedelta, timezone
from typing import TypedDict, List, Literal, Optional
from collections import OrderedDict
from threading import Lock

import uvicorn
import google.generativeai as genai
import firebase_admin
from firebase_admin import credentials, auth, firestore
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from flask import Flask, request, Response, jsonify
from flask_cors import CORS

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from fag_data import FAQ_DATA

# ===== 메모리 캐시 (TTL: 3시간) =====
class MemoryCache:
    """Thread-safe 메모리 캐시 (TTL 지원)"""
    def __init__(self, ttl_seconds: int = 10800, max_size: int = 1000):
        self.cache: OrderedDict = OrderedDict()
        self.ttl = ttl_seconds  # 기본 3시간 (10800초)
        self.max_size = max_size
        self.lock = Lock()
    
    def _generate_key(self, query: str) -> str:
        """쿼리를 정규화하여 캐시 키 생성"""
        return query.strip().lower()
    
    def get(self, query: str) -> Optional[dict]:
        """캐시에서 결과 가져오기"""
        key = self._generate_key(query)
        with self.lock:
            if key in self.cache:
                cached_data = self.cache[key]
                # TTL 체크
                if time.time() - cached_data["timestamp"] < self.ttl:
                    # LRU: 최근 사용한 항목을 맨 뒤로 이동
                    self.cache.move_to_end(key)
                    print(f"💾 캐시 히트: '{query}' (만료까지 {self.ttl - (time.time() - cached_data['timestamp']):.0f}초)")
                    return cached_data["data"]
            else:
                    # 만료된 캐시 삭제
                    print(f"⏰ 캐시 만료: '{query}'")
                    del self.cache[key]
        return None
    
    def set(self, query: str, data: dict):
        """캐시에 결과 저장"""
        key = self._generate_key(query)
        with self.lock:
            # 최대 크기 체크 (LRU: 가장 오래된 항목 삭제)
            if len(self.cache) >= self.max_size:
                oldest_key = next(iter(self.cache))
                del self.cache[oldest_key]
                print(f"🗑️ 캐시 용량 초과: '{oldest_key}' 삭제")
            
            self.cache[key] = {
                "data": data,
                "timestamp": time.time()
            }
            print(f"💾 캐시 저장: '{query}' (총 {len(self.cache)}개)")
    
    def clear(self):
        """캐시 전체 삭제"""
        with self.lock:
            self.cache.clear()
            print("🗑️ 캐시 전체 삭제")
    
    def get_stats(self) -> dict:
        """캐시 통계"""
        with self.lock:
            total = len(self.cache)
            expired = sum(
                1 for item in self.cache.values() 
                if time.time() - item["timestamp"] >= self.ttl
            )
            return {
                "total": total,
                "valid": total - expired,
                "expired": expired,
                "ttl_hours": self.ttl / 3600
            }

# 글로벌 캐시 인스턴스 (TTL: 3시간, 최대 1000개 쿼리)
memory_cache = MemoryCache(ttl_seconds=10800, max_size=1000)

# --- 상수 및 환경 변수 설정 ---

cred_path = "serviceAccountKey.json"
cred_json_str = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON')
DAILY_CHAT_LIMIT = 200

if os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
    print("✅ 로컬 서비스 계정 파일로 Firebase 초기화")
elif cred_json_str:
    try:
        cred_json = json.loads(cred_json_str)
        cred = credentials.Certificate(cred_json)
        print("✅ 환경 변수(JSON)로 Firebase 초기화")
    except Exception as e:
        print(f"❌ Firebase 인증서 로드 실패: {e}")
        cred = None
else:
    # 개별 환경 변수로 Firebase 초기화 시도
    project_id = os.environ.get('FIREBASE_PROJECT_ID')
    client_email = os.environ.get('FIREBASE_CLIENT_EMAIL')
    private_key_base64 = os.environ.get('FIREBASE_PRIVATE_KEY_BASE64')
    
    if project_id and client_email and private_key_base64:
        try:
            import base64
            private_key = base64.b64decode(private_key_base64).decode('utf-8')
            
            cred_dict = {
                "type": "service_account",
                "project_id": project_id,
                "client_email": client_email,
                "private_key": private_key,
                "private_key_id": "",
                "client_id": "",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
            }
            
            cred = credentials.Certificate(cred_dict)
            print("✅ 개별 환경 변수로 Firebase 초기화")
        except Exception as e:
            print(f"❌ Firebase 개별 환경 변수 로드 실패: {e}")
            cred = None
    else:
        print("⚠️ Firebase 서비스 계정 환경 변수 미설정.")
        cred = None

if cred:
    firebase_admin.initialize_app(cred)
    db = firestore.client()
else:
    db = None

GOOGLE_AI_KEY = os.getenv('GOOGLE_AI_KEY')
if not GOOGLE_AI_KEY:
    print("⚠️ GOOGLE_AI_KEY 환경 변수가 설정되지 않았습니다.")
genai.configure(api_key=GOOGLE_AI_KEY)

# --- 유틸리티 함수 ---

def verify_firebase_token(id_token: str) -> dict:
    """Firebase ID 토큰 검증"""
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        print(f"❌ Firebase 토큰 검증 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="유효하지 않거나 만료된 인증 토큰입니다."
        )

async def check_and_update_chat_limit(uid: str) -> dict:
    """일일 채팅 한도 확인 및 업데이트"""
    if not db:
        return {"canChat": True, "remainingChats": DAILY_CHAT_LIMIT}

    today = date.today().isoformat()
    limit_ref = db.collection('users').document(uid).collection('limits').document(today)
    
    @firestore.transactional
    def update_in_transaction(transaction):
        doc = limit_ref.get(transaction=transaction)
        
        if doc.exists:
            data = doc.to_dict()
            count = data.get('count', 0)
            
            if count >= DAILY_CHAT_LIMIT:
                return {"canChat": False, "remainingChats": 0}
            
            new_count = count + 1
            transaction.set(limit_ref, {'count': new_count, 'last_chat': datetime.now(timezone.utc)}, merge=True)
            return {"canChat": True, "remainingChats": DAILY_CHAT_LIMIT - new_count}
        else:
            new_count = 1
            transaction.set(limit_ref, {'count': new_count, 'created_at': datetime.now(timezone.utc), 'last_chat': datetime.now(timezone.utc)})
            return {"canChat": True, "remainingChats": DAILY_CHAT_LIMIT - new_count}

    try:
        return update_in_transaction(db.transaction())
    except Exception as e:
        print(f"Error checking chat limit: {e}")
        return {"canChat": False, "remainingChats": 0}



def save_chat_to_firestore(uid: str, message: dict, db: firestore.client) -> bool:
    """
    대화 메시지를 dailyChats 컬렉션에 저장 (AI 위로 채팅과 동일한 구조)
    구조: collections/dailyChats/documents/{날짜}_{uid}
    """
    if not db:
        print("❌ Firestore 클라이언트가 초기화되지 않았습니다.")
        return False
        
    try:
        from datetime import date
        today = date.today().isoformat()  # YYYY-MM-DD
        doc_id = f"{today}_{uid}"
        
        chat_ref = db.collection('dailyChats').document(doc_id)
        
        # 문서 존재 확인
        doc = chat_ref.get()
        
        if doc.exists:
            # 기존 문서에 메시지 추가
            data = doc.to_dict()
            existing_messages = data.get('messages', [])
            existing_messages.append(message)
            
            chat_ref.update({
                'messages': existing_messages,
                'lastUpdated': datetime.now(timezone.utc)
            })
            print(f"✅ 기존 대화에 메시지 추가: {uid}")
        else:
            # 새 문서 생성
            chat_ref.set({
                'userId': uid,
                'dateKey': today,
                'messages': [message],
                'lastUpdated': datetime.now(timezone.utc)
            })
            print(f"✅ 새 대화 문서 생성: {uid}")
            
        return True
        
    except Exception as e:
        print(f"❌ 대화 저장 실패: {e}")
        return False


# --- 시스템 프롬프트 및 스키마 ---

SYSTEM_INSTRUCTION_PERSONA = """
당신은 모두트리의 AI 상담사입니다.

**[대화 규칙]**
1. 사용자의 감정과 고민에 공감하며 따뜻하고 친근한 대화를 나누어 주세요.
2. 모두트리 서비스에 관한 질문이라면 정확하고 상세한 정보를 제공해주세요.
3. 항상 존댓말을 사용하고, 이모지를 적절히 활용해 친근감을 표현하세요.
4. 사용자가 힘들어하거나 고민이 있을 때는 깊이 공감하고 격려해주세요.
5. 짧은 답변보다는 충분히 설명하되, 너무 길지 않게 3-5문장으로 답변하세요.

**[모두트리 서비스 소개]**
- 모두트리는 내 페이지(기록 페이지)를 기반으로 유익한 커뮤니티를 제공하는 서비스입니다.
- AI와의 대화를 통해 일정 메모, 일기 작성, 건강 분석 등 다양한 기능을 제공합니다.
- 사연 투표, 링크편지 등 특별한 소통 기능도 있습니다.
"""


# ✅ FAQ 키워드 개선 (공백 제거 버전 추가)
FAQ_KEYWORD_MAP = {
    "사연투표": "제가 대화한 내용을 AI 사연 투표로 만들 수 있나요?",
    "사연 투표": "제가 대화한 내용을 AI 사연 투표로 만들 수 있나요?",
    "일기": "일기 작성이나 저장이 가능한가요?",
    "문의": "모두트리에 문의하거나 의견을 남기고 싶어요.",
    "의견": "모두트리에 문의하거나 의견을 남기고 싶어요.",
    "게시판": "모두트리에 문의하거나 의견을 남기고 싶어요.",
    "모두트리": "모두트리는 어떤 서비스인가요?"
}

# --- LangGraph 상태 및 노드 ---

def build_faq_keyword_map():
    """FAQ 데이터로부터 키워드 맵 자동 생성"""
    keyword_map = {}
    for faq in FAQ_DATA:
        for keyword in faq["keywords"]:
            # 공백 제거 버전과 원본 모두 매핑
            keyword_map[keyword] = faq["answer"]
            keyword_map[keyword.replace(" ", "")] = faq["answer"]
    return keyword_map

FAQ_KEYWORD_MAP = build_faq_keyword_map()



class GraphState(TypedDict):
    uid: str
    message: str
    conversation_history: List[dict]
    intent: Literal["faq_check", "search_only"]
    final_response: str
    search_sources: Optional[List[dict]]
    has_search_results: bool

def determine_intent(state: GraphState) -> GraphState:
    """검색 전용 의도 파악 (단순화)"""
    try:
        message = state["message"].lower().strip()
        
        # FAQ 매칭만 유지
        found_answer = None
        for keyword, answer in FAQ_KEYWORD_MAP.items():
            if keyword in message:
                found_answer = answer
                break
        
        if found_answer:
            state["final_response"] = found_answer
            state["intent"] = "faq_check"
            print(f"[의도 파악] ❓ FAQ 매칭 완료")
            return state

        # 🎯 나머지 모든 요청을 검색으로 처리
        state["intent"] = "search_only"
        print(f"[의도 파악] 🔍 검색 전용 모드")
        return state
    
    except Exception as e:
        print(f"[의도 파악] ❌ 오류: {e}")
        state["intent"] = "search_only"  # 오류 시 검색으로
        return state




def call_general_chat_llm(state: GraphState) -> GraphState:
    """검색 전용 LLM 호출"""
    print("[검색] 🔍 검색 LLM 호출 시작")
    
    try:
        # 카테고리 분류 (안전한 임포트)
        try:
            from search_api import classify_query, SearchCategory, perform_search
            category, clean_query = classify_query(state["message"])
            print(f"[검색] 📂 카테고리: {category.value}")
        except ImportError as e:
            print(f"[검색] ⚠️ search_api 임포트 실패: {e}")
            category = None
            clean_query = state["message"]
        except Exception as e:
            print(f"[검색] ⚠️ 카테고리 분류 실패: {e}")
            category = None
            clean_query = state["message"]
        
        # 검색 실행 (모든 요청을 검색으로 처리)
        if 'perform_search' in locals():
            naver_id = os.environ.get("NAVER_CLIENT_ID")
            naver_secret = os.environ.get("NAVER_CLIENT_SECRET")
            serper_key = os.environ.get("SERPER_KEY")
                
            search_result = perform_search(
                state["message"], 
                genai,
                naver_id=naver_id,
                naver_secret=naver_secret,
                serper_key=serper_key
            )
                
            if search_result.get("success"):
                state["final_response"] = search_result.get("summary", "")
                state["search_sources"] = search_result.get("sources", [])
                state["has_search_results"] = True
                print(f"[검색] ✅ 검색 완료: {len(state.get('search_sources', []))}개 출처")
            else:
                print(f"[검색] ⚠️ 검색 실패")
                state["final_response"] = (
                    "죄송해요, 현재 검색 서비스에 일시적인 문제가 있어요. 😥\n"
                    "잠시 후 다시 시도해 주시거나, 다른 질문을 해주시겠어요?"
                )
                state["has_search_results"] = False
        else:
            # 검색 기능 비활성화 시 기본 응답
            print(f"[검색] ⚠️ 검색 기능 비활성화")
            state["final_response"] = "검색 기능이 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요."
            state["has_search_results"] = False
        
    except Exception as e:
        print(f"[검색] ❌ 오류: {e}")
        traceback.print_exc()
        state["final_response"] = (
            "죄송해요, 검색 중 일시적인 오류가 발생했어요. 😓\n"
            "다시 한 번 검색해 주시겠어요?"
        )
        state["has_search_results"] = False
    
    return state

def route_intent(state: GraphState) -> Literal["faq_check", "search_only"]:
    """의도에 따른 라우팅 (검색 전용)"""
    if state["intent"] == "faq_check":
        return "faq_check"
    return "search_only"  # 기본값은 검색

# --- LangGraph 그래프 빌드 (검색 전용) ---
workflow = StateGraph(GraphState)
workflow.add_node("determine_intent", determine_intent)
workflow.add_node("call_general_chat_llm", call_general_chat_llm)  # 검색 처리

workflow.set_entry_point("determine_intent")

workflow.add_conditional_edges(
    "determine_intent",
    route_intent,
    {
        "faq_check": END,
        "search_only": "call_general_chat_llm"  # 검색만
    }
)

workflow.add_edge("call_general_chat_llm", END)

memory_saver = MemorySaver()
app_graph = workflow.compile(checkpointer=memory_saver)
print("✅ LangGraph 초기화 완료")

# --- FastAPI ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    token: str
    conversationHistory: List[dict]
    action: Optional[Literal["GENERAL_CHAT"]] = None

class StreamRequest(BaseModel):
    query: str
    include_sources: Optional[bool] = True
    token: Optional[str] = None

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """검색 전용 채팅 엔드포인트"""
    try:
        decoded_token = verify_firebase_token(request.token)
        uid = decoded_token["uid"]
    except HTTPException as e:
        raise e

    if not db:
        return {
            "success": False,
            "response": "데이터베이스 연결 문제로 서비스를 이용할 수 없습니다.",
            "remainingChats": 0
        }

    print(f"[채팅] 🔍 검색 전용 요청: {request.message[:50]}...")

    try:
        # 기본 상태 설정
        temp_state = GraphState(
            uid=uid,
            message=request.message,
            conversation_history=request.conversationHistory,
            intent="search_only",  # 기본값 검색
            final_response="",
            search_sources=[],
            has_search_results=False
        )

        # FAQ 체크
        intent_result = determine_intent(temp_state)
        
        # 한도 체크 (검색만 해당)
        if intent_result["intent"] == "search_only":
            limit_status = await check_and_update_chat_limit(uid)
            if not limit_status["canChat"]:
                return {
                    "success": False,
                    "response": "일일 검색 한도를 초과했습니다. 내일 다시 이용해주세요.",
                    "remainingChats": 0
                }

        # 사용자 메시지 저장
        user_message = {
            "role": "user",
            "content": request.message,
            "timestamp": datetime.now(timezone.utc)
        }
        save_chat_to_firestore(uid, user_message, db)

        # 검색 실행
        graph_input = GraphState(
            uid=uid,
            message=request.message,
            conversation_history=request.conversationHistory,
            intent=intent_result["intent"],
            final_response="",
            search_sources=[],
            has_search_results=False
        )
        
        config = {"configurable": {"thread_id": uid}}
        
        if intent_result["intent"] == "faq_check":
            final_state = intent_result
        else:
            # 검색 처리
            final_state = call_general_chat_llm(graph_input)
        
        # AI 응답 저장
        ai_message = {
            "role": "assistant", 
            "content": final_state["final_response"],
            "timestamp": datetime.now(timezone.utc)
        }
        save_chat_to_firestore(uid, ai_message, db)

        return {
            "success": True,
            "response": final_state["final_response"],
            "sources": final_state.get("search_sources", []),
            "has_search_results": final_state.get("has_search_results", False),
            "remainingChats": limit_status.get("remainingChats", 0) if intent_result["intent"] == "search_only" else None
        }

    except Exception as e:
        print(f"[채팅] ❌ 오류: {e}")
        return {
            "success": False,
            "response": "검색 중 오류가 발생했습니다. 다시 시도해주세요.",
            "sources": []
        }

@app.get("/")
async def health_check():
    return {
        "status": "ok",
        "message": "Modoo Tree AI Chatbot API",
        "db_connected": db is not None
    }

@app.post("/stream")
async def stream_endpoint(request: StreamRequest):
    """FastAPI SSE 스트리밍 검색 엔드포인트"""
    user_input = request.query.strip()
    
    if not user_input:
        raise HTTPException(status_code=400, detail="query 필수")
    
    def generate_sse():
        start = time.time()
        
        try:
            # ===== 0️⃣ 쿼리 정제 및 refresh 태그 감지 =====
            import re
            from search_api import clean_query as clean_query_func
            
            cleaned_query = clean_query_func(user_input)
            force_refresh = bool(re.search(r'\[refresh:\d+\]', user_input))
            if force_refresh:
                print(f"🔄 [FastAPI] 캐시 무시 플래그 감지: '{user_input}' → '{cleaned_query}'")
            
            # ===== 1️⃣ 캐시 확인 (정제된 쿼리로, force_refresh가 False일 때만) =====
            cached_result = memory_cache.get(cleaned_query) if not force_refresh else None
            if cached_result:
                yield sse_format({
                    "stage": "cache",
                    "status": "hit",
                    "message": "💾 캐시된 결과 반환 중..."
                })
                
                # 캐시된 요약을 스트리밍 형태로 반환
                summary = cached_result.get("summary", "")
                if summary:
                    # 부드러운 스트리밍 효과
                    chunks = [summary[i:i+20] for i in range(0, len(summary), 20)]
                    for chunk in chunks:
                        yield sse_format({
                            "stage": "synthesis",
                            "status": "streaming",
                            "partial_answer": chunk
                        })
                        time.sleep(0.02)  # 자연스러운 속도
                
                yield sse_format({
                    "stage": "complete",
                    "status": "success",
                    "summary": summary,
                    "sources": cached_result.get("sources", []),
                    "elapsed": time.time() - start,
                    "from_cache": True
                })
                return
            
            # ===== 1️⃣ 쿼리 분류 =====
            yield sse_format({
                "stage": "classify",
                "status": "started",
                "message": "🔍 검색 준비 중..."
            })
            
            from search_api import classify_query, SearchCategory, perform_search
            category, clean_query = classify_query(user_input)
            
            yield sse_format({
                "stage": "classify",
                "status": "finished",
                "category": category.value,
                "message": f"📂 카테고리: {category.value}"
            })

            # ===== 검색 모드 (모든 요청을 검색으로 처리) =====
            yield sse_format({
                "stage": "search",
                "status": "started", 
                "message": f"🔍 {category.value} 검색 중...",
                "progress": 10
            })
            
            naver_id = os.environ.get("NAVER_CLIENT_ID")
            naver_secret = os.environ.get("NAVER_CLIENT_SECRET")
            serper_key = os.environ.get("SERPER_KEY")
            
            search_result = perform_search(
                user_input, 
                genai,
                naver_id=naver_id,
                naver_secret=naver_secret,
                serper_key=serper_key
            )
                
            if search_result.get("success"):
                    yield sse_format({
                        "stage": "complete",
                        "status": "finished",
                        "category": category.value,
                        "duration_sec": round(time.time() - start, 2),
                        "answer_summary": search_result.get("summary", ""),
                        "sources": search_result.get("sources", []),
                        "message": f"✅ 검색 완료"
                    })
                    
                    # 캐시에 저장
                    memory_cache.set(cleaned_query, search_result)
            else:
                    # 🔥 검색 실패 시 간단한 에러 메시지만 (Gemini 사용 안 함)
                    yield sse_format({
                        "stage": "complete",
                        "status": "finished",
                        "category": "error",
                        "duration_sec": round(time.time() - start, 2),
                        "answer_summary": "죄송합니다. 현재 검색 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.",
                        "sources": [],
                        "message": f"⚠️ 검색 서비스 오류"
                    })

        except Exception as e:
            trace = traceback.format_exc()
            print(f"❌ FastAPI SSE 에러: {e}\n{trace}")
            yield sse_format({
                "stage": "error",
                "error": str(e),
                "message": f"❌ 오류 발생: {str(e)[:100]}"
            })

    return StreamingResponse(
        generate_sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "검색 전용 서버",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "cache": memory_cache.get_stats()
    }

@app.post("/cache/clear")
async def clear_cache_api():
    """캐시 수동 삭제 (관리자용)"""
    memory_cache.clear()
    return {"message": "캐시가 삭제되었습니다"}

@app.get("/cache/stats")
async def cache_stats_api():
    """캐시 통계"""
    return memory_cache.get_stats()

# ===== Flask 앱 (SSE 스트리밍용) =====
flask_app = Flask(__name__)

# CORS 설정 (모든 출처 허용)
CORS(flask_app, 
     resources={r"/*": {"origins": "*"}},
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "OPTIONS"],
     expose_headers=["Content-Type"],
     max_age=3600)

def sse_format(data: dict) -> str:
    """SSE 형식으로 변환"""
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

@flask_app.route("/stream", methods=["POST", "OPTIONS"])
def stream_search():
    """SSE 스트리밍 검색"""
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
            # ===== 0️⃣ 쿼리 정제 및 refresh 태그 감지 =====
            import re
            from search_api import clean_query as clean_query_func
            
            cleaned_query = clean_query_func(user_input)
            force_refresh = bool(re.search(r'\[refresh:\d+\]', user_input))
            if force_refresh:
                print(f"🔄 [Flask] 캐시 무시 플래그 감지: '{user_input}' → '{cleaned_query}'")
            
            # ===== 1️⃣ 캐시 확인 (정제된 쿼리로, force_refresh가 False일 때만) =====
            cached_result = memory_cache.get(cleaned_query) if not force_refresh else None
            if cached_result:
                yield sse_format({
                    "stage": "cache",
                    "status": "hit",
                    "message": "💾 캐시된 결과 반환 중..."
                })
                
                # 캐시된 요약을 스트리밍 형태로 반환
                summary = cached_result.get("summary", "")
                if summary:
                    # 부드러운 스트리밍 효과
                    chunks = [summary[i:i+20] for i in range(0, len(summary), 20)]
                    for chunk in chunks:
                        yield sse_format({
                            "stage": "synthesis",
                            "status": "streaming",
                            "partial_answer": chunk
                        })
                        time.sleep(0.02)  # 자연스러운 속도
                
                yield sse_format({
                    "stage": "complete",
                    "status": "success",
                    "summary": summary,
                    "sources": cached_result.get("sources", []),
                    "elapsed": time.time() - start,
                    "from_cache": True
                })
                return
            
            # ===== 1️⃣ 쿼리 분류 =====
            yield sse_format({
                "stage": "classify",
                "status": "started",
                "message": "🔍 검색 준비 중..."
            })
            
            from search_api import classify_query, SearchCategory, perform_search
            category, clean_query = classify_query(user_input)
            
            yield sse_format({
                "stage": "classify",
                "status": "finished",
                "category": category.value,
                "message": f"📂 카테고리: {category.value}"
            })

            # ===== 검색 모드 (모든 요청을 검색으로 처리) =====
            yield sse_format({
                "stage": "search",
                "status": "started", 
                "message": f"🔍 {category.value} 검색 중...",
                "progress": 10
            })
            
            naver_id = os.environ.get("NAVER_CLIENT_ID")
            naver_secret = os.environ.get("NAVER_CLIENT_SECRET")
            serper_key = os.environ.get("SERPER_KEY")
            
            search_result = perform_search(
                user_input, 
                genai,
                naver_id=naver_id,
                naver_secret=naver_secret,
                serper_key=serper_key
            )
                
            if search_result.get("success"):
                    yield sse_format({
                        "stage": "complete",
                        "status": "finished",
                        "category": category.value,
                        "duration_sec": round(time.time() - start, 2),
                        "answer_summary": search_result.get("summary", ""),
                        "sources": search_result.get("sources", []),
                        "message": f"✅ 검색 완료"
                    })
                    
                    # 캐시에 저장
                    memory_cache.set(cleaned_query, search_result)
            else:
                    yield sse_format({
                        "stage": "error",
                        "error": "검색 결과가 없습니다."
                    })

        except Exception as e:
            trace = traceback.format_exc()
            print(f"❌ SSE 에러: {e}\n{trace}")
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

@flask_app.route("/health", methods=["GET"])
def flask_health_check():
    """Flask 서비스 상태 확인"""
    cache_stats = memory_cache.get_stats()
    return jsonify({
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "gemini": genai is not None,
            "naver": os.environ.get("NAVER_CLIENT_ID") is not None,
            "serper": os.environ.get("SERPER_KEY") is not None,
        },
        "cache": cache_stats
    }), 200

@flask_app.route("/cache/clear", methods=["POST"])
def clear_cache():
    """캐시 수동 삭제 (관리자용)"""
    memory_cache.clear()
    return jsonify({"message": "캐시가 삭제되었습니다"}), 200

@flask_app.route("/cache/stats", methods=["GET"])
def cache_stats():
    """캐시 통계"""
    return jsonify(memory_cache.get_stats()), 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    
    # 로컬 개발용 - FastAPI 서버 실행
    print("🚀 검색 전용 FastAPI 서버 실행 중 (로컬 개발용)...")
    print(f"포트: {port}")
    
    try:
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=port)
    except Exception as e:
        print(f"❌ 서버 시작 실패: {e}")
        import traceback
        traceback.print_exc()
