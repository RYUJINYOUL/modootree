'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { ArrowLeft, MessageCircle, Clock, Users, Trash2 } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp, doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';

export default function GreetingResponsesPage() {
  const { currentUser } = useSelector((state: any) => state.user);
  const [localUser, setLocalUser] = useState<any>(null);
  const [myGreetingResponses, setMyGreetingResponses] = useState<any[]>([]);
  const [allGreetingResponses, setAllGreetingResponses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');
  const [loading, setLoading] = useState(true);
  
  // 관리자 UID
  const ADMIN_UID = 'vW1OuC6qMweyOqu73N0558pv4b03';
  
  // 관리자 권한 확인
  const isAdmin = (currentUser?.uid || localUser?.uid) === ADMIN_UID;
  
  // 개별 유저 답변 삭제 함수 (관리자만)
  const handleDeleteUserResponse = async (dateStr: string, userId: string, userName: string) => {
    if (!isAdmin) {
      alert('관리자만 삭제할 수 있습니다.');
      return;
    }
    
    if (!confirm(`${userName}님의 ${dateStr} 답변을 삭제하시겠습니까?`)) {
      return;
    }
    
    try {
      // 1. 개인 저장소에서 삭제 (userId가 있는 경우에만)
      if (userId) {
        const userDocRef = doc(db, `users/${userId}/greetingResponses`, dateStr);
        try {
          await deleteDoc(userDocRef);
          console.log(`개인 저장소에서 ${userName}님의 ${dateStr} 답변 삭제 완료`);
        } catch (error) {
          console.warn('개인 저장소 삭제 실패 (문서가 없을 수 있음):', error);
        }
      }
      
      // 2. 공용 저장소에서 해당 유저 답변만 제거 (greetingResponses/{dateStr})
      const publicDocRef = doc(db, 'greetingResponses', dateStr);
      const publicDoc = await getDoc(publicDocRef);
      
      if (publicDoc.exists()) {
        const data = publicDoc.data();
        const responses = data.responses || [];
        
        // 해당 유저의 답변만 필터링해서 제거 (userName 기준)
        const filteredResponses = responses.filter(resp => 
          resp.userName !== userName
        );
        
        if (filteredResponses.length > 0) {
          await updateDoc(publicDocRef, { responses: filteredResponses });
          console.log(`공용 저장소에서 ${userName}님의 답변 제거 완료`);
        } else {
          // 모든 답변이 삭제되면 문서 자체를 삭제
          await deleteDoc(publicDocRef);
          console.log(`${dateStr} 날짜 문서 전체 삭제 완료`);
        }
      }
      
      alert('답변이 삭제되었습니다.');
      
      // 삭제 후 UI 즉시 업데이트
      if (activeTab === 'all') {
        // 모든 답변에서 해당 유저의 해당 날짜 답변 모두 제거
        setAllGreetingResponses(prev => 
          prev.filter(resp => !(resp.userName === userName && resp.dateStr === dateStr))
        );
      }
      
      // 내 답변도 업데이트 (삭제된 유저가 현재 사용자인 경우)
      const currentUserId = currentUser?.uid || localUser?.uid;
      if (userId === currentUserId || (!userId && activeTab === 'my')) {
        setMyGreetingResponses(prev => 
          prev.filter(resp => !(resp.userName === userName && resp.dateStr === dateStr))
        );
      }
      
    } catch (error) {
      console.error('답변 삭제 실패:', error);
      alert('답변 삭제 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setLocalUser(user);
      } else {
        setLocalUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // 개인 답변 구독
  useEffect(() => {
    const userId = currentUser?.uid || localUser?.uid;
    if (!userId) return;

    const today = new Date();
    const dateStr = new Date(today.getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // 오늘과 어제 개인 답변 가져오기
    const fetchMyResponses = async () => {
      try {
        let allMyResponses: any[] = [];
        
        // 오늘 데이터
        const todayDocRef = doc(db, `users/${userId}/greetingResponses`, dateStr);
        const todayDoc = await getDoc(todayDocRef);
        
        if (todayDoc.exists()) {
          const todayData = todayDoc.data();
          if (todayData.responses) {
            const todayResponses = todayData.responses.map((response: any, index: number) => ({
              id: `today-${index}`,
              ...response,
              userId: userId, // 유저 ID 추가
              dateStr: dateStr, // 날짜 문자열 추가
              timestamp: response.timestamp?.toDate ? response.timestamp.toDate() : new Date(response.timestamp) || new Date()
            }));
            allMyResponses = [...allMyResponses, ...todayResponses];
          }
        }
        
        // 어제 데이터
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = new Date(yesterday.getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
        const yesterdayDocRef = doc(db, `users/${userId}/greetingResponses`, yesterdayStr);
        const yesterdayDoc = await getDoc(yesterdayDocRef);
        
        if (yesterdayDoc.exists()) {
          const yesterdayData = yesterdayDoc.data();
          if (yesterdayData.responses) {
            const yesterdayResponses = yesterdayData.responses.map((response: any, index: number) => ({
              id: `yesterday-${index}`,
              ...response,
              userId: userId, // 유저 ID 추가
              dateStr: yesterdayStr, // 어제 날짜 문자열 추가
              timestamp: response.timestamp?.toDate ? response.timestamp.toDate() : new Date(response.timestamp) || new Date()
            }));
            allMyResponses = [...allMyResponses, ...yesterdayResponses];
          }
        }
        
        // 시간순 정렬
        allMyResponses.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setMyGreetingResponses(allMyResponses);
        setLoading(false);
        
      } catch (error) {
        console.error('개인 인사말 답변 구독 에러:', error);
        setLoading(false);
      }
    };

    fetchMyResponses();
  }, [currentUser?.uid, localUser?.uid]);

  // 전체 답변 구독
  useEffect(() => {
    const today = new Date();
    const dateStr = new Date(today.getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // 오늘과 어제 전체 답변 가져오기
    const fetchAllResponses = async () => {
      try {
        let allResponses: any[] = [];
        
        // 오늘 데이터
        const todayDocRef = doc(db, 'greetingResponses', dateStr);
        const todayDoc = await getDoc(todayDocRef);
        
        if (todayDoc.exists()) {
          const todayData = todayDoc.data();
          if (todayData.responses) {
            const todayResponses = todayData.responses.map((response: any, index: number) => ({
              id: `today-${index}`,
              ...response,
              dateStr: dateStr, // 날짜 문자열 추가
              timestamp: response.timestamp?.toDate ? response.timestamp.toDate() : new Date(response.timestamp) || new Date()
            }));
            allResponses = [...allResponses, ...todayResponses];
          }
        }
        
        // 어제 데이터
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = new Date(yesterday.getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
        const yesterdayDocRef = doc(db, 'greetingResponses', yesterdayStr);
        const yesterdayDoc = await getDoc(yesterdayDocRef);
        
        if (yesterdayDoc.exists()) {
          const yesterdayData = yesterdayDoc.data();
          if (yesterdayData.responses) {
            const yesterdayResponses = yesterdayData.responses.map((response: any, index: number) => ({
              id: `yesterday-${index}`,
              ...response,
              dateStr: yesterdayStr, // 어제 날짜 문자열 추가
              timestamp: response.timestamp?.toDate ? response.timestamp.toDate() : new Date(response.timestamp) || new Date()
            }));
            allResponses = [...allResponses, ...yesterdayResponses];
          }
        }
        
        // 시간순 정렬
        allResponses.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setAllGreetingResponses(allResponses);
        
      } catch (error) {
        console.error('전체 인사말 답변 구독 에러:', error);
      }
    };

    fetchAllResponses();
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  };

  const ResponseCard = ({ response, showUser = false }: { response: any; showUser?: boolean }) => (
    <div className="bg-[#2A4D45]/60 backdrop-blur-sm border border-[#358f80]/30 rounded-xl p-4 mb-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-[#56ab91]/20 flex items-center justify-center flex-shrink-0">
          <span className="text-sm text-[#56ab91] font-medium">
            {showUser ? response.userName.charAt(0).toUpperCase() : '나'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {showUser && (
                <span className="font-medium text-[#56ab91] text-sm">{response.userName}</span>
              )}
              <span className="text-xs text-gray-400">
                {formatTime(response.timestamp)}
              </span>
            </div>
            
            {/* 관리자 삭제 버튼 (모든 답변 탭에서만 표시) */}
            {isAdmin && activeTab === 'all' && (
              <button
                onClick={() => handleDeleteUserResponse(response.dateStr, response.userId || '', response.userName)}
                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                title={`${response.userName}님의 ${response.dateStr} 답변 삭제 (관리자)`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="text-gray-300 text-sm leading-relaxed mb-3">
            <div className="text-xs text-gray-400 mb-1">질문:</div>
            <div className="text-[#56ab91] mb-2">{response.greeting}</div>
            <div className="text-xs text-gray-400 mb-1">답변:</div>
            <div>{response.response}</div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex-1 md:p-6 py-6 overflow-auto">
        <div className="px-2 md:px-0">
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-[#56ab91] border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 md:p-6 py-6 overflow-auto">
      <div className="px-2 md:px-0 space-y-6">
        {/* 헤더 */}
        <div className="flex items-center gap-4">
          <Link 
            href="/profile" 
            className="p-2 hover:bg-[#358f80]/20 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#56ab91]" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">오늘의 답변들</h1>
            <p className="text-sm text-gray-400">{formatDate(new Date())}</p>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex bg-[#2A4D45]/60 backdrop-blur-sm border border-[#358f80]/30 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('my')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all ${
              activeTab === 'my'
                ? 'bg-[#56ab91]/20 text-[#56ab91] border border-[#56ab91]/30'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span className="font-medium">내 답변 ({myGreetingResponses.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all ${
              activeTab === 'all'
                ? 'bg-[#56ab91]/20 text-[#56ab91] border border-[#56ab91]/30'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="font-medium">모든 답변 ({allGreetingResponses.length})</span>
          </button>
        </div>

        {/* 답변 목록 */}
        <div className="space-y-4">
          {activeTab === 'my' ? (
            myGreetingResponses.length > 0 ? (
              myGreetingResponses.map((response) => (
                <ResponseCard key={response.id} response={response} showUser={false} />
              ))
            ) : (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">아직 답변이 없습니다.</p>
                <p className="text-sm text-gray-500 mt-1">프로필 페이지에서 질문에 답변해보세요!</p>
              </div>
            )
          ) : (
            allGreetingResponses.length > 0 ? (
              allGreetingResponses.map((response) => (
                <ResponseCard key={response.id} response={response} showUser={true} />
              ))
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">아직 답변이 없습니다.</p>
                <p className="text-sm text-gray-500 mt-1">첫 번째로 답변해보세요!</p>
              </div>
            )
          )}
        </div>

        {/* 통계 */}
        <div className="bg-[#2A4D45]/60 backdrop-blur-sm border border-[#358f80]/30 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#56ab91]" />
            오늘의 통계
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#56ab91]">{myGreetingResponses.length}</div>
              <div className="text-sm text-gray-400">내 답변 수</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#56ab91]">{allGreetingResponses.length}</div>
              <div className="text-sm text-gray-400">전체 답변 수</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
