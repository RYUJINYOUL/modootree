'use client';

import { useSelector } from 'react-redux';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Notebook, Book, ClipboardPlus, Atom, MessageSquare, TrendingUp, Users, Link as LinkIcon, Banana, Rocket, MessageCircle, Send, X, Download, Smartphone } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import { db } from '@/firebase';
import { collection, getDocs, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import ProfileRefreshWrapper from '@/components/ui/ProfileRefreshWrapper';

interface CategoryCounts {
  memo: number;
  diary: number;
  health: number;
  mind: number;
  chats: number;
  links: number;
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
    chats: 0,
    links: 0
  });
  const [countsLoading, setCountsLoading] = useState(true);
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [greetingResponses, setGreetingResponses] = useState<any[]>([]);
  const [myResponse, setMyResponse] = useState('');
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  // PWA 설치 이벤트 리스너
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsPWAInstalled(true);
      setDeferredPrompt(null);
    };

    // PWA 설치 상태 확인
    const checkPWAInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      setIsPWAInstalled(isStandalone || isInWebAppiOS);
    };

    // 모바일 환경 감지
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      setIsMobile(isMobileDevice);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    checkPWAInstalled();
    checkMobile();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
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
      
      const [memoCount, diaryCount, healthCount, mindCount, chatCount, linkCount] = await Promise.all([
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
          .catch(() => 0),
        
        // 링크 개수 - users/{userId}/linkpage
        getDocs(query(collection(db, `users/${userId}/linkpage`)))
          .then(snapshot => snapshot.size)
          .catch(() => 0)
      ]);

      setCounts({
        memo: memoCount,
        diary: diaryCount,
        health: healthCount,
        mind: mindCount,
        chats: chatCount,
        links: linkCount
      });
    } catch (error) {
      console.error('카테고리 카운트를 가져오는데 실패했습니다:', error);
      // 에러 시 0으로 설정
      setCounts({
        memo: 0,
        diary: 0,
        health: 0,
        mind: 0,
        chats: 0,
        links: 0
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

  // 링크 실시간 구독 (카운트 업데이트)
  useEffect(() => {
    const userId = currentUser?.uid || localUser?.uid;
    if (!userId) return;
    
    const linksQuery = query(collection(db, `users/${userId}/linkpage`));

    const unsubscribe = onSnapshot(linksQuery, (snapshot) => {
      // 링크 카운트만 업데이트
      setCounts(prev => ({
        ...prev,
        links: snapshot.size
      }));
    }, (error) => {
      console.error('링크 구독 에러:', error);
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
      icon: LinkIcon, 
      label: '링크', 
      href: '/profile/links',
      description: '저장된 링크와 북마크',
      color: 'bg-cyan-500/20 border-cyan-400/30',
      iconColor: 'text-cyan-400',
      key: 'links' as keyof CategoryCounts
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
        return '잠 못 이루는 새벽 이세요?';
    } else if (hour >= 6 && hour <= 8) {
        // 아침 시작: 06:00 - 09:59
        return '어제 잠은 잘 주무셨나요?';
    } else if (hour >= 9 && hour <= 11) {
        // 오전 활동: 10:00 - 11:59
        return '오늘 아침 식사는 하셨나요?';
    } else if (hour >= 12 && hour <= 13) {
        // 점심: 12:00 - 13:59
        return '오늘 맛있는 점심식사 하셨나요?';
    } else if (hour >= 14 && hour <= 16) {
        // 오후 활동/피곤: 14:00 - 17:59
        return '오늘 저녁 약속은 있으세요?';
    } else if (hour >= 17 && hour <= 18) {
        // 저녁: 18:00 - 20:59
        return '오늘 산책 또는 운동하셨나요?';
      } else if (hour >= 19 && hour <= 20) {
        // 저녁: 18:00 - 20:59
        return '오늘 산책 또는 운동 하셨나요?';
    } else { // 21:00 - 23:59 (밤/취침 전)
        return '오늘은 하루는 어떻게 보내셨나요?';
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

  // 이메일 표시 (실명 제거, 이메일만)
  const getDisplayName = (user: any) => {
    if (user.email) {
      const emailPrefix = user.email.split('@')[0];
      // 6자 초과 시 앞6자... 형태, 6자 이하면 전체 표시
      return emailPrefix.length > 6 ? `${emailPrefix.substring(0, 6)}...` : emailPrefix;
    }
    return '유저님';
  };

  // PWA 설치 핸들러 (PC 홈화면 추가)
  const handlePWAInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // PWA 프롬프트가 없을 때 안내 메시지
      alert('브라우저 주소창 오른쪽의 설치 아이콘을 클릭하거나, 브라우저 메뉴에서 "앱 설치" 또는 "홈 화면에 추가"를 선택하여 설치할 수 있습니다.');
    }
  };

  // 홈화면 추가 (모바일 PWA 설치)
  const handleAppStore = () => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      // iOS - 홈화면 추가 안내
      alert('Safari 메뉴에서 "홈 화면에 추가"를 선택하여 앱을 설치할 수 있습니다.');
    } else if (/android/i.test(userAgent)) {
      // Android - PWA 설치 프롬프트 또는 홈화면 추가 안내
      if (deferredPrompt) {
        handlePWAInstall();
      } else {
        alert('브라우저 메뉴에서 "홈 화면에 추가" 또는 "앱 설치"를 선택하여 앱을 설치할 수 있습니다.');
      }
    } else {
      // 기타 모바일 기기 - PWA 설치 시도
      handlePWAInstall();
    }
  };

  // 인사말 답변 제출
  const handleSubmitResponse = async () => {
    if (!myResponse.trim() || !currentUser?.uid) return;
    
    setIsSubmittingResponse(true);
    try {
      const currentGreeting = getGreeting();
      const displayName = getDisplayName(currentUser);
      
      const today = new Date();
      const dateStr = new Date(today.getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0]; // KST 날짜
      const currentHour = new Date().getHours();
      
      // TTL 설정 (2일 후 자동 삭제)
      const expireAt = new Date();
      expireAt.setDate(expireAt.getDate() + 2);
      
      const now = new Date();
      const responseData = {
        userName: displayName,
        userAvatar: currentUser.photoURL || '',
        greeting: currentGreeting,
        response: myResponse.trim(),
        timestamp: now,
        hour: currentHour,
        isAnonymous: false
      };
      
      // 유저별 날짜 문서에 저장 (배열로 관리)
      const userDateDocRef = doc(db, `users/${currentUser.uid}/greetingResponses`, dateStr);
      const userDateDoc = await getDoc(userDateDocRef);
      
      if (userDateDoc.exists()) {
        // 기존 날짜 문서에 응답 추가
        await updateDoc(userDateDocRef, {
          responses: arrayUnion(responseData),
          updatedAt: serverTimestamp()
        });
      } else {
        // 새 날짜 문서 생성
        await setDoc(userDateDocRef, {
          date: dateStr,
          responses: [responseData],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          expireAt: expireAt
        });
      }
      
      // 전체 공유용 컬렉션에도 저장 (커뮤니티 기능용)
      const sharedDateDocRef = doc(db, 'greetingResponses', dateStr);
      const sharedDateDoc = await getDoc(sharedDateDocRef);
      
      const sharedResponseData = {
        ...responseData,
        userId: currentUser.uid
      };
      
      if (sharedDateDoc.exists()) {
        await updateDoc(sharedDateDocRef, {
          responses: arrayUnion(sharedResponseData),
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(sharedDateDocRef, {
          date: dateStr,
          responses: [sharedResponseData],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          expireAt: expireAt
        });
      }
      
      setMyResponse('');
      setIsResponseModalOpen(false);
    } catch (error) {
      console.error('답변 저장 실패:', error);
      alert('답변 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  // 인사말 답변 실시간 구독 - 전체 답변 (커뮤니티용)
  useEffect(() => {
    const today = new Date();
    const dateStr = new Date(today.getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // 오늘과 어제 데이터 구독
    const todayDocRef = doc(db, 'greetingResponses', dateStr);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = new Date(yesterday.getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
    const yesterdayDocRef = doc(db, 'greetingResponses', yesterdayStr);

    const unsubscribeToday = onSnapshot(todayDocRef, (doc) => {
      let allResponses: any[] = [];
      
      if (doc.exists()) {
        const todayData = doc.data();
        if (todayData.responses) {
          allResponses = todayData.responses.map((response: any, index: number) => ({
            id: `today-${index}`,
            ...response,
            timestamp: response.timestamp?.toDate ? response.timestamp.toDate() : new Date(response.timestamp) || new Date()
          }));
        }
      }
      
      // 어제 데이터도 가져오기
      getDoc(yesterdayDocRef).then((yesterdayDoc) => {
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
        setGreetingResponses(allResponses);
      });
    }, (error) => {
      console.error('인사말 답변 구독 에러:', error);
    });

    return () => unsubscribeToday();
  }, []);


  return (
    <ProfileRefreshWrapper>
      <div className="flex-1 md:p-6 py-6 overflow-auto">
      <div className="px-2 md:px-0 space-y-6">
        {/* 환영 메시지 및 시간 */}
        <div className="bg-[#2A4D45]/60 backdrop-blur-sm border border-[#358f80]/30 rounded-xl p-6 mt-1">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <img 
                    src="/logos/m1.png" 
                    alt="모두트리" 
                    className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0"
                  />
                  <h1 className="text-sm sm:text-md font-medium text-white flex-1 min-w-0">
                    {getGreeting()}
                  </h1>
                  <div className="flex gap-2">
                    <Link
                      href="/profile/greeting-responses"
                      className="p-1.5 bg-blue-500/20 hover:bg-blue-500/40 rounded-full transition-colors flex-shrink-0"
                      title="답변 보기"
                    >
                      <MessageCircle className="w-4 h-4 text-blue-400" />
                    </Link>
                    <button
                      onClick={() => setIsResponseModalOpen(true)}
                      className="p-1.5 bg-[#56ab91]/20 hover:bg-[#56ab91]/40 rounded-full transition-colors flex-shrink-0"
                      title="답변하기"
                    >
                      <Send className="w-4 h-4 text-[#56ab91]" />
                    </button>
                  </div>
                </div>
                <div className="flex sm:flex-col gap-2 text-xs sm:text-sm text-gray-400 sm:text-right">
                  <div className="flex-1 sm:flex-none">
                    <span>{formatDate(currentTime)}</span>
                  </div>
                  <div className="flex-shrink-0">
                    <span>{formatTime(currentTime)}</span>
                  </div>
                </div>
              </div>
              
              {/* 전체 답변 목록 - 커뮤니티 */}
              {greetingResponses.length > 0 && (
                <div className="mt-3 space-y-2 max-h-32 overflow-y-auto">
                  <div className="text-xs text-gray-400 mb-1.5">💬 모든 사람들의 답변</div>
                  {greetingResponses.slice(0, 3).map((response) => (
                    <div key={response.id} className="bg-[#358f80]/10 rounded-lg p-2.5">
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-[#56ab91]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs text-[#56ab91] font-medium">
                            {response.userName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="font-medium text-[#56ab91] text-xs">{response.userName}</span>
                            <span className="text-xs text-gray-500">
                              {response.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="text-gray-300 text-xs leading-relaxed break-words">
                            {response.response}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {greetingResponses.length > 3 && (
                    <Link 
                      href="/profile/greeting-responses"
                      className="text-xs text-gray-400 hover:text-gray-300 text-center py-1 block transition-colors cursor-pointer"
                    >
                      +{greetingResponses.length - 3}개 더
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

           {/* 최근 활동 요약 */}
           <div className="bg-[#2A4D45]/60 backdrop-blur-sm border border-[#358f80]/30 rounded-xl py-6 px-2">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#56ab91]" />
            메모 현황
          </h2>
           <div className="grid grid-cols-3 gap-2 md:gap-4">
             <Link href="/profile/memo" className="bg-[#358f80]/60 border border-red-400/50 rounded-lg p-2 md:p-4 text-center hover:bg-[#358f80]/80 transition-colors cursor-pointer">
               <div className="text-xl md:text-3xl font-bold text-red-400 mb-1">{getTodoMemoCount()}</div>
               <div className="text-xs md:text-sm text-gray-200 font-medium">오늘</div>
             </Link>
             <Link href="/profile/memo" className="bg-[#358f80]/60 border border-[#56ab91]/30 rounded-lg p-2 md:p-4 text-center hover:bg-[#358f80]/80 transition-colors cursor-pointer">
               <div className="text-xl md:text-3xl font-bold text-[#56ab91] mb-1">{getTodayMemoCount()}</div>
               <div className="text-xs md:text-sm text-gray-200 font-medium">목록</div>
             </Link>
             <Link href="/profile/memo" className="bg-[#358f80]/60 border border-[#56ab91]/30 rounded-lg p-2 md:p-4 text-center hover:bg-[#358f80]/80 transition-colors cursor-pointer">
               <div className="text-xl md:text-3xl font-bold text-[#56ab91] mb-1">{getCompletedMemoCount()}</div>
               <div className="text-xs md:text-sm text-gray-200 font-medium">완료</div>
             </Link>
           </div>
          <div className="mt-4 text-center">
            <p className="text-gray-400 text-sm">
              오늘 메모 현황 입니다. 
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

            <Link href="/pros-menu" className="group bg-[#2A4D45]/60 backdrop-blur-sm border border-[#358f80]/30 rounded-xl p-6 hover:bg-[#2A4D45]/80 transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer block">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-500/20 border-orange-400/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Rocket className="w-6 h-6 text-orange-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-[#56ab91] transition-colors">
                    링크편지
                  </h3>
                  <p className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors">
                    퀴즈를 풀어야만 편지를 읽을 수 있습니다
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>

      </div>
      
      {/* 답변 모달 - 모바일 최적화 */}
      {isResponseModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-[#2A4D45] border-t border-[#358f80]/30 sm:border sm:border-[#358f80]/30 rounded-t-xl sm:rounded-xl p-4 sm:p-6 w-full max-w-md sm:max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">💬 답변하기</h3>
              <button
                onClick={() => setIsResponseModalOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="text-sm text-gray-300 mb-2">질문</div>
              <div className="text-white bg-[#358f80]/20 rounded-lg p-3 text-sm">
                {getGreeting()}
              </div>
            </div>
            
            <div className="mb-4">
              <div className="text-sm text-gray-300 mb-2">답변</div>
              <textarea
                value={myResponse}
                onChange={(e) => setMyResponse(e.target.value)}
                placeholder="솔직한 답변을 들려주세요..."
                className="w-full bg-[#358f80]/20 border border-[#358f80]/30 text-white rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#56ab91] placeholder-gray-400 text-sm"
                rows={4}
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setIsResponseModalOpen(false)}
                className="flex-1 bg-gray-600/50 hover:bg-gray-600/70 text-white rounded-lg py-3 px-4 transition-colors text-sm font-medium"
                disabled={isSubmittingResponse}
              >
                취소
              </button>
              <button
                onClick={handleSubmitResponse}
                disabled={!myResponse.trim() || isSubmittingResponse}
                className="flex-1 bg-[#56ab91]/60 hover:bg-[#56ab91]/80 text-white rounded-lg py-3 px-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
              >
                {isSubmittingResponse ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    답변하기
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 플로팅 버튼들 */}
       <div className="fixed bottom-5 left-3 flex flex-col gap-2 z-40">
           {/* 앱 스토어 버튼 - 모바일에서만 노출 */}
           {isMobile && (
             <button
               onClick={handleAppStore}
               className="w-8 h-8 bg-green-500 hover:bg-green-400/90 text-white rounded-full shadow-md flex items-center justify-center transition-all duration-200 hover:scale-105"
               title="홈화면에 추가"
             >
               <Smartphone className="w-4 h-4" />
             </button>
           )}
         {/* PWA 설치 버튼 - PC에서만 노출 */}
         {!isMobile && (
           <button
             onClick={handlePWAInstall}
             className="w-8 h-8 bg-blue-500 hover:bg-blue-400/90 text-white rounded-full shadow-md flex items-center justify-center transition-all duration-200 hover:scale-105"
             title="PC에 앱 설치"
           >
             <Download className="w-4 h-4" />
           </button>
         )}
       </div>
      </div>
    </ProfileRefreshWrapper>
  );
}