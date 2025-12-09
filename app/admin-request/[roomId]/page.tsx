'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useSelector } from 'react-redux';
import { Send, Lock, Shield, MessageCircle, ArrowLeft } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  senderName: string;
  senderType: 'user' | 'admin';
  createdAt: any;
}

interface AdminRoom {
  id: string;
  title: string;
  password: string;
  creatorName: string;
  createdAt: any;
  isActive: boolean;
  adminUid: string;
}

export default function AdminRequestRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentUser } = useSelector((state: any) => state.user);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [room, setRoom] = useState<AdminRoom | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [welcomeMessageSent, setWelcomeMessageSent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const ADMIN_UID = 'vW1OuC6qMweyOqu73N0558pv4b03';
  const isAdmin = currentUser?.uid === ADMIN_UID;

  useEffect(() => {
    const loadRoom = async () => {
      try {
        const roomDoc = await getDoc(doc(db, 'admin-request-rooms', resolvedParams.roomId));
        if (!roomDoc.exists()) {
          alert('존재하지 않는 방입니다.');
          router.push('/anonymous-chat');
          return;
        }

        const roomData = { id: roomDoc.id, ...roomDoc.data() } as AdminRoom;
        setRoom(roomData);

        // URL에서 비밀번호 확인 또는 관리자 권한 확인
        const urlPassword = searchParams.get('password');
        console.log('인증 확인:', { isAdmin, urlPassword, roomPassword: roomData.password }); // 디버깅용
        
        if (isAdmin || (urlPassword && urlPassword === roomData.password)) {
          setIsAuthenticated(true);
          console.log('인증 성공'); // 디버깅용
        } else {
          console.log('인증 필요'); // 디버깅용
        }
      } catch (error) {
        console.error('방 로드 실패:', error);
        alert('방을 불러오는데 실패했습니다.');
        router.push('/anonymous-chat');
      } finally {
        setIsLoading(false);
      }
    };

    loadRoom();
  }, [resolvedParams.roomId, searchParams, isAdmin, router]);

  // 자동 환영 메시지 전송
  const sendWelcomeMessage = async () => {
    const welcomeMessage = `안녕하세요, 모두트리 입니다. 
채팅방 같은 ui이지만, 
채팅방 아닙니다.

진행 사항만 알려드립니다.

찾아주셔서 감사드립니다.

■ 편지링크 주소 :

■ 발송일자 : 

■ 받는분 : (sns 또는 모바일 또는 이메일 등등) - 희망선택

■ 전송 시 전하고 싶은 말 : 희망 선택`;


    try {
      await addDoc(collection(db, 'admin-request-messages'), {
        roomId: resolvedParams.roomId,
        content: welcomeMessage,
        senderName: '모두트리 관리자',
        senderType: 'admin',
        createdAt: serverTimestamp()
      });
      console.log('환영 메시지 전송 완료');
    } catch (error) {
      console.error('환영 메시지 전송 실패:', error);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !room) return;

    // 메시지 실시간 구독 (Index 문제 방지를 위해 orderBy 제거 후 클라이언트에서 정렬)
    const q = query(
      collection(db, 'admin-request-messages'),
      where('roomId', '==', resolvedParams.roomId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as Message[];
      
      // 클라이언트에서 시간순 정렬
      messagesList.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return a.createdAt.seconds - b.createdAt.seconds;
      });
      
      console.log('메시지 로드됨:', messagesList); // 디버깅용
      setMessages(messagesList);
      
      // 메시지가 없고 환영 메시지를 아직 보내지 않았으면 자동 전송 (한 번만)
      if (messagesList.length === 0 && !welcomeMessageSent) {
        setWelcomeMessageSent(true);
        setTimeout(() => {
          sendWelcomeMessage();
        }, 1000); // 1초 후 환영 메시지 전송
      }
      
      // 새 메시지가 있을 때 스크롤을 맨 아래로 이동
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (error) => {
      console.error('메시지 구독 오류:', error);
    });

    return () => unsubscribe();
  }, [isAuthenticated, room, resolvedParams.roomId]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === room?.password) {
      setIsAuthenticated(true);
    } else {
      alert('비밀번호가 틀렸습니다.');
      setPasswordInput('');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const messageData = {
        roomId: resolvedParams.roomId,
        content: newMessage.trim(),
        senderName: isAdmin ? '모두트리 관리자' : room?.creatorName || '사용자',
        senderType: isAdmin ? 'admin' : 'user',
        createdAt: serverTimestamp()
      };
      
      console.log('메시지 전송 시도:', messageData); // 디버깅용
      
      await addDoc(collection(db, 'admin-request-messages'), messageData);
      
      console.log('메시지 전송 성공'); // 디버깅용
      setNewMessage('');
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      alert('메시지 전송에 실패했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-indigo-600">로딩 중...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-indigo-200 w-full max-w-md">
          <div className="text-center mb-6">
            <Lock className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-indigo-800">방 입장</h2>
            <p className="text-indigo-600 mt-2">비밀번호를 입력하세요</p>
            {room && (
              <p className="text-sm text-indigo-500 mt-2">"{room.title}"</p>
            )}
          </div>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="방 비밀번호"
              className="w-full px-4 py-3 rounded-lg border border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-black"
              required
            />
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              입장하기
            </button>
            <button
              type="button"
              onClick={() => router.push('/anonymous-chat')}
              className="w-full text-indigo-600 hover:text-indigo-800 py-2 text-sm"
            >
              목록으로 돌아가기
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* 헤더 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-indigo-200 p-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/anonymous-chat')}
              className="text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-indigo-800 flex items-center gap-2">
                {isAdmin ? (
                  <Shield className="w-5 h-5 text-green-600" />
                ) : (
                  <MessageCircle className="w-5 h-5" />
                )}
                {room?.title}
              </h1>
              <p className="text-sm text-indigo-600">
                {isAdmin ? '관리자 모드' : `신청자: ${room?.creatorName}`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-indigo-500">
              {room?.createdAt?.toDate?.()?.toLocaleDateString('ko-KR')}
            </p>
          </div>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-indigo-300 mx-auto mb-4" />
              <p className="text-indigo-500">
                {isAdmin ? '사용자의 메시지를 기다리고 있습니다.' : '관리자에게 첫 메시지를 보내보세요!'}
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderType === 'admin' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-sm lg:max-w-lg px-4 py-3 rounded-lg ${
                    message.senderType === 'admin'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-indigo-800 border border-indigo-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium">
                      {message.senderName}
                    </p>
                    {message.senderType === 'admin' && (
                      <Shield className="w-3 h-3" />
                    )}
                  </div>
                  <p className="break-words whitespace-pre-line text-sm leading-relaxed">{message.content}</p>
                  <p className={`text-xs mt-2 ${
                    message.senderType === 'admin' ? 'text-indigo-200' : 'text-indigo-400'
                  }`}>
                    {message.createdAt?.toDate?.()?.toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
          {/* 스크롤 자동 이동을 위한 참조 요소 */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 메시지 입력 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-indigo-200 p-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={isAdmin ? "관리자 메시지를 입력하세요..." : "메시지를 입력하세요..."}
              className="flex-1 px-4 py-3 rounded-lg border border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 bg-white text-black"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={isSending || !newMessage.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          {isAdmin && (
            <p className="text-xs text-indigo-500 mt-2 text-center">
              관리자로 로그인되어 있습니다
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
