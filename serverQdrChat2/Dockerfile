# Python 3.11 (또는 3.12)을 기본 이미지로 사용
FROM python:3.11-slim

# 작업 디렉토리 설정
WORKDIR /app

# 환경 변수 설정 (비밀번호 등 민감 정보는 여기에 넣지 마세요)
ENV PYTHONUNBUFFERED=True

# requirements.txt 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 소스 코드 복사
COPY . .

# Cloud Run은 기본적으로 8080 포트를 사용
ENV PORT=8080

# uvicorn으로 FastAPI 앱 실행
CMD ["python", "main.py"]

