import requests
import json
import os
import traceback
from concurrent.futures import ThreadPoolExecutor
from google import genai
from google.genai import types
from flask import Flask, request # functions_framework 대신 Flask 사용

# Flask 앱 초기화
app = Flask(__name__)

# 환경 변수 설정
SERPER_KEY = os.environ.get("SERPER_KEY")
NAVER_ID = os.environ.get("NAVER_CLIENT_ID")
NAVER_SECRET = os.environ.get("NAVER_CLIENT_SECRET")
GEMINI_KEY = os.environ.get("GEMINI_API_KEY")

if not GEMINI_KEY:
    # Flask 서버는 환경 변수 없이도 시작되지만, 요청 처리 시 에러 발생.
    # 이 부분은 requests.get_json에서 처리되므로 그대로 둡니다.
    pass 

client = genai.Client(api_key=GEMINI_KEY)

# 1. API 설정 딕셔너리
SEARCH_CONFIG = {
    "google": {
        "url": "https://google.serper.dev/search",
        # "params": {"q": "{location} 맛집 카페 숙소"},
        "params": {"q": "{location} 맛집 카페 숙소 다이닝코드 식신 야놀자 데이트코스 감성카페"}, # <--- 구글은 이거??
        "headers": {"X-API-KEY": SERPER_KEY, "Content-Type": "application/json"},
    },
    "naver": {
        "url": "https://openapi.naver.com/v1/search/local.json",
        # "params": {"query": "{location} 맛집 카페 숙소", "display": 5},
        "params": {"query": "{location} 맛집 카페 숙소 다이닝코드 식신 야놀자 데이트코스 감성카페", "display": 5}, # <--- 이 부분만 수정
        "headers": {
            "X-Naver-Client-Id": NAVER_ID,
            "X-Naver-Client-Secret": NAVER_SECRET,
        },
    },
}

# 2. 시스템 인스트럭션 (변동 없음)
SYSTEM_INSTRUCTION = """
당신은 한국의 데이트 장소 전문 추천 에이전트입니다. 사용자 쿼리를 기반으로 Google 및 Naver 검색 결과를 분석하여 추천합니다.
검색 결과(네이버, 구글, 기타)를 참고하여 사용자가 원하는 지역의
맛집, 카페, 숙소를 추천하세요.
맛집이라면 '다이닝코드', '식신', '티스토리', '네이버블로그' 키워드를 포함하여 정보를 우선적으로 탐색하십시오.
숙소라면 '야놀자', '유튜브', '네이버블로그' 키워드를 포함하여 정보를 우선적으로 탐색하십시오.

출처 우선순위: 공식 웹사이트 > 다이닝코드/식신/야놀자 > 네이버블로그 > 네이버지도/카카오맵

**JSON 출력 강제 (가장 중요):**
**절대 서문, 설명, 결론 등 JSON 배열 외의 다른 텍스트를 반환해서는 안 됩니다.**
오직 하나의 JSON 배열만 다음 형식과 규칙에 따라 반환해야 합니다.

[
  {
    "category": "Restaurant, Cafe, Motel, 또는 Accommodation 중 하나를 정확히 사용",
    "name": "상호명",
    "imageUrl": "이미지 URL이 채워집니다. 이 필드는 반드시 비워두세요.",
    "address": "주소",
    "rating": "5점 만점 기준 평점 (예: 4.5)",
    "menu": "대표 메뉴 (숙소의 경우 null)",
    "summary": "간단 요약",
    "source": "naver | google | daum 등 실제 출처 플랫폼 이름"
    "sourceURL": "**가장 우선적으로 장소의 공식 웹사이트 URL 또는 상세 리뷰 URL을 사용하십시오. 공식 URL이 없는 경우에만 네이버/카카오 지도 플레이스 URL을 사용하십시오. 절대 null을 반환하지 마세요.**", # <--- 이 부분이 수정되었습니다!
    "price_range": "숙소의 경우 대략적인 1박 요금(예: '{EXAMPLE_PRICE}')을 입력하고, 식당/카페의 경우 null로 설정하십시오."
  }
  // ... (총 10개 항목)
]

**추천 항목 수 (절대 규칙):**
**식당 4개, 카페 3개, 숙소/모텔 3개, 총 10개의 항목을 정확하게 추천해야 합니다.**
**JSON 배열 내 항목 순서는 반드시 Restaurant(4개) → Cafe(3개) → Motel/Accommodation(3개) 순으로 출력하십시오.**
**반드시 'source' 필드를 포함하세요.**
**각 항목의 출처를 가능한 경우 네이버/구글 등 실제로 발견된 사이트명으로 설정하세요.**
**출처를 알 수 없으면 'unknown'으로 지정하세요.**
"""

# 3. 데이터 검색 함수 (변동 없음)
def fetch_api_data(source, location):
    config = SEARCH_CONFIG.get(source)
    if not config:
        return {"source": source, "error": "Invalid source"}

    query_str = (
        config["params"]["q"].format(location=location)
        if source == "google"
        else config["params"]["query"].format(location=location)
    )

    try:
        if source == "google":
            response = requests.post(
                config["url"],
                headers=config["headers"],
                json={"q": query_str, "num": 3},  #여기서 검색 시 파싱된 걸 넣어야 한다 현재 
                timeout=5 # 검색 API에도 timeout 추가
            )
        else:
            response = requests.get(
                config["url"],
                headers=config["headers"],
                params={"query": query_str, "display": config["params"]["display"]},
                timeout=5 # 검색 API에도 timeout 추가
            )

        response.raise_for_status()
        data = response.json()
        return {"source": source, "data": data}

    except requests.exceptions.RequestException as e:
        return {"source": source, "error": f"API request failed: {e}"}

