'use client';

import { useSelector } from 'react-redux';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Notebook, Book, ClipboardPlus, Atom, MessageSquare, TrendingUp, Users, Banana, Rocket } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, onSnapshot } from 'firebase/firestore';

interface CategoryCounts {
  memo: number;
  diary: number;
  health: number;
  mind: number;
  chats: number;
}

interface MemoItem {
  id: string;
  content: string;
  date: Date;
  status: 'todo' | 'today' | 'completed';
  images?: string[];
}

export default function ProfilePage() {
  const { currentUser } = useSelector((state: any) => state.user);
  const [localUser, setLocalUser] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [counts, setCounts] = useState<CategoryCounts>({
    memo: 0,
    diary: 0,
    health: 0,
    mind: 0,
    chats: 0
  });
  const [countsLoading, setCountsLoading] = useState(true);
  const [memos, setMemos] = useState<MemoItem[]>([]);

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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 카테고리별 게시물 수 가져오기
  const fetchCategoryCounts = async (userId: string) => {
    try {
      setCountsLoading(true);
      
      const [memoCount, diaryCount, healthCount, mindCount, chatCount] = await Promise.all([
        // 메모 개수 - users/{userId}/private_memos
        getDocs(query(collection(db, `users/${userId}/private_memos`)))
          .then(snapshot => snapshot.size)
          .catch(() => 0),
        
        // 일기 개수 - users/{userId}/private_diary
        getDocs(query(collection(db, `users/${userId}/private_diary`)))
          .then(snapshot => snapshot.size)
          .catch(() => 0),
        
        // 건강 기록 개수 - health_records 컬렉션에서 userId로 필터링
        getDocs(query(collection(db, 'health_records'), where('userId', '==', userId)))
          .then(snapshot => snapshot.size)
          .catch(() => 0),
        
        // AI 분석 개수 - users/{userId}/analysis
        getDocs(query(collection(db, `users/${userId}/analysis`)))
          .then(snapshot => snapshot.size)
          .catch(() => 0),
        
        // AI 채팅 기록 개수 - users/{userId}/chat_diaries
        getDocs(query(collection(db, `users/${userId}/chat_diaries`)))
          .then(snapshot => snapshot.size)
          .catch(() => 0)
      ]);

      setCounts({
        memo: memoCount,
        diary: diaryCount,
        health: healthCount,
        mind: mindCount,
        chats: chatCount
      });
    } catch (error) {
      console.error('카테고리 카운트를 가져오는데 실패했습니다:', error);
      // 에러 시 0으로 설정
      setCounts({
        memo: 0,
        diary: 0,
        health: 0,
        mind: 0,
        chats: 0
      });
    } finally {
      setCountsLoading(false);
    }
  };

  // 사용자가 로그인되면 카운트 가져오기
  useEffect(() => {
    if (currentUser?.uid) {
      fetchCategoryCounts(currentUser.uid);
    } else if (localUser?.uid) {
      fetchCategoryCounts(localUser.uid);
    }
  }, [currentUser?.uid, localUser?.uid]);

  // 메모 실시간 구독
  useEffect(() => {
    const userId = currentUser?.uid || localUser?.uid;
    if (!userId) return;
    
    const q = query(
      collection(db, `users/${userId}/private_memos`),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMemos = snapshot.docs.map(doc => ({
        id: doc.id,
        content: doc.data().content || '',
        status: doc.data().status as 'todo' | 'today' | 'completed',
        date: doc.data().date?.toDate() || new Date(),
        images: doc.data().images || []
      }));
      setMemos(loadedMemos);
    }, (error) => {
      console.error('메모 구독 에러:', error);
    });

    return () => unsubscribe();
  }, [currentUser?.uid, localUser?.uid]);


  const menuItems = [
    { 
      icon: Notebook, 
      label: '메모', 
      href: '/profile/memo',
      description: '빠른 메모와 아이디어 기록',
      color: 'bg-blue-500/20 border-blue-400/30',
      iconColor: 'text-blue-400',
      key: 'memo' as keyof CategoryCounts
    },
    { 
      icon: Book, 
      label: '일기', 
      href: '/profile/diary',
      description: '일상과 감정을 기록하세요',
      color: 'bg-purple-500/20 border-purple-400/30',
      iconColor: 'text-purple-400',
      key: 'diary' as keyof CategoryCounts
    },
    { 
      icon: ClipboardPlus, 
      label: '건강', 
      href: '/profile/health',
      description: '건강 상태와 운동 기록',
      color: 'bg-green-500/20 border-green-400/30',
      iconColor: 'text-green-400',
      key: 'health' as keyof CategoryCounts
    },
    { 
      icon: Atom, 
      label: '분석', 
      href: '/profile/mind',
      description: 'AI 대화 분석과 인사이트',
      color: 'bg-orange-500/20 border-orange-400/30',
      iconColor: 'text-orange-400',
      key: 'mind' as keyof CategoryCounts
    },
    { 
      icon: MessageSquare, 
      label: '기록', 
      href: '/profile/chats',
      description: '대화 기록과 히스토리',
      color: 'bg-pink-500/20 border-pink-400/30',
      iconColor: 'text-pink-400',
      key: 'chats' as keyof CategoryCounts
    }
  ];

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: '2-digit',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };


  const getGreeting = () => {
    // currentTime은 이미 컴포넌트 상태에서 관리되고 있으므로, 그 값을 사용합니다.
    const hour = currentTime.getHours(); 

    if (hour >= 0 && hour <= 5) {
        // 심야: 00:00 - 05:59
        return '잠 못 이루는 새벽이세요?';
    } else if (hour >= 6 && hour <= 9) {
        // 아침 시작: 06:00 - 09:59
        return '어제 잠은 잘 주무셨나요?';
    } else if (hour >= 10 && hour <= 11) {
        // 오전 활동: 10:00 - 11:59
        return '오늘 아침 식사는 하셨나요?';
    } else if (hour >= 12 && hour <= 13) {
        // 점심: 12:00 - 13:59
        return '오늘 맛있는 점심식사 하셨나요?';
    } else if (hour >= 14 && hour <= 17) {
        // 오후 활동/피곤: 14:00 - 17:59
        return '오늘 저녁 약속은 있으세요?';
    } else if (hour >= 18 && hour <= 20) {
        // 저녁: 18:00 - 20:59
        return '오늘 저녁 식사 후 산책 또는 운동하셨나요?';
    } else { // 21:00 - 23:59 (밤/취침 전)
        return '오늘은 어떠셨나요?';
    }
};

  // 메모 상태별 카운트 함수들
  const getTodayMemoCount = () => {
    return memos.filter(memo => memo.status === 'today').length;
  };

  const getCompletedMemoCount = () => {
    return memos.filter(memo => memo.status === 'completed').length;
  };

  const getTodoMemoCount = () => {
    const today = new Date();
    const todayStr = today.toDateString();
    return memos.filter(memo => memo.date.toDateString() === todayStr).length;
  };

  return (
    <div className="flex-1 md:p-6 py-6 overflow-auto">
      <div className="px-2 md:px-0 space-y-6">
        {/* 환영 메시지 및 시간 */}
        <div className="bg-[#2A4D45]/60 backdrop-blur-sm border border-[#358f80]/30 rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img 
                    src="/logos/m1.png" 
                    alt="모두트리" 
                    className="w-8 h-8"
                  />
                  <h1 className="text-md font-medium text-white">
                    {getGreeting()}
                  </h1>
                </div>
                <div className="hidden md:flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-gray-400 text-right">
                  <div>
                    <span>{formatDate(currentTime)}</span>
                  </div>
                  <div>
                    <span>{formatTime(currentTime)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

           {/* 최근 활동 요약 */}
           <div className="bg-[#2A4D45]/60 backdrop-blur-sm border border-[#358f80]/30 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#56ab91]" />
            메모 현황
          </h2>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <Link href="/profile/memo" className="bg-[#358f80]/60 border border-red-400/50 rounded-lg p-4 text-center hover:bg-[#358f80]/80 transition-colors cursor-pointer">
               <div className="text-3xl font-bold text-red-400 mb-1">{getTodoMemoCount()}</div>
               <div className="text-sm text-gray-200 font-medium">오늘</div>
             </Link>
             <Link href="/profile/memo" className="bg-[#358f80]/60 border border-[#56ab91]/30 rounded-lg p-4 text-center hover:bg-[#358f80]/80 transition-colors cursor-pointer">
               <div className="text-3xl font-bold text-[#56ab91] mb-1">{getTodayMemoCount()}</div>
               <div className="text-sm text-gray-200 font-medium">목록</div>
             </Link>
             <Link href="/profile/memo" className="bg-[#358f80]/60 border border-[#56ab91]/30 rounded-lg p-4 text-center hover:bg-[#358f80]/80 transition-colors cursor-pointer">
               <div className="text-3xl font-bold text-[#56ab91] mb-1">{getCompletedMemoCount()}</div>
               <div className="text-sm text-gray-200 font-medium">완료</div>
             </Link>
           </div>
          <div className="mt-4 text-center">
            <p className="text-gray-400 text-sm">
              오늘도 좋은 하루 보내세요! 언제든지 기록하고 분석해보세요.
            </p>
          </div>
         </div>

        {/* 빠른 액세스 카드들 */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#56ab91]" />
            기록 현황
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className="group bg-[#2A4D45]/60 backdrop-blur-sm border border-[#358f80]/30 rounded-xl p-6 hover:bg-[#2A4D45]/80 transition-all duration-200 hover:scale-105 hover:shadow-lg"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${item.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <item.icon className={`w-6 h-6 ${item.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-[#56ab91] transition-colors">
                      {item.label}
                    </h3>
                    <p className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors">
                      {item.description}
                    </p>
                  </div>
                  <div className="text-right">
                    {countsLoading ? (
                      <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    ) : (
                      <>
                        <div className="text-2xl font-bold text-[#56ab91]">
                          {counts[item.key]}
                        </div>
                        <div className="text-xs text-gray-400">
                          게시물
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

          {/* 커뮤니티 섹션 */}
          <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#56ab91]" />
            커뮤니티
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/news-vote" className="group bg-[#2A4D45]/60 backdrop-blur-sm border border-[#358f80]/30 rounded-xl p-6 hover:bg-[#2A4D45]/80 transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer block">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-500/20 border-yellow-400/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Banana className="w-6 h-6 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-[#56ab91] transition-colors">
                    뉴스투표
                  </h3>
                  <p className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors">
                    오늘의 주요 뉴스를 투표로 읽어보세요
                  </p>
                </div>
              </div>
            </Link>

            <Link href="/modoo-vote" className="group bg-[#2A4D45]/60 backdrop-blur-sm border border-[#358f80]/30 rounded-xl p-6 hover:bg-[#2A4D45]/80 transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer block">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-500/20 border-orange-400/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <Rocket className="w-6 h-6 text-orange-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-[#56ab91] transition-colors">
                    공감투표
                  </h3>
                  <p className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors">
                    세상 사연 공감 투표를 참여해보세요
                  </p>
                </div>
              </div>
            </Link>

            <Link href="/photo-story" className="group bg-[#2A4D45]/60 backdrop-blur-sm border border-[#358f80]/30 rounded-xl p-6 hover:bg-[#2A4D45]/80 transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer block">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-500/20 border-yellow-400/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Banana className="w-6 h-6 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-[#56ab91] transition-colors">
                    사진투표
                  </h3>
                  <p className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors">
                    일상 사진의 재밌는 스토리를 투표하세요
                  </p>
                </div>
              </div>
            </Link>

            <Link href="/profile/inquiry" className="group bg-[#2A4D45]/60 backdrop-blur-sm border border-[#358f80]/30 rounded-xl p-6 hover:bg-[#2A4D45]/80 transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer block">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-500/20 border-orange-400/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Rocket className="w-6 h-6 text-orange-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-[#56ab91] transition-colors">
                    열린게시판
                  </h3>
                  <p className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors">
                    모두트리 열린게시판, 말씀 감사합니다.
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}