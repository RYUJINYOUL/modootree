'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { loadSlim } from "tsparticles-slim";
import Particles from "react-tsparticles";
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Heart, Gift, Users, Baby, MessageCircle, Plus, Eye, Share2, ArrowLeft, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight, Settings, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import LoginOutButton from '@/components/ui/LoginOutButton';
import { useSelector } from 'react-redux';

interface LinkLetter {
  id: string;
  title: string;
  category: 'confession' | 'gratitude' | 'friendship' | 'filial' | 'apology' | 'celebration';
  content: string;
  quiz: {
    questions?: {
      question: string;
      options: string[];
      correctAnswer: number;
      hint: string;
    }[];
    // 기존 단일 퀴즈 호환성
    question?: string;
    options?: string[];
    correctAnswer?: number;
    hint?: string;
  };
  author: {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
  };
  recipient?: {
    email: string;
    name?: string;
  };
  isPublic: boolean;
  viewCount: number;
  likeCount: number;
  createdAt: Date;
  expiresAt?: Date;
  scheduledAt?: Date;
  background?: {
    type: 'color' | 'gradient' | 'image' | 'default';
    value?: string;
  };
}

interface LinkLetterBackground {
  type: 'image' | 'color' | 'gradient' | 'none';
  value?: string;
  animation?: boolean;
}

const ParticlesComponent = () => {
  const particlesInit = useCallback(async (engine: any) => {
    await loadSlim(engine);
  }, []);

  return (
    <Particles
      className="absolute inset-0 pointer-events-none"
      init={particlesInit}
      options={{
        background: {
          color: "transparent"
        },
        fpsLimit: 120,
        particles: {
          color: {
            value: ["#ff6b9d", "#c44569", "#f8b500", "#6c5ce7", "#a29bfe", "#fd79a8"]
          },
          collisions: {
            enable: false
          },
          move: {
            direction: "none",
            enable: true,
            outModes: {
              default: "out"
            },
            random: true,
            speed: 0.3,
            straight: false,
            attract: {
              enable: true,
              rotateX: 600,
              rotateY: 1200
            }
          },
          number: {
            density: {
              enable: true,
              area: 800
            },
            value: 80
          },
          opacity: {
            animation: {
              enable: true,
              minimumValue: 0.1,
              speed: 1,
              sync: false
            },
            random: true,
            value: { min: 0.1, max: 0.4 }
          },
          shape: {
            type: ["circle", "triangle", "polygon"]
          },
          size: {
            animation: {
              enable: true,
              minimumValue: 0.1,
              speed: 2,
              sync: false
            },
            random: true,
            value: { min: 1, max: 3 }
          }
        },
        detectRetina: true,
        interactivity: {
          events: {
            onHover: {
              enable: true,
              mode: "bubble"
            }
          },
          modes: {
            bubble: {
              distance: 200,
              duration: 2,
              opacity: 0.6,
              size: 5
            }
          }
        }
      }}
    />
  );
};

const letterCategories = [
  { id: 'confession', name: '고백', icon: Heart, color: 'bg-gradient-to-br from-pink-500 to-rose-600', image: '/tabs/love.png' },
  { id: 'gratitude', name: '감사', icon: Gift, color: 'bg-gradient-to-br from-green-500 to-emerald-600', image: '/tabs/congrats.png' },
  { id: 'friendship', name: '우정', icon: Users, color: 'bg-gradient-to-br from-blue-500 to-cyan-600', image: '/tabs/friend.png' },
  { id: 'filial', name: '효도', icon: Baby, color: 'bg-gradient-to-br from-purple-500 to-violet-600', image: '/tabs/family.png' },
  { id: 'apology', name: '사과', icon: MessageCircle, color: 'bg-gradient-to-br from-orange-500 to-amber-600', image: '/tabs/sorry.png' },
  { id: 'celebration', name: '축하', icon: Plus, color: 'bg-gradient-to-br from-yellow-500 to-orange-500', image: '/tabs/cong.png' }
];