# 4. 이미지 검색 함수 (Naver 우선, Serper Fallback - 최종 수정)
def fetch_place_image(place_name):
    
    # 1. Naver Image API 시도 (비용 효율성 우선)
    if NAVER_ID and NAVER_SECRET:
        url = "https://openapi.naver.com/v1/search/image"
        headers = {
            "X-Naver-Client-Id": NAVER_ID,
            "X-Naver-Client-Secret": NAVER_SECRET,
        }
        params = {"query": f"{place_name} 내부 외관", "display": 1, "sort": "sim"}
        
        try:
            response = requests.get(url, headers=headers, params=params, timeout=5) 
            response.raise_for_status()
            data = response.json()
            
            if data.get("items") and data["items"][0].get("link"):
                return data["items"][0]["link"] # Naver 이미지 URL 획득 성공
        except (requests.exceptions.RequestException, Exception) as e:
            print(f"Naver Image search failed for {place_name}: {e}. Trying fallback...")
            pass # 실패 시 조용히 다음 단계로 넘어감
            
    # 2. Serper Image API 시도 (Fallback)
    if SERPER_KEY:
        url = "https://google.serper.dev/images"
        headers = {"X-API-KEY": SERPER_KEY, "Content-Type": "application/json"}
        body = {"q": f"{place_name} 공식 사진", "num": 1}
        
        try:
            response = requests.post(url, headers=headers, json=body, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            if data.get("images") and data["images"][0].get("imageUrl"):
                return data["images"][0]["imageUrl"] # Serper 이미지 URL 획득 성공
        except (requests.exceptions.RequestException, Exception) as e:
            print(f"Serper Image search failed for {place_name}: {e}.")
            pass # 최종 실패
            
    return None # 최종 실패

# 5. 메인 HTTP 핸들러 (Flask 라우트로 변경)
@app.route("/", methods=["POST", "OPTIONS"])
def get_recommendations(request=None):
    """Flask용 라우터 및 전체 로직 핸들러"""

    # CORS 프리플라이트 요청 처리 (204 OK)
    if request.method == "OPTIONS":
        return "", 204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }

    try:
        # Flask request 객체에서 JSON 데이터 가져오기
        request_json = request.get_json(silent=True)
        location = request_json.get("location") if request_json else None
        
        if not location:
            return (
                json.dumps({"error": "location 파라미터가 필요합니다."}),
                400,
                {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
            )
            
        if not GEMINI_KEY:
             return (
                json.dumps({"error": "GEMINI_API_KEY가 설정되지 않았습니다."}),
                500,
                {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
            )

        # 1단계: 병렬 API 호출 (Serper, Naver)
        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = {
                "google": executor.submit(fetch_api_data, "google", location),
                "naver": executor.submit(fetch_api_data, "naver", location),
            }
            results = [f.result() for f in futures.values()]

        search_context = []
        for result in results:
            source = result['source']
            if 'data' in result:
            # 성공 시: [source] 헤더와 JSON 데이터 추가
               search_context.append(f"[{source}]\n{json.dumps(result['data'], ensure_ascii=False)}")
            elif 'error' in result:
                # 실패 시: [source 오류] 메시지 추가
                search_context.append(f"[{source} 오류]\n{result['error']}")
                

        final_prompt = f"[사용자 요청: {location}]\n[검색 결과]\n{search_context}""""
        [사용자 요청]
        지역: {location}

        [검색 결과]
        {search_context}
        """

        # 2단계: Gemini를 통한 추천 JSON 생성
        gemini_response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Content(
                    role="user", 
                    parts=[types.Part.from_text(text=final_prompt)]
                ),
            ],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                response_mime_type="application/json"
            ),
        )

        # Gemini 응답 파싱
        recommendations = json.loads(gemini_response.text) 
        
        if not isinstance(recommendations, list):
             raise ValueError("Gemini가 JSON 배열이 아닌 다른 형식을 반환했습니다.")


        # 3단계: 이미지 검색 및 삽입 (후처리)
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {
                index: executor.submit(fetch_place_image, item["name"])
                for index, item in enumerate(recommendations)
            }
            
            for index, future in futures.items():
                image_url = future.result()
                recommendations[index]["imageUrl"] = image_url

        # 4단계: 최종 결과 반환
        return (
            json.dumps(recommendations, ensure_ascii=False),
            200,
            {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json",
            },
        )

    except Exception as e:
        trace_info = traceback.format_exc() 
        print(f"FATAL ERROR OCCURRED: {trace_info}")

        return (
            json.dumps({"error": f"서버 처리 오류: {str(e)}", "trace": trace_info.splitlines()}),
            500,
            {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
        )

# Cloud Run / Functions 환경에서 컨테이너가 서버를 시작하도록 하는 표준 엔트리포인트
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))