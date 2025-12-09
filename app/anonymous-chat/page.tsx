'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MessageCircle, Lock, Users, Shield, Trash2, Home } from 'lucide-react';
import Link from 'next/link';
import { useSelector } from 'react-redux';

interface AdminRoom {
  id: string;
  title: string;
  password: string;
  creatorName: string;
  createdAt: any;
  isActive: boolean;
  adminUid: string;
}

export default function AdminRequestPage() {
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [title, setTitle] = useState('');
  const [password, setPassword] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const { currentUser } = useSelector((state: any) => state.user);

  // 관리자 UID 설정
  const ADMIN_UID = 'vW1OuC6qMweyOqu73N0558pv4b03';
  const isAdmin = currentUser?.uid === ADMIN_UID;

  useEffect(() => {
    // 활성 상태인 신청방들만 가져오기
    const q = query(
      collection(db, 'admin-request-rooms'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AdminRoom[];
      setRooms(roomsList);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !password.trim() || !creatorName.trim()) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    if (password.length < 4) {
      alert('비밀번호는 4자리 이상 입력해주세요.');
      return;
    }

    setIsCreating(true);
    try {
      const roomData = {
        title: title.trim(),
        password: password.trim(),
        creatorName: creatorName.trim(),
        createdAt: serverTimestamp(),
        isActive: true,
        adminUid: ADMIN_UID,
        // 보안을 위한 추가 필드
        createdBy: 'anonymous',
        ipAddress: typeof window !== 'undefined' ? 'client' : 'unknown' // 실제 구현시 서버에서 처리
      };

      const docRef = await addDoc(collection(db, 'admin-request-rooms'), roomData);
      
      // 방 생성 후 해당 방으로 이동 (비밀번호와 함께)
      router.push(`/admin-request/${docRef.id}?password=${password}`);
    } catch (error) {
      console.error('방 생성 실패:', error);
      alert('방 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  // 관리자 신청방 삭제 함수
  const handleDeleteRoom = async (roomId: string, roomTitle: string, e: React.MouseEvent) => {
    e.preventDefault(); // Link 클릭 방지
    e.stopPropagation();
    
    if (!isAdmin) {
      alert('관리자만 삭제할 수 있습니다.');
      return;
    }

    const confirmed = window.confirm(`"${roomTitle}" 신청방을 정말 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`);
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'admin-request-rooms', roomId));
      alert('신청방이 성공적으로 삭제되었습니다.');
    } catch (error) {
      console.error('신청방 삭제 실패:', error);
      alert('신청방 삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <div 
      className="min-h-screen px-4 py-8 md:py-12"
      style={{
        backgroundImage: 'url(/back/back.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/20"></div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        <h1 className="text-3xl font-bold mb-6 text-white text-center drop-shadow-lg flex items-center justify-center gap-3">
          🌳 모두트리 링크편지 신청하세요
          {isAdmin && (
            <span className="text-sm bg-yellow-500 text-black px-3 py-1 rounded-full font-medium flex items-center gap-1">
              <Shield className="w-3 h-3" />
            
            </span>
          )}
        </h1>
        
        <p className="text-center text-white/90 mb-8 drop-shadow-md">
          링크편지 생성 부터 전송까지 진행사항을 알려 드립니다
        </p>

        {/* 신청방 생성 폼 */}
        <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-xl mb-8 border border-white/30">
          <h2 className="text-xl font-semibold mb-4 text-indigo-800 flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            비로그인으로 신청 가능합니다.
          </h2>
          
          <form onSubmit={handleCreateRoom} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-indigo-600">
                신청자 이름
              </label>
              <input
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="실명 또는 닉네임을 입력하세요"
                className="w-full px-4 py-2 rounded-lg bg-white/70 border border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-indigo-800"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-indigo-600">
                신청 제목
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 서비스 이용 문의, 제휴 신청 등"
                className="w-full px-4 py-2 rounded-lg bg-white/70 border border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-indigo-800"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-indigo-600 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                방 비밀번호 (4자리 이상)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="재입장 시 필요한 비밀번호를 설정하세요"
                className="w-full px-4 py-2 rounded-lg bg-white/70 border border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-indigo-800"
                minLength={4}
                required
              />
              <p className="text-xs text-indigo-500 mt-1">
                * 이 비밀번호로 언제든 다시 입장할 수 있습니다
              </p>
            </div>
            
            <button
              type="submit"
              disabled={isCreating}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50"
            >
              {isCreating ? '생성 중...' : '🚀 신청방 만들기'}
            </button>
          </form>
        </div>

        {/* 기존 신청방 목록 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2 drop-shadow-lg">
            <Users className="w-5 h-5" />
            진행 중 ({rooms.length})
          </h2>
          
          {rooms.length > 0 ? (
            <div className="grid gap-4">
              {rooms.map((room) => (
                <div key={room.id} className="relative">
                  <Link
                    href={`/admin-request/${room.id}`}
                    className="block p-6 bg-white/90 backdrop-blur-md rounded-xl border border-white/30 hover:bg-white/95 transition-all duration-300 hover:shadow-xl hover:border-white/50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg text-indigo-800 flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          {room.title}
                        </h3>
                        <p className="text-sm text-indigo-600 mt-1">
                          신청자: {room.creatorName}
                        </p>
                        <p className="text-xs text-indigo-500 mt-1">
                          {room.createdAt?.toDate?.()?.toLocaleString('ko-KR')}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-xs text-green-600 bg-green-100 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          진행중
                        </span>
                        <span className="text-xs text-indigo-400">클릭하여 입장</span>
                      </div>
                    </div>
                  </Link>
                  
                  {/* 관리자 삭제 버튼 */}
                  {isAdmin && (
                    <button
                      onClick={(e) => handleDeleteRoom(room.id, room.title, e)}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110 z-10"
                      title="신청방 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 bg-white/90 backdrop-blur-md rounded-xl border border-white/30 shadow-xl">
              <div className="text-5xl mb-4">🌳</div>
              <p className="text-indigo-700 font-medium">현재 진행 중인 신청방이 없습니다.</p>
              <p className="text-sm text-indigo-600 mt-2">첫 번째 신청방을 만들어보세요!</p>
            </div>
          )}
        </div>
      </div>
      
      {/* 하단 여백 */}
      <div className="pb-8 md:pb-12"></div>
      
      {/* 홈으로 가는 플로팅 버튼 */}
      <Link
        href="/"
        className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 z-50"
        title="홈으로 가기"
      >
        <Home className="w-6 h-6" />
      </Link>
    </div>
  );
}
