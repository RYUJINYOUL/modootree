'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { ArrowLeft, MessageCircle, Clock, Users } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp, doc, getDoc } from 'firebase/firestore';

export default function GreetingResponsesPage() {
  const { currentUser } = useSelector((state: any) => state.user);
  const [localUser, setLocalUser] = useState<any>(null);
  const [myGreetingResponses, setMyGreetingResponses] = useState<any[]>([]);
  const [allGreetingResponses, setAllGreetingResponses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');
  const [loading, setLoading] = useState(true);

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
          <div className="flex items-center gap-2 mb-2">
            {showUser && (
              <span className="font-medium text-[#56ab91] text-sm">{response.userName}</span>
            )}
            <span className="text-xs text-gray-400">
              {formatTime(response.timestamp)}
            </span>
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
