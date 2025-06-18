import Image from "next/image";
import { Plus, Eye, ChevronDown, ChevronUp, MoreVertical } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* 상단 프로필 영역 */}
      <div className="p-6 flex flex-col items-center border-b">
        <div className="w-20 h-20 rounded-full bg-gray-200" />
        <div className="text-center mt-4">
          <div className="font-semibold">youssi</div>
          <button className="mt-2 px-4 py-1 text-sm border rounded-full">디자인 설정</button>
        </div>
      </div>

      {/* 방문자 수, 소식받기 */}
      <div className="grid grid-cols-2 text-center text-sm border-b divide-x">
        <div className="p-3">
          <div className="text-gray-400">방문자</div>
          <div>전체 0 오늘 0 실시간 0</div>
        </div>
        <div className="p-3">
          <div className="text-gray-400">소식받기</div>
          <div>전체 0</div>
        </div>
      </div>

      {/* 배너 */}
      <div className="p-4">
        <div className="bg-black text-white rounded-xl p-4 flex items-center gap-3">
          <div className="bg-orange-500 p-2 rounded-full">
            <span className="text-white text-sm font-bold">INPOCK</span>
          </div>
          <div>
            <div className="text-sm font-bold">더 간편해진 인포크, APP 정식 출시!</div>
            <div className="text-xs text-orange-300">지금 바로 다운로드 하러가기</div>
          </div>
        </div>
      </div>

      {/* 블록 리스트 */}
      <div className="px-4">
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm font-semibold">블록 리스트</div>
          <div className="flex gap-2 text-xs text-gray-500">
            <button>보관함</button>
            <button>편집</button>
          </div>
        </div>

        {/* 컬렉션 블록 */}
        <div className="border rounded-lg p-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="text-orange-500 font-semibold">컬렉션</div>
            <ChevronDown className="w-4 h-4" />
          </div>
          <div className="text-sm mt-2 text-gray-700">링크모음</div>
          <div className="flex justify-between items-center mt-2">
            <div className="text-sm text-gray-400">비활성화됨</div>
            <div className="w-10 h-5 rounded-full bg-gray-300 relative">
              <div className="absolute left-0 top-0 w-5 h-5 bg-white rounded-full shadow" />
            </div>
          </div>
        </div>

        {/* 링크 블록 */}
        <div className="border rounded-lg p-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="text-orange-500 font-semibold">링크</div>
            <ChevronDown className="w-4 h-4" />
          </div>
          <div className="text-sm mt-2 text-gray-700">ㅇㅇㅇㅇㅇ</div>
          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">총 0</span>
              <button className="bg-gray-200 text-xs px-2 py-0.5 rounded-full">TALK</button>
              <button className="bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full">INSTAGRAM</button>
            </div>
            <div className="w-10 h-5 rounded-full bg-gray-300 relative">
              <div className="absolute left-0 top-0 w-5 h-5 bg-white rounded-full shadow" />
            </div>
          </div>
        </div>
      </div>

      {/* 하단 메뉴 */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t py-3 px-4 flex justify-between items-center">
        <div className="flex gap-4 text-xs text-gray-500">
          <button className="flex flex-col items-center">
            <span>🔗</span>
            링크
          </button>
          <button className="flex flex-col items-center">
            <span>M</span>
            매니저
          </button>
          <button className="flex flex-col items-center">
            <span>🤝</span>
            딜
          </button>
          <button className="flex flex-col items-center">
            <span>💬</span>
            채팅
          </button>
          <button className="flex flex-col items-center">
            <span>≡</span>
            전체
          </button>
        </div>
        <button className="bg-orange-500 text-white w-10 h-10 rounded-full flex items-center justify-center shadow">
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
