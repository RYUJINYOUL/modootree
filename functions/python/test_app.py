"""
간단한 앱 테스트
"""
from allimpom import app

if __name__ == "__main__":
    print("🧪 앱 테스트 시작...")
    print(f"📍 등록된 라우트:")
    for rule in app.url_map.iter_rules():
        print(f"  - {rule.rule} [{', '.join(rule.methods)}]")
    
    print("\n✅ 앱이 정상적으로 로드되었습니다!")

