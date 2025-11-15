'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import useAuth from '@/hooks/useAuth';
import {
  getOrAssignNickname,
  sendMessage,
  Message,
  getRoomDetails,
  banUserFromRoom,
  isUserBanned,
  AnonymousRoom,
} from '@/lib/chat-service';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';

export default function AnonymousChatRoomPage() {
  const { roomId } = useParams() as { roomId: string };
  const { user, loading: authLoading } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [nickname, setNickname] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roomDetails, setRoomDetails] = useState<AnonymousRoom | null>(null);
  const [isBanned, setIsBanned] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !roomId) return;

    const initializeRoom = async () => {
      try {
        // 채팅방 정보 가져오기
        const details = await getRoomDetails(roomId);
        setRoomDetails(details);

        // 차단 여부 확인
        const banned = await isUserBanned(roomId, user.uid);
        setIsBanned(banned);

        if (banned) {
          setError('이 채팅방에서 강퇴되었습니다.');
          return;
        }

        // 닉네임 할당
        const assignedNickname = await getOrAssignNickname(roomId, user.uid);
        setNickname(assignedNickname);
      } catch (err) {
        console.error('Error initializing room:', err);
        setError('채팅방 초기화 중 오류가 발생했습니다.');
      }
    };

    initializeRoom();
  }, [roomId, user]);

  useEffect(() => {
    if (!roomId) return;

    const messagesCollection = collection(
      db,
      'anonymous_rooms',
      roomId,
      'messages'
    );
    const q = query(messagesCollection, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedMessages = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Message[];
        setMessages(fetchedMessages);
      },
      (err) => {
        console.error('Error fetching messages:', err);
        setError('메시지를 불러오는 데 실패했습니다.');
      }
    );

    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !nickname) return;

    try {
      await sendMessage(roomId, user.uid, nickname, newMessage);
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('메시지 전송에 실패했습니다.');
    }
  };

  const handleBanUser = async (userIdToBan: string) => {
    if (!user || !roomDetails) return;

    try {
      await banUserFromRoom(roomId, userIdToBan, user.uid);
      alert('사용자가 강퇴되었습니다.');
    } catch (err: any) {
      console.error('Error banning user:', err);
      alert(err.message || '강퇴에 실패했습니다.');
    }
  };

  const isRoomCreator = user && roomDetails && user.uid === roomDetails.creatorId;

  if (authLoading || !nickname) {
    return <div className="flex items-center justify-center h-screen">채팅방에 입장하는 중...</div>;
  }

  if (isBanned) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">⛔ 접근 차단</h2>
          <p>이 채팅방에서 강퇴되었습니다.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen">오류: {error}</div>;
  }

  return (
    <div className="flex flex-col h-screen p-4 bg-gradient-to-br from-green-50 to-emerald-100">
      {/* 채팅방 헤더 */}
      <div className="mb-4 pb-4 border-b border-emerald-200">
        <h1 className="text-xl font-bold text-emerald-800">{roomDetails?.title || '채팅방'}</h1>
        <p className="text-sm text-emerald-600">
          카테고리: {roomDetails?.category || '일반'} | 
          참여자: {messages.length > 0 ? new Set(messages.map(m => m.nickname)).size : 0}/{roomDetails?.maxParticipants || 50}
          {isRoomCreator && <span className="ml-2 text-emerald-700 font-semibold bg-emerald-100 px-2 py-1 rounded-full text-xs">👑 방장</span>}
        </p>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-极 overflow-y-auto mb-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat ${
              msg.nickname === nickname ? 'chat-end' : 'chat-start'
            }`}
          >
            <div className="chat-header flex items-center gap-2 text-emerald-700">
              {msg.nickname}
              {isRoomCreator && msg.userId && msg.userId !== user?.uid && (
                <button
                  onClick={() => handleBanUser(msg.userId)}
                  className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-full transition-colors"
                  title="이 사용자 강퇴"
                >
                  🚫 강퇴
                </button>
              )}
            </div>
            <div className={`chat-bubble ${
              msg.nickname === nickname 
                ? 'bg-emerald-500 text-white' 
                : 'bg-white text-emerald-800 border border-emerald-200'
            }`}>
              {msg.text}
            </div>
            <div className="chat-footer opacity-50 text-emerald-500 text-xs">
              {msg.createdAt instanceof Timestamp
                ? msg.createdAt.toDate().toLocaleTimeString()
                : '방금 전'}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 메시지 입력 영역 */}
      <form onSubmit={handleSendMessage} className="flex gap-2 bg-white/80 backdrop-blur-sm p-2 rounded-xl border border-emerald-200">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="메시지를 입력하세요... (최대 500자)"
          maxLength={500}
          className="input flex-1 bg-transparent border-none focus:outline-none text-emerald-800 placeholder-emerald-400"
        />
        <button 
          type="submit" 
          className="btn bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
        >
          🌿 전송
        </button>
      </form>
    </div>
  );
}
