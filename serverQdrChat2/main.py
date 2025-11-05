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

# 🚨 메모 저장 로직 집중 개선 (로그 추가 및 DB 구조 명시)
def save_memos_to_firestore(uid: str, memo_items: List[dict], db: firestore.client) -> int:
    """
    Agent에서 추출한 메모 항목 리스트를 받아 Firestore에 저장합니다.
    구조: collections/users/documents/{uid}/collections/private_memos/documents/{memo_id}
    """
    if not db:
        print("❌ Firestore 클라이언트가 초기화되지 않았습니다. 저장 실패.")
        return 0
        
    saved_count = 0
    
    # AI 위로 채팅과 동일한 구조로 변경
    user_memo_collection_ref = (
        db.collection('users')
        .document(uid)
        .collection('private_memos')
    )
    
    for item in memo_items:
        try:
            # 저장할 데이터
            memo_data = {
                "content": item.get("content", "내용 없음"), 
                "created_at": datetime.now(timezone.utc),
                "is_completed": False,
                "is_tomorrow": item.get("isTomorrow", False) 
            }
            
            # 새 문서 추가 (자동 ID 생성)
            user_memo_collection_ref.add(memo_data)
            
            saved_count += 1
            print(f"✅ UID {uid}에 메모 항목 저장 완료: {item.get('content', '')[:30]}...")
            
        except Exception as e:
            # 개별 항목 저장 실패 시, 오류 로그를 남기고 다음 항목으로 이동
            print(f"❌ 메모 저장 중 Firestore 오류 발생: {e}")
            continue 
            
    return saved_count


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

SYSTEM_INSTRUCTION_MEMO_AGENT = """
**[CRITICAL INSTRUCTION]** 당신은 지금 SAVE_MEMO 요청을 받았습니다.
**반드시** 주어진 JSON 스키마를 따라 응답해야 하며, action 필드는 "SAVE_MEMO"로 설정해야 합니다.
**절대로** 일반 텍스트로 응답하지 마세요. 반드시 JSON 형식으로만 응답하세요.

userResponse 필드는 사용자에게 따뜻하고 친근한 확인 메시지를 전달해야 합니다.
예: "메모에 저장했어요! 📝 잊지 않고 챙기실 수 있도록 도와드릴게요 😊"

사용자의 요청 내용을 분석하여 각 일정을 개별 항목으로 분리해주세요.
각 메모 항목은 반드시 시간과 내용을 포함해야 하며, '내일'이나 미래 날짜가 언급된 경우 isTomorrow를 true로 설정하세요.
"""


AGENT_SCHEMA = {
    "type": "object",
    "properties": {
        "action": {"type": "string", "description": "사용자가 요청한 행동 (SAVE_MEMO 또는 NONE 중 하나)"},
        "userResponse": {"type": "string", "description": "저장 완료 후 사용자에게 보여줄 친근하고 공감적인 응답 메시지."},
        "memoItems": {
            "type": "array",
            "description": "SAVE_MEMO 액션일 때 사용. 사용자 요청에서 추출된 하나 이상의 개별 메모 항목 리스트.",
            "items": {
                "type": "object",
                "properties": {
                    "content": {"type": "string", "description": "개별 메모 항목의 내용."},
                    "isTomorrow": {"type": "boolean", "description": "'내일' 키워드나 미래 날짜 언급이 포함되어 있으면 true"}
                },
                "required": ['content', 'isTomorrow']
            }
        },
    },
    "required": ['action', 'userResponse']
}

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
    intent: Literal["faq_check", "confirm_save_memo", "save_memo_execute", "general_chat"]
    final_response: str
    search_sources: Optional[List[dict]]
    has_search_results: bool

