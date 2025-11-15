'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createAnonymousRoom,
  getAnonymousRooms,
  AnonymousRoom,
} from '@/lib/chat-service';
import useAuth from '@/hooks/useAuth'; // Assuming useAuth provides user info
import Link from 'next/link';

const CATEGORIES = ['일반', '공동구매', '취미', '스터디', '게임', '음악', '운동', '기타'];

export default function AnonymousChatListPage() {
  const [rooms, setRooms] = useState<AnonymousRoom[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('일반');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setIsLoading(true);
        const fetchedRooms = await getAnonymousRooms();
        setRooms(fetchedRooms);
        setError(null);
      } catch (err) {
        console.error('Error fetching rooms:', err);
        setError('채팅방 목록을 불러오는 데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRooms();
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('채팅방 제목을 입력해주세요.');
      return;
    }
    if (!user) {
      setError('로그인이 필요합니다.');
      return;
    }

    try {
      const newRoomId = await createAnonymousRoom(title, user.uid, category);
      router.push(`/anonymous-chat/${newRoomId}`);
    } catch (err) {
      console.error('Error creating room:', err);
      setError('채팅방 생성에 실패했습니다.');
    }
  };

  if (authLoading || isLoading) {
    return <div>로딩 중...</div>;
  }

  if (error) {
    return <div>오류: {error}</div>;
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 px-4 py-6">
      <h1 className="text-3xl font-bold mb-6 text-emerald-800">🌿 익명 토픽 채팅</h1>

      {/* 채팅방 생성 폼 */}
      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg mb-6 border border-emerald-200">
        <h2 className="text-xl font-semibold mb-4 text-emerald-700">새 채팅방 만들기</h2>
        <form onSubmit={handleCreateRoom} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-emerald-600">채팅방 제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 강남역 근처 공동구매 하실분!"
              className="input w-full bg-white/70 border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500 text-emerald-800 placeholder-emerald-400"
              disabled={!user}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-emerald-600">카테고리</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="select w-full bg-white/70 border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500 text-emerald-800"
              disabled={!user}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <button 
            type="submit" 
            className="btn w-full bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white font-semibold transition-all duration-200 hover:scale-105" 
            disabled={!user}
          >
            {user ? '🌱 채팅방 만들기' : '로그인이 필요합니다'}
          </button>
        </form>
      </div>

      {/* 채팅방 목록 */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-emerald-700">참여 가능한 채팅방 ({rooms.length})</h2>
        {rooms.length > 0 ? (
          <div className="grid gap-3">
            {rooms.map((room) => (
              <Link
                href={`/anonymous-chat/${room.id}`}
                key={room.id}
                className="block p-6 bg-white/80 backdrop-blur-sm rounded-xl border border-emerald-200 hover:bg-emerald-50/50 transition-all duration-300 hover:shadow-lg hover:border-emerald-300"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg text-emerald-800">{room.title}</h3>
                    <p className="text-sm text-emerald-600 mt-1">
                      <span className="inline-block bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs mr-2 font-medium">
                        {room.category || '일반'}
                      </span>
                      {new Date(room.createdAt).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  <span className="text-xs text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">
                    👥 0/{room.maxParticipants || 50}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-xl border border-emerald-200">
            <div className="text-5xl mb-4">🌿</div>
            <p className="text-emerald-600 font-medium">현재 참여 가능한 채팅방이 없습니다.</p>
            <p className="text-sm text-emerald-500 mt-2">새로운 방을 만들어보세요!</p>
          </div>
        )}
      </div>
    </div>
  );
}