export default function LinkLetterDetailPage() {
  const router = useRouter();
  const params = useParams();
  const letterId = params.letterId as string;
  const currentUser = useSelector((state: any) => state.user.currentUser);
  
  const [letter, setLetter] = useState<LinkLetter | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuiz, setShowQuiz] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizPassed, setQuizPassed] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0); // 현재 퀴즈 인덱스
  const [completedQuizzes, setCompletedQuizzes] = useState<number[]>([]); // 완료된 퀴즈들
  const [currentImageIndex, setCurrentImageIndex] = useState(0); // 현재 이미지 인덱스
  const [userBackground, setUserBackground] = useState<LinkLetterBackground | null>(null); // 사용자 배경 설정
  const [linkCopied, setLinkCopied] = useState(false); // 링크 복사 상태
  const maxAttempts = 3;

  // 퀴즈 데이터 가져오기 (다중 퀴즈 지원)
  const getQuizData = () => {
    if (!letter) return null;
    
    // 새로운 다중 퀴즈 형식
    if (letter.quiz.questions && letter.quiz.questions.length > 0) {
      return {
        questions: letter.quiz.questions,
        totalQuestions: letter.quiz.questions.length
      };
    }
    
    // 기존 단일 퀴즈 형식 (호환성)
    if (letter.quiz.question) {
      return {
        questions: [{
          question: letter.quiz.question,
          options: letter.quiz.options || [],
          correctAnswer: letter.quiz.correctAnswer || 0,
          hint: letter.quiz.hint || ''
        }],
        totalQuestions: 1
      };
    }
    
    return null;
  };

  const quizData = getQuizData();
  const currentQuiz = quizData?.questions[currentQuizIndex];
  const isLastQuiz = currentQuizIndex === (quizData?.totalQuestions || 1) - 1;
  const allQuizzesCompleted = completedQuizzes.length === quizData?.totalQuestions;

  // 임시 더미 데이터
  const dummyLetters: LinkLetter[] = [
    {
      id: '1',
      title: '너에게 전하는 마음',
      category: 'confession',
      content: `안녕, 오랫동안 말하지 못했던 내 마음을 이제야 전하게 되었어.

우리가 처음 만났던 그 도서관에서부터 지금까지, 너와 함께한 모든 순간들이 내게는 소중한 보물이야.

너의 웃음소리, 진지하게 책을 읽는 모습, 가끔 보여주는 장난스러운 표정까지... 모든 것이 내 마음 속 깊이 자리잡고 있어.

이 편지를 읽고 있다는 건 너도 나에 대해 조금은 관심이 있다는 뜻이겠지? 

용기를 내서 말할게. 나는 너를 좋아해. 정말 많이.

답을 재촉하지는 않을게. 천천히 생각해보고, 네가 편한 때에 답해줘.

그저 내 마음을 알아줬으면 해서 이렇게 편지를 써.

언제나 너를 응원하고 있어. ❤️`,
      quiz: {
        question: '우리가 처음 만난 곳은?',
        options: ['카페', '도서관', '공원', '학교'],
        correctAnswer: 1,
        hint: '조용하고 책이 많은 곳이에요'
      },
      author: {
        uid: 'user1',
        displayName: '익명의 누군가',
        email: 'user1@example.com'
      },
      isPublic: true,
      viewCount: 24,
      likeCount: 8,
      createdAt: new Date('2024-10-30'),
    },
    {
      id: '2',
      title: '고마운 마음을 담아',
      category: 'gratitude',
      content: `항상 내 곁에서 힘이 되어줘서 정말 고마워.

힘들 때마다 네가 해준 따뜻한 말 한마디가 얼마나 큰 위로가 되었는지 몰라.

특히 지난달에 내가 어려운 일로 고민할 때, 밤늦게까지 전화로 이야기 들어주고 조언해준 것... 정말 고마웠어.

너 같은 친구가 있어서 내가 얼마나 행복한지 알까?

앞으로도 우리 오래오래 좋은 친구로 지내자.

고마워, 정말로. 💚`,
      quiz: {
        question: '내가 가장 좋아하는 음식은?',
        options: ['피자', '치킨', '떡볶이', '라면'],
        correctAnswer: 2,
        hint: '매운 걸 좋아해요!'
      },
      author: {
        uid: 'user2',
        displayName: '감사한 친구',
        email: 'user2@example.com'
      },
      isPublic: true,
      viewCount: 15,
      likeCount: 12,
      createdAt: new Date('2024-10-29'),
    }
  ];

  useEffect(() => {
    const fetchLetter = async () => {
      console.log('편지 로드 시작, ID:', letterId);
      
      // 먼저 더미 데이터에서 찾기
      let foundLetter = dummyLetters.find(letter => letter.id === letterId);
      
      if (!foundLetter) {
        // Firebase에서 편지 찾기
        try {
          const docRef = doc(db, 'linkLetters', letterId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            foundLetter = {
              id: docSnap.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date()
            } as LinkLetter;
            
            console.log('Firebase에서 편지 로드 성공:', foundLetter);
            
            // 조회수 증가
            try {
              await updateDoc(docRef, {
                viewCount: increment(1)
              });
              console.log('조회수 증가 완료');
            } catch (error) {
              console.error('조회수 증가 실패:', error);
            }
          } else {
            console.log('편지를 찾을 수 없습니다:', letterId);
          }
        } catch (error) {
          console.error('Firebase에서 편지 로드 실패:', error);
        }
      }
      
      if (foundLetter) {
        setLetter(foundLetter);
      }
      setLoading(false);
    };

    fetchLetter();
  }, [letterId]);

  // 사용자 배경 설정 가져오기
  useEffect(() => {
    const fetchUserBackground = async () => {
      if (currentUser?.uid) {
        try {
          const settingsDocRef = doc(db, 'users', currentUser.uid, 'settings', 'linkLetterBackground');
          const settingsDoc = await getDoc(settingsDocRef);
          if (settingsDoc.exists()) {
            setUserBackground(settingsDoc.data() as LinkLetterBackground);
          }
        } catch (error) {
          console.error('배경 설정 가져오기 실패:', error);
        }
      }
    };
    fetchUserBackground();
  }, [currentUser?.uid]);

  const handleQuizSubmit = () => {
    if (!currentQuiz) return;
    
    if (selectedAnswer === currentQuiz.correctAnswer) {
      // 현재 퀴즈를 완료된 목록에 추가
      setCompletedQuizzes(prev => [...prev, currentQuizIndex]);
      
      if (isLastQuiz) {
        // 모든 퀴즈 완료
        setQuizPassed(true);
        setShowQuiz(false);
        // TODO: 조회수 증가 API 호출
      } else {
        // 다음 퀴즈로 이동
        setCurrentQuizIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setAttempts(0);
        setShowHint(false);
        
        // 성공 메시지
        alert(`🎉 정답입니다! 다음 퀴즈로 넘어갑니다. (${currentQuizIndex + 2}/${quizData?.totalQuestions})`);
      }
    } else {
      setAttempts(prev => prev + 1);
      if (attempts + 1 >= maxAttempts) {
        alert('퀴즈 기회를 모두 사용했습니다. 나중에 다시 시도해주세요.');
        router.back();
      } else {
        alert(`틀렸습니다! ${maxAttempts - attempts - 1}번의 기회가 남았습니다.`);
        setSelectedAnswer(null);
      }
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    // TODO: 좋아요 API 호출
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      console.log('링크 복사 완료:', window.location.href);
      
      // 3초 후 상태 초기화
      setTimeout(() => {
        setLinkCopied(false);
      }, 3000);
    } catch (error) {
      console.error('링크 복사 실패:', error);
      // 폴백: 텍스트 선택으로 복사 안내
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setLinkCopied(true);
      setTimeout(() => {
        setLinkCopied(false);
      }, 3000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: letter?.title,
          text: '특별한 링크 편지를 받았어요! 퀴즈를 풀고 편지를 확인해보세요 💌',
          url: window.location.href,
        });
      } catch (error) {
        console.log('공유 취소됨');
        // 공유 실패 시 링크 복사로 폴백
        handleCopyLink();
      }
    } else {
      // Web Share API 미지원 시 링크 복사
      handleCopyLink();
    }
  };

  // 이미지 캐로셀 네비게이션
  const nextImage = () => {
    if (letter?.images && letter.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % letter.images!.length);
    }
  };

  const prevImage = () => {
    if (letter?.images && letter.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + letter.images!.length) % letter.images!.length);
    }
  };

  // 동적 배경 렌더링 함수
  const renderBackground = () => {
    // 편지에 배경이 설정되어 있으면 편지 배경 우선 사용
    if (letter?.background && letter.background.type !== 'default') {
      switch (letter.background.type) {
        case 'color':
          return (
            <div 
              className="absolute inset-0" 
              style={{ backgroundColor: letter.background.value }}
            />
          );
        case 'gradient':
          return (
            <div 
              className="absolute inset-0" 
              style={{ background: letter.background.value }}
            />
          );
        case 'image':
          return (
            <div className="absolute inset-0">
              <img 
                src={letter.background.value} 
                alt="Letter Background" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30" />
            </div>
          );
      }
    }
    
    // 편지에 배경이 없거나 기본 배경이면 사용자 전역 배경 사용
    if (!userBackground || userBackground.type === 'none') {
      return <div className="absolute inset-0 bg-slate-950" />;
    }

    switch (userBackground.type) {
      case 'color':
        return (
          <div 
            className="absolute inset-0" 
            style={{ backgroundColor: userBackground.value }}
          />
        );
      case 'gradient':
        return (
          <div 
            className="absolute inset-0" 
            style={{ 
              background: userBackground.value
            }}
          />
        );
      case 'image':
        return (
          <div className="absolute inset-0">
            <img 
              src={userBackground.value} 
              alt="Background" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30" />
          </div>
        );
      default:
        return <div className="absolute inset-0 bg-slate-950" />;
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950 to-pink-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mb-4"></div>
          <p className="text-gray-300">편지를 불러오는 중...</p>
        </div>
      </main>
    );
  }

  if (!letter) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950 to-pink-900 text-white flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-300 mb-2">편지를 찾을 수 없습니다</h2>
          <p className="text-gray-400 mb-6">삭제되었거나 존재하지 않는 편지입니다.</p>
          <Button onClick={() => router.push('/link-letter')} className="bg-pink-500 hover:bg-pink-600">
            편지 목록으로 돌아가기
          </Button>
        </div>
      </main>
    );
  }

  const category = letterCategories.find(cat => cat.id === letter.category);
  const IconComponent = category?.icon || Heart;

  return (
    <>
      {/* 헤더 */}
      <div className="fixed top-0 left-0 right-0 z-20 w-full">
        <LoginOutButton />
      </div>

      <main className="min-h-screen text-white pt-[80px] relative overflow-hidden">
        {/* 동적 배경 */}
        {renderBackground()}
        
        {/* 파티클 효과 (애니메이션 설정에 따라) */}
        {(!userBackground || userBackground.animation !== false) && (
          <div className="absolute inset-0 z-0">
            <ParticlesComponent />
          </div>
        )}
        {/* 헤더 버튼들 */}
        <div className="container mx-auto px-4 py-4 relative z-10">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-gray-300 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              뒤로가기
            </Button>
            
            {/* 배경 설정 버튼 */}
            <Link href={`/link-letter/background?return=${encodeURIComponent(`/link-letter/${letterId}`)}`}>
              <Button
                variant="ghost"
                className="text-gray-300 hover:text-white hover:bg-white/10"
                title="배경 설정"
              >
                <Settings className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">배경 설정</span>
              </Button>
            </Link>
          </div>
        </div>

        {showQuiz ? (
          /* 퀴즈 화면 */
          <div className="container mx-auto px-4 py-8 pb-32 relative z-10">
            <div className="max-w-md mx-auto">
              {/* 편지 미리보기 카드 */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden mb-8">
                {/* 이미지 캐로셀 또는 카테고리 아이콘 */}
                <div className="relative h-48">
                  {letter.images && letter.images.length > 0 ? (
                    // 이미지 캐로셀
                    <>
                      <img
                        src={letter.images[currentImageIndex]}
                        alt={`편지 이미지 ${currentImageIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* 이미지가 여러 개일 때만 네비게이션 버튼 표시 */}
                      {letter.images.length > 1 && (
                        <>
                          <button
                            onClick={prevImage}
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-3 transition-all backdrop-blur-sm shadow-lg"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button
                            onClick={nextImage}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-3 transition-all backdrop-blur-sm shadow-lg"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                          
                          {/* 이미지 인디케이터 */}
                          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                            {letter.images.map((_, index) => (
                              <button
                                key={index}
                                onClick={() => setCurrentImageIndex(index)}
                                className={`w-3 h-3 rounded-full transition-all ${
                                  index === currentImageIndex 
                                    ? 'bg-white shadow-lg' 
                                    : 'bg-white/40 hover:bg-white/60'
                                }`}
                              />
                            ))}
                          </div>
                          
                          {/* 이미지 카운터 */}
                          <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
                            <span className="text-sm text-white font-medium">
                              {currentImageIndex + 1}/{letter.images.length}
                            </span>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    // 기본 카테고리 아이콘
                    <div className="bg-blue-500/30 backdrop-blur-sm h-full flex items-center justify-center">
                      <img 
                        src={category?.image} 
                        alt={category?.name}
                        className="w-16 h-16 object-contain drop-shadow-lg"
                      />
                    </div>
                  )}
                </div>
                
                <div className="p-4 text-center">
                  <h2 className="font-semibold text-white mb-2">{letter.title}</h2>
                  <span className="inline-block bg-white/10 rounded-full px-3 py-1 text-xs text-gray-300">
                    {category?.name}
                  </span>
                </div>
              </div>

              {/* 퀴즈 진행 상황 */}
              {quizData && quizData.totalQuestions > 1 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-300">퀴즈 진행상황</span>
                    <span className="text-sm text-pink-400 font-medium">
                      {currentQuizIndex + 1} / {quizData.totalQuestions}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((currentQuizIndex + 1) / quizData.totalQuestions) * 100}%` }}
                    />
                  </div>
                  
                  {/* 완료된 퀴즈 표시 */}
                  {completedQuizzes.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {Array.from({ length: quizData.totalQuestions }, (_, i) => (
                        <div
                          key={i}
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                            completedQuizzes.includes(i)
                              ? 'bg-green-500 text-white'
                              : i === currentQuizIndex
                              ? 'bg-pink-500 text-white'
                              : 'bg-gray-600 text-gray-300'
                          }`}
                        >
                          {completedQuizzes.includes(i) ? '✓' : i + 1}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 퀴즈 카드 */}
              {currentQuiz && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 mb-4">
                      <div className="p-2 bg-pink-500/20 rounded-lg">
                        <MessageCircle className="w-6 h-6 text-pink-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white">
                        {quizData && quizData.totalQuestions > 1 
                          ? `퀴즈 ${currentQuizIndex + 1}번` 
                          : '편지를 보려면 퀴즈를 풀어주세요!'
                        }
                      </h3>
                    </div>
                    <p className="text-sm text-gray-400">
                      남은 기회: <span className="text-pink-400 font-medium">{maxAttempts - attempts}번</span>
                    </p>
                  </div>
                  
                  <div className="mb-6">
                    <div className="mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-lg text-white font-medium">{currentQuiz.question}</p>
                    </div>
                    
                    <div className="space-y-3">
                      {currentQuiz.options.map((option, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedAnswer(index)}
                          className={`w-full p-4 rounded-lg text-left transition-all ${
                            selectedAnswer === index 
                              ? 'bg-pink-500/30 border-2 border-pink-400 text-white' 
                              : 'bg-white/5 hover:bg-white/10 border border-white/20 text-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              selectedAnswer === index 
                                ? 'border-pink-400 bg-pink-500' 
                                : 'border-gray-400'
                            }`}>
                              {selectedAnswer === index && (
                                <CheckCircle className="w-4 h-4 text-white" />
                              )}
                            </div>
                            <span className="font-medium">{option}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* 힌트 */}
                  {currentQuiz.hint && (
                    <div className="mb-6">
                      <Button
                        variant="outline"
                        onClick={() => setShowHint(!showHint)}
                        className="w-full border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                      >
                        💡 힌트 {showHint ? '숨기기' : '보기'}
                      </Button>
                      {showHint && (
                        <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                          <p className="text-sm text-yellow-200">{currentQuiz.hint}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <Button
                    onClick={handleQuizSubmit}
                    disabled={selectedAnswer === null}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {selectedAnswer !== null 
                      ? (isLastQuiz ? '편지 확인하기' : '다음 퀴즈로') 
                      : '답을 선택해주세요'
                    }
                  </Button>
                  
                  {/* 링크 복사하기 버튼 - 퀴즈 화면에서도 항상 표시 */}
                  <Button
                    onClick={handleCopyLink}
                    variant="outline"
                    className={`w-full mt-4 transition-all ${
                      linkCopied
                        ? 'bg-green-500/20 border-green-500 text-green-400'
                        : 'border-white/20 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {linkCopied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        복사 완료!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        링크 복사하기
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* 편지 내용 화면 */
          <div className="container mx-auto px-4 py-8 pb-32 relative z-10">
            <div className="max-w-2xl mx-auto">
              {/* 편지 헤더 */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-3 mb-4">
                  <div className={`p-3 ${category?.color} rounded-2xl`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-1">{letter.title}</h1>
                    <span className="text-sm text-gray-400">{category?.name}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
                  <span>from {letter.author.displayName}</span>
                  <span>•</span>
                  <span>{letter.createdAt.toLocaleDateString('ko-KR')}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>{letter.viewCount + 1}</span>
                  </div>
                </div>
              </div>

              {/* 편지 이미지 갤러리 */}
              {letter.images && letter.images.length > 0 && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8">
                  <h3 className="text-lg font-semibold text-white mb-4 text-center">📸 편지 속 사진들</h3>
                  <div className="relative">
                    <img
                      src={letter.images[currentImageIndex]}
                      alt={`편지 이미지 ${currentImageIndex + 1}`}
                      className="w-full max-h-96 object-contain rounded-lg"
                    />
                    
                    {letter.images.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-4 transition-all backdrop-blur-sm shadow-lg"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-4 transition-all backdrop-blur-sm shadow-lg"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                        
                        {/* 썸네일 네비게이션 */}
                        <div className="flex justify-center gap-3 mt-6 overflow-x-auto pb-2">
                          {letter.images.map((image, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentImageIndex(index)}
                              className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-3 transition-all shadow-lg ${
                                index === currentImageIndex 
                                  ? 'border-white opacity-100 scale-110' 
                                  : 'border-white/30 opacity-70 hover:opacity-90 hover:scale-105'
                              }`}
                            >
                              <img
                                src={image}
                                alt={`썸네일 ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                        
                        <div className="text-center mt-4">
                          <div className="inline-block bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                            <span className="text-sm text-white font-medium">
                              {currentImageIndex + 1} / {letter.images.length}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* 편지 내용 */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 mb-8">
                <div className="prose prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-lg leading-relaxed text-gray-100">
                    {letter.content}
                  </div>
                </div>
              </div>

              {/* 액션 버튼들 */}
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button
                  onClick={handleLike}
                  variant="outline"
                  className={`flex items-center gap-2 ${
                    isLiked 
                      ? 'bg-pink-500/20 border-pink-500 text-pink-400' 
                      : 'border-white/20 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  좋아요 ({letter.likeCount + (isLiked ? 1 : 0)})
                </Button>
                
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  className={`flex items-center gap-2 transition-all ${
                    linkCopied
                      ? 'bg-green-500/20 border-green-500 text-green-400'
                      : 'border-white/20 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      복사 완료!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      링크 복사하기
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="flex items-center gap-2 border-white/20 text-gray-300 hover:bg-white/10"
                >
                  <Share2 className="w-4 h-4" />
                  공유하기
                </Button>
                
                <Button
                  onClick={() => router.push('/link-letter')}
                  className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                >
                  다른 편지 보기
                </Button>
              </div>

              {/* 성공 메시지 */}
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-300 font-medium">퀴즈를 맞춰서 편지를 확인했어요! 🎉</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI 플로팅 버튼 */}
        <Link
          href="/ai-comfort"
          className="fixed bottom-[80px] right-4 z-[40] w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-all group hover:scale-110"
        >
          <span className="text-white font-medium text-base">AI</span>
        </Link>
      </main>
    </>
  );
}