def determine_intent(state: GraphState) -> GraphState:
    """사용자 의도 파악 (개선 버전 - 포괄적 대화 지원)"""
    try:
        message = state["message"].lower().strip()
        
        # 1️⃣ 메모 저장 키워드 체크 (최우선)
        memo_keywords = [
            '메모로 넣어줘', '메모 넣어줘', '메모로 저장', '메모 저장', 
            '메모 추가', '메모저장', '일정 추가', '일정 등록', 
            '기록 추가', '기록 저장', '저장해줘', '기록해줘'
        ]
        
        if any(keyword in message for keyword in memo_keywords):
            state["intent"] = "save_memo_execute"
            print(f"[의도 파악] 메모 저장 요청 감지 - 바로 실행")
            return state

        # 2️⃣ FAQ 매칭
        found_answer = None
        matched_keywords = []
        
        for keyword, answer in FAQ_KEYWORD_MAP.items():
            if keyword in message:
                found_answer = answer
                matched_keywords.append(keyword)
                break  # 첫 번째 매칭만 사용
        
        if found_answer:
            state["final_response"] = found_answer
            state["intent"] = "faq_check"
            print(f"[의도 파악] FAQ 매칭 완료: {matched_keywords}")
            return state

        # 3️⃣ 명확한 검색 의도 키워드 체크 (구체적인 검색 요청만)
        explicit_search_keywords = [
            '검색해줘', '찾아줘', '알아봐줘', '검색', '찾아서', '알아봐서',
            '어디서', '어디에서', '어떤 곳', '추천해줘', '추천', '리스트',
            '정보', '자료', '데이터', '뉴스', '기사', '최신', '업데이트'
        ]
        
        # 명확한 검색 키워드가 있는 경우에만 검색으로 분류
        has_explicit_search = any(kw in message for kw in explicit_search_keywords)
        
        if has_explicit_search:
            print(f"[의도 파악] 명확한 검색 요청 감지 → general_chat (검색 모드)")
        else:
            print(f"[의도 파악] 일반 대화/감정 표현 → general_chat (대화 모드)")
        
        # 4️⃣ 모든 경우를 일반 대화로 처리 (검색/대화 구분은 call_general_chat_llm에서)
        state["intent"] = "general_chat"
        return state
    
    except Exception as e:
        print(f"[의도 파악] ❌ 오류 발생: {e}")
        traceback.print_exc()
        # 오류 시 안전하게 일반 대화로 분류
        state["intent"] = "general_chat"
        return state

def confirm_save_memo_agent(state: GraphState) -> GraphState:
    """메모 저장 확인 메시지 반환 (개선 버전)"""
    state["final_response"] = (
        "말씀하신 내용을 메모로 저장할까요? 📝\n"
        "저장하시려면 '네' 또는 '저장해줘'라고 말씀해 주세요!\n"
        "다른 질문이 있으시면 편하게 물어봐 주세요 😊"
    )
    print("[메모 확인] 저장 확인 요청 전송")
    return state

# 🚨 메모 저장 실행 노드 개선 (로깅 및 에러 응답 분리)
def execute_memo_agent(state: GraphState, uid) -> GraphState:
    """메모 저장 실행 (개선 버전)"""
    print("[메모 실행] 📝 메모 에이전트 호출")
    
    try:
        model = genai.GenerativeModel(
            model_name='gemini-2.0-flash-lite',
            generation_config={
                "response_mime_type": "application/json",
                "response_schema": AGENT_SCHEMA,
                "temperature": 0.1,
            },
            system_instruction=SYSTEM_INSTRUCTION_MEMO_AGENT
        )
        
        # 대화 이력 포함
        contents = [
            {"role": msg.get("role", "user"), "parts": [{"text": msg.get("content", "")}]} 
            for msg in state["conversation_history"]
        ]
        contents.append({"role": "user", "parts": [{"text": state["message"]}]})

        response = model.generate_content(contents) 
        raw_text = response.text
        
        json_match = re.search(r'\{[\s\S]*\}', raw_text)
        if not json_match:
            raise ValueError("AI가 유효한 JSON을 반환하지 않았습니다.")
            
        response_data = json.loads(json_match.group(0))
        print(f"[메모 실행] LLM 응답: {json.dumps(response_data, ensure_ascii=False, indent=2)}") 
        
        if db and response_data.get("action") == "SAVE_MEMO":
            memo_items = response_data.get("memoItems", [])
            
            if not memo_items:
                print("[메모 실행] ⚠️ 저장할 메모 내용이 없습니다.")
                state["final_response"] = (
                    "죄송해요, 대화 내용에서 메모로 저장할 구체적인 내용을 찾을 수 없었어요. 😥\n"
                    "예를 들어 '내일 오후 3시 병원 예약 메모 저장'처럼 시간과 내용을 함께 말씀해 주시겠어요?"
                )
            else:
                saved_count = save_memos_to_firestore(uid, memo_items, db)
            
                if saved_count == 0:
                    print("[메모 실행] ❌ DB 저장 실패")
                    state["final_response"] = (
                        "앗, 죄송합니다! 😓 데이터베이스 오류로 메모 저장에 실패했어요. "
                        "다시 한 번 시도해 주시겠어요?"
                    )
                else:
                    print(f"[메모 실행] ✅ {saved_count}개 저장 완료")
                    # LLM이 생성한 친근한 응답 사용
                    default_response = f"메모 {saved_count}개를 저장했어요! 📝 잊지 않고 챙기실 수 있도록 도와드릴게요 😊"
                    state["final_response"] = response_data.get("userResponse", default_response)
        else:
            state["final_response"] = response_data.get("userResponse", "메모가 저장되었어요! 😊")
        
    except Exception as e:
        print(f"[메모 실행] ❌ 오류: {e}")
        traceback.print_exc()
        state["final_response"] = (
            "죄송해요, 메모 저장 중 문제가 발생했어요. 😥\n"
            "잠시 후 다시 시도해 주시겠어요?"
        )
        
    return state


