# main.py 파일 내용

# allimpo.py 파일에서 Flask 앱 인스턴스 'app'을 가져옵니다.
# GCF Gen 2 (Cloud Run 기반)는 이 'app' 객체를 엔트리포인트로 사용합니다.
from allimpom import app 
# from getrecom import app


import os
if __name__ == "__main__":
    # PORT 환경 변수를 사용하도록 합니다.
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))