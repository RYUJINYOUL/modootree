'use client';

import { useEffect, useState, useCallback } from 'react';
import { loadSlim } from "tsparticles-slim";
import Particles from "react-tsparticles";
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import CollapsibleFooter from '@/components/ui/CollapsibleFooter';
import { Button } from '@/components/ui/button';
import { useSelector } from 'react-redux';
import { collection, query, orderBy, getDocs, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import CategoryCarousel from '@/components/CategoryCarousel';

interface Test {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  emotion: string;
  stats: {
    participantCount: number;
    likeCount: number;
  };
  commentCount?: number;
}

const getEmotionIcon = (emotion: string) => {
  switch (emotion) {
    case 'happy': return '/logos/m1.png';
    case 'sad': return '/logos/m6.png';
    case 'angry': return '/logos/m9.png';
    case 'anxious': return '/logos/m5.png';
    case 'peaceful': return '/logos/m4.png';
    case 'worried': return '/logos/m14.png';
    default: return '/logos/m1.png';
  }
};

const ParticlesComponent = () => {
  const particlesInit = useCallback(async (engine: any) => {
    await loadSlim(engine);
  }, []);

  return (
    <Particles
      className="absolute inset-0"
      init={particlesInit}
      options={{
        background: {
          color: "transparent"
        },
        fpsLimit: 120,
        particles: {
          color: {
            value: ["#3498db", "#2980b9", "#8e44ad", "#2ecc71", "#16a085"]
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
            speed: 0.5,
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
            value: 100
          },
          opacity: {
            animation: {
              enable: true,
              minimumValue: 0.1,
              speed: 1,
              sync: false
            },
            random: true,
            value: { min: 0.1, max: 0.5 }
          },
          shape: {
            type: "circle"
          },
          size: {
            animation: {
              enable: true,
              minimumValue: 0.1,
              speed: 2,
              sync: false
            },
            random: true,
            value: { min: 1, max: 4 }
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
              opacity: 0.8,
              size: 6
            }
          }
        }
      }}
    />
  );
};

const EMOTION_CATEGORIES = [
  { id: 'happy', label: '행복' },
  { id: 'sad', label: '슬픔' },
  { id: 'angry', label: '화남' },
  { id: 'anxious', label: '불안' },
  { id: 'peaceful', label: '편안' },
  { id: 'worried', label: '고민' },
];

