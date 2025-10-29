FROM python:3.11-slim

WORKDIR /app

# 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 앱 복사
COPY . .

# 이미지 캐시 디렉토리 생성
RUN mkdir -p /app/image_cache

# 포트 노출
EXPOSE 8080

# Gunicorn으로 실행 (워커 수 조정)
CMD exec gunicorn --bind :8080 --workers 2 --worker-class gevent --worker-connections 1000 --timeout 120 allimpom:app