def call_general_chat_llm(state: GraphState) -> GraphState:
    """일반 대화 LLM 호출 (검색 통합, 공감 강화)"""
    print("[일반 대화] 💬 LLM 호출 시작")
    
    try:
        # 1. 카테고리 분류 (안전한 임포트)
        try:
            from search_api import classify_query, SearchCategory, perform_search
            category, clean_query = classify_query(state["message"])
        except ImportError as e:
            print(f"[일반 대화] ⚠️ search_api 임포트 실패: {e}")
            # 검색 기능 없이 대화만 진행
            category = None
            clean_query = state["message"]
        except Exception as e:
            print(f"[일반 대화] ⚠️ 카테고리 분류 실패: {e}")
            category = None
            clean_query = state["message"]
        
        # 2. CHAT vs SEARCH 분기
        if category is None or (hasattr(category, 'value') and category.value == 'chat'):
            print("[일반 대화] 💭 대화 모드 (공감 우선)")
            
            model = genai.GenerativeModel(
                model_name='gemini-2.0-flash-lite',
                system_instruction=SYSTEM_INSTRUCTION_PERSONA
            )
            
            # 최근 대화 이력 포함 (문맥 유지) - 안전한 처리
            history = []
            for msg in state.get("conversation_history", [])[-5:]:  # 최근 5개
                try:
                    role = msg.get("role", "user")
                    
                    # 여러 형식 지원
                    if "parts" in msg:
                        content = msg["parts"][0].get("text", "") if msg["parts"] else ""
                    elif "content" in msg:
                        content = msg["content"]
                    else:
                        content = ""
                    
                    if content and isinstance(content, str):
                        history.append({
                            "role": role,
                            "parts": [{"text": content}]
                        })
                except Exception as e:
                    print(f"[일반 대화] ⚠️ 대화 이력 파싱 실패: {e}")
                    continue
            
            # 대화 시작
            chat = model.start_chat(history=history)
            response = chat.send_message(state["message"])
            state["final_response"] = response.text
            state["has_search_results"] = False
            print(f"[일반 대화] ✅ 대화 완료: {len(response.text)}자")
            
        else:
            # 검색 모드
            print(f"[일반 대화] 🔍 검색 모드 ({category.value if hasattr(category, 'value') else 'unknown'})")
            
            # search_api가 정상 임포트된 경우에만 검색 수행
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
                    print(f"[일반 대화] ✅ 검색 완료: {len(state.get('search_sources', []))}개 출처")
                else:
                    print(f"[일반 대화] ⚠️ 검색 실패")
                    state["final_response"] = (
                        "죄송해요, 현재 검색 서비스에 일시적인 문제가 있어요. 😥\n"
                        "잠시 후 다시 시도해 주시거나, 다른 질문을 해주시겠어요?"
                    )
                    state["has_search_results"] = False
            else:
                # 검색 기능 비활성화 시 일반 대화로 폴백
                print(f"[일반 대화] ⚠️ 검색 기능 비활성화, 대화 모드로 전환")
                model = genai.GenerativeModel(
                    model_name='gemini-2.0-flash-lite',
                    system_instruction=SYSTEM_INSTRUCTION_PERSONA
                )
                response = model.generate_content(state["message"])
                state["final_response"] = response.text
                state["has_search_results"] = False
        
    except Exception as e:
        print(f"[일반 대화] ❌ 오류: {e}")
        traceback.print_exc()
        state["final_response"] = (
            "죄송해요, 일시적인 오류가 발생했어요. 😓\n"
            "다시 한 번 말씀해 주시겠어요?"
        )
        state["has_search_results"] = False
    
    return state