export default function ModooAIPage() {
  const router = useRouter();
  const currentUser = useSelector((state: any) => state.user.currentUser);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmotion, setSelectedEmotion] = useState('all');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [displayCount, setDisplayCount] = useState(10);  // 초기에 10개 표시
  const isMobile = useMediaQuery('(max-width: 768px)');

  const fetchTests = useCallback(async () => {
    try {
      const q = query(
        collection(db, 'modoo-ai-tests'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const testList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Test[];

      // 각 테스트의 답글 수 가져오기
      const testsWithComments = await Promise.all(
        testList.map(async (test) => {
          const commentsQuery = query(
            collection(db, 'modoo-ai-comments'),
            where('testId', '==', test.id)
          );
          const commentsSnapshot = await getDocs(commentsQuery);
          return {
            ...test,
            commentCount: commentsSnapshot.size
          };
        })
      );

      setTests(testsWithComments);
    } catch (error) {
      console.error('공감투표 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const renderEmotionTabs = () => {
    if (isMobile) {
      return (
        <div className="mb-8">
          <CategoryCarousel
            categories={[
              { id: 'all', label: '전체' },
              ...EMOTION_CATEGORIES.map(cat => ({
                id: cat.id,
                label: cat.label
              }))
            ]}
            selectedCategory={selectedEmotion}
            onSelect={setSelectedEmotion}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-2 mb-8 justify-center">
        <button
          onClick={() => setSelectedEmotion('all')}
          className={cn(
            "px-4 py-2 rounded-lg transition-colors",
            selectedEmotion === 'all'
              ? "bg-white/20 text-white"
              : "bg-black/50 text-white/70 hover:bg-white/10"
          )}
        >
          전체
        </button>
        {EMOTION_CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedEmotion(category.id)}
            className={cn(
              "px-4 py-2 rounded-lg transition-colors",
              selectedEmotion === category.id
                ? "bg-white/20 text-white"
                : "bg-black/50 text-white/70 hover:bg-white/10"
            )}
          >
            {category.label}
          </button>
        ))}
      </div>
    );
  };

  const renderTestList = () => {
    if (loading) {
      return (
        <div className="text-center py-10">
          공감투표 목록을 불러오는 중...
        </div>
      );
    }

    if (tests.length === 0) {
      return (
        <div className="text-center py-10 text-gray-400">
          아직 생성된 테스트가 없습니다.
          {currentUser?.uid && (
            <div className="mt-4">
              <Button
                onClick={() => router.push('/modoo-ai/create')}
                className="bg-blue-500 hover:bg-blue-600"
              >
                첫 번째 테스트 만들기
              </Button>
            </div>
          )}
        </div>
      );
    }

    const filteredTests = selectedEmotion === 'all'
      ? tests
      : tests.filter(test => {
          // 감정 ID와 테스트의 emotion 매핑
          const emotionMapping: Record<string, string> = {
            'happy': 'happy',
            'sad': 'sad',
            'angry': 'angry',
            'anxious': 'anxious',
            'peaceful': 'peaceful',
            'worried': 'worried'
          };
          return test.emotion === emotionMapping[selectedEmotion as keyof typeof emotionMapping];
        });

    if (filteredTests.length === 0) {
      return (
        <div className="text-center py-10 text-gray-400">
          해당 감정의 공감투표가 없습니다.
        </div>
      );
    }

    return (
      <div className="space-y-4 mt-8">
        <h2 className="text-lg font-medium text-white/80 mb-4">인기 공감투표</h2>
        <div className="space-y-3">
          {filteredTests.slice(0, displayCount).map((test) => (
            <div
              key={test.id}
              onClick={() => router.push(`/modoo-ai/tests/${test.id}`)}
              className="bg-white/10 rounded-lg p-4 hover:bg-white/20 transition-colors cursor-pointer flex gap-4 items-center"
            >
              {test.thumbnail ? (
                <div className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-md">
                  <img
                    src={test.thumbnail}
                    alt={test.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 flex-shrink-0 bg-gray-800 rounded-md flex items-center justify-center">
                  <Image
                    src={getEmotionIcon(test.emotion)}
                    alt="감정 아이콘"
                    width={48}
                    height={48}
                    className="w-12 h-12"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium mb-1 line-clamp-1">{test.title}</h3>
                <p className="text-sm text-gray-400 mb-2 line-clamp-2">{test.description}</p>
                <div className="flex gap-2 text-xs">
                  <div className="bg-gray-700/50 rounded-lg px-2 py-1 flex items-center gap-1">
                    <span className="text-gray-400">참여</span>
                    <span className="font-semibold text-gray-300">{test.stats.participantCount.toLocaleString()}</span>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg px-2 py-1 flex items-center gap-1">
                    <span className="text-gray-400">좋아요</span>
                    <span className="font-semibold text-gray-300">{test.stats.likeCount.toLocaleString()}</span>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg px-2 py-1 flex items-center gap-1">
                    <span className="text-gray-400">답글</span>
                    <span className="font-semibold text-gray-300">{test.commentCount || 0}</span>
                  </div>
                  {currentUser?.uid === 'vW1OuC6qMweyOqu73N0558pv4b03' && (
                    <button
                      onClick={async () => {
                        if (confirm('정말로 이 공감 투표를 삭제하시겠습니까?')) {
                          try {
                            // 공감 투표 문서 삭제
                            await deleteDoc(doc(db, 'modoo-ai-tests', test.id));
                            
                            // 관련된 투표 결과 삭제
                            const voteQuery = query(
                              collection(db, 'modoo-ai-votes'),
                              where('testId', '==', test.id)
                            );
                            const voteSnapshot = await getDocs(voteQuery);
                            await Promise.all(
                              voteSnapshot.docs.map(doc => deleteDoc(doc.ref))
                            );
                            
                            // 관련된 답글 삭제
                            const commentQuery = query(
                              collection(db, 'modoo-ai-comments'),
                              where('testId', '==', test.id)
                            );
                            const commentSnapshot = await getDocs(commentQuery);
                            await Promise.all(
                              commentSnapshot.docs.map(doc => deleteDoc(doc.ref))
                            );

                            // 목록 새로고침
                            fetchTests();
                          } catch (error) {
                            console.error('공감 투표 삭제 실패:', error);
                            alert('공감 투표 삭제에 실패했습니다. 다시 시도해주세요.');
                          }
                        }
                      }}
                      className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* 더보기 버튼 */}
          {filteredTests.length > displayCount && (
            <Button
              onClick={() => setDisplayCount(prev => prev + 10)}
              className="w-full mt-4 bg-gray-800/50 hover:bg-gray-800/70"
            >
              더보기 ({filteredTests.length - displayCount}개 더 있음)
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-cyan-900 text-white/90 relative overflow-hidden">
      <ParticlesComponent />
      <div className="container mx-auto px-4 py-10 md:w-[60%] relative z-10">
        <div className="mb-10">
          <div className="flex justify-between items-center mb-8">
            <div className="text-center flex-grow">
              <h1 className="text-2xl font-bold text-white mb-2">
                모두트리 공감투표
              </h1>
              <p className="text-sm text-gray-400">
                사연 작성하면 공감 투표 AI 자동 생성
              </p>
            </div>
            {currentUser?.uid && (
              <div className="flex-shrink-0 ml-4">
                <Button
                  onClick={() => router.push('/modoo-ai/create')}
                  variant="default"
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  만들기
                </Button>
              </div>
            )}
          </div>

          {!currentUser && (
            <p className="text-sm text-gray-400 text-center mt-4">
              * 제작은 로그인이 필요합니다
            </p>
          )}

          {renderEmotionTabs()}
          {renderTestList()}
        </div>
      </div>
    </main>
    <CollapsibleFooter />

      {/* AI 플로팅 버튼 */}
      <Link
        href="/ai-comfort"
        className="fixed bottom-[80px] right-4 z-[40] w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-all group"
      >
        <span className="text-white font-medium text-base">AI</span>
      </Link>
    </>
  );
}