def route_intent(state: GraphState) -> Literal["faq_check", "save_memo_execute", "general_chat"]:
    """의도에 따른 라우팅"""
    if state["intent"] == "faq_check":
        return "faq_check"
    if state["intent"] == "save_memo_execute":
        return "save_memo_execute"
    return "general_chat"

# --- LangGraph 그래프 빌드 ---
workflow = StateGraph(GraphState)
workflow.add_node("determine_intent", determine_intent)
workflow.add_node("confirm_save_memo", confirm_save_memo_agent)
workflow.add_node("execute_memo_agent", execute_memo_agent)
workflow.add_node("call_general_chat_llm", call_general_chat_llm)

workflow.set_entry_point("determine_intent")

workflow.add_conditional_edges(
    "determine_intent",
    route_intent,
    {
        "faq_check": END,
        "save_memo_execute": "execute_memo_agent",
        "general_chat": "call_general_chat_llm"
    }
)

workflow.add_edge("confirm_save_memo", END)
workflow.add_edge("execute_memo_agent", END)
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
    action: Optional[Literal["EXECUTE_MEMO", "GENERAL_CHAT"]] = None

class StreamRequest(BaseModel):
    query: str
    include_sources: Optional[bool] = True
    token: Optional[str] = None

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """메인 채팅 엔드포인트"""
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

    # ✅ 먼저 intent 파악 (한도 차감 없이)
    needs_limit_check = False  # 기본값 설정
    remaining_chats = DAILY_CHAT_LIMIT
    
    try:
        # 1. intent 파악을 위한 임시 state
        temp_state = GraphState(
            uid=uid,
            message=request.message,
            conversation_history=request.conversationHistory,
            intent="general_chat",
            final_response="",
            search_sources=[],
            has_search_results=False
        )
        
        # 2. action에 따른 intent 설정
        if request.action == "EXECUTE_MEMO":
            temp_state["intent"] = "save_memo_execute"
            needs_limit_check = False
        elif request.action == "GENERAL_CHAT":
            temp_state["intent"] = "general_chat"
            needs_limit_check = True
        else:
            # 일반 워크플로우: intent 파악
            intent_result = determine_intent(temp_state)
            needs_limit_check = intent_result["intent"] == "general_chat"
        
        # 3. 한도 체크 (일반 대화/검색만)
        if needs_limit_check:
            print(f"[한도] 🏦 일반 대화/검색 - 한도 체크 실행")
            try:
                limit_status = await check_and_update_chat_limit(uid)
                remaining_chats = limit_status["remainingChats"]

                if not limit_status["canChat"]:
                    return {
                        "success": False,
                        "response": "일일 대화 한도(200회)를 초과했습니다.",
                        "remainingChats": 0
                    }
            except Exception as e:
                print(f"❌ 한도 체크 오류: {e}")
        else:
            print(f"[한도] 🆓 무료 기능 (FAQ/메모) - 한도 체크 생략")

        # 4. 사용자 메시지 저장
        user_message = {
            "role": "user",
            "content": request.message,
            "timestamp": datetime.now(timezone.utc)
        }
        save_chat_to_firestore(uid, user_message, db)
        
        # 5. 실제 처리 수행
        graph_input = GraphState(
            uid=uid,
            message=request.message,
            conversation_history=request.conversationHistory,
            intent="general_chat",
            final_response="",
            search_sources=[],
            has_search_results=False
        )
        
        config = {"configurable": {"thread_id": uid}}
        
        # ✅ action에 따라 다른 노드 실행
        if request.action == "EXECUTE_MEMO":
            # execute_memo_agent 노드만 실행
            graph_input["intent"] = "save_memo_execute"
            final_state = execute_memo_agent(graph_input, uid)
        elif request.action == "GENERAL_CHAT":
            # general_chat 노드만 실행
            final_state = call_general_chat_llm(graph_input)
        else:
            # 정상 워크플로우 실행
            final_state = app_graph.invoke(graph_input, config=config)
        
        # 6. AI 응답 저장
        ai_message = {
            "role": "assistant", 
            "content": final_state["final_response"],
            "timestamp": datetime.now(timezone.utc),
            "hasSearchResults": final_state.get("has_search_results", False),
            "searchSources": final_state.get("search_sources", [])
        }
        save_chat_to_firestore(uid, ai_message, db)
        
        return {
            "success": True,
            "response": final_state["final_response"],
            "remainingChats": remaining_chats,
            "needsConfirmation": False,  # 더 이상 확인 단계 없음
            "hasSearchResults": final_state.get("has_search_results", False),
            "searchSources": final_state.get("search_sources", [])
        }

    except Exception as e:
        print(f"❌ LangGraph 오류: {e}")
        
        # 오류 시 한도 복원 (한도가 차감된 경우에만)
        if needs_limit_check and remaining_chats < DAILY_CHAT_LIMIT:
            try:
                today = date.today().isoformat()
                limit_ref = db.collection('users').document(uid).collection('limits').document(today)
                limit_ref.update({'count': firestore.Increment(-1)})
                remaining_chats += 1
                print(f"[한도] 🔄 오류로 인한 한도 복원")
            except Exception as restore_error:
                print(f"❌ 한도 복원 실패: {restore_error}")

        return {
            "success": False,
            "response": "죄송합니다. 일시적인 오류가 발생했습니다.",
            "remainingChats": remaining_chats
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

            # ===== 2️⃣ CHAT vs SEARCH 분기 =====
            if category == SearchCategory.CHAT:
                yield sse_format({
                    "stage": "chat",
                    "status": "started",
                    "message": "💬 일반 대화 모드"
                })
                
                # Gemini 대화
                model = genai.GenerativeModel(
                    model_name='gemini-2.0-flash-lite',
                    system_instruction=SYSTEM_INSTRUCTION_PERSONA
                )
                
                response = model.generate_content(user_input)
                final_answer = response.text
                
                yield sse_format({
                    "stage": "complete",
                    "status": "finished",
                    "category": category.value,
                    "duration_sec": round(time.time() - start, 2),
                    "answer_summary": final_answer,
                    "sources": [],
                    "message": f"✅ 일반 대화 완료"
                })
                
                # 캐시에 저장 (대화는 짧은 TTL)
                cache_data = {
                    "summary": final_answer,
                    "sources": [],
                    "category": category.value
                }
                memory_cache.set(cleaned_query, cache_data)
                return
                
            else:
                # ===== 검색 모드 =====
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
    return {"status": "healthy"}

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

            # ===== 2️⃣ CHAT vs SEARCH 분기 =====
            if category == SearchCategory.CHAT:
                yield sse_format({
                    "stage": "chat",
                    "status": "started",
                    "message": "💬 일반 대화 모드"
                })
                
                # Gemini 대화
                model = genai.GenerativeModel(
                    model_name='gemini-2.0-flash-lite',
                    system_instruction=SYSTEM_INSTRUCTION_PERSONA
                )
                
                response = model.generate_content(user_input)
                final_answer = response.text
                
                yield sse_format({
                    "stage": "complete",
                    "status": "finished",
                    "category": category.value,
                    "duration_sec": round(time.time() - start, 2),
                    "answer_summary": final_answer,
                    "sources": [],
                    "message": f"✅ 일반 대화 완료"
                })
                
                # 캐시에 저장 (대화는 짧은 TTL)
                cache_data = {
                    "summary": final_answer,
                    "sources": [],
                    "category": category.value
                }
                memory_cache.set(cleaned_query, cache_data)
                return
                
            else:
                # ===== 검색 모드 =====
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
    
    # 개발 환경에서는 Flask 실행 (SSE 지원)
    if os.environ.get("FLASK_ENV") == "development":
        print("🚀 Flask 개발 서버로 실행 (SSE 스트리밍 지원)...")
        flask_app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
    else:
        # 프로덕션에서는 FastAPI 실행 (기본 채팅)
        print("🚀 FastAPI 프로덕션 서버로 실행...")
        uvicorn.run(app, host="0.0.0.0", port=port)
