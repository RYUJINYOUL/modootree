'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setUser } from "@/store/userSlice";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getAuth, GoogleAuthProvider, signInWithPopup, browserLocalPersistence } from "firebase/auth";
import KakaoAuthButton from '@/components/auth/KakaoAuthButton';

declare global {
  interface Window {
    Kakao?: {
      init: (key: string) => Promise<void>;
      isInitialized: () => boolean;
      Share: {
        sendDefault: (options: {
          objectType: string;
          content: {
            title: string;
            description: string;
            imageUrl?: string;
            link: {
              mobileWebUrl: string;
              webUrl: string;
            };
          };
          buttons: Array<{
            title: string;
            link: {
              mobileWebUrl: string;
              webUrl: string;
            };
          }>;
        }) => Promise<void>;
      };
    };
  }
}
import { loadSlim } from "tsparticles-slim";
import Particles from "react-tsparticles";
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { doc, getDoc, updateDoc, increment, collection, query, where, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import app from '@/firebase';

interface Test {
  title: string;
  description: string;
  thumbnail: string;
  questions: Array<{
    text: string;
    options: Array<{
      text: string;
      score: number;
    }>;
  }>;
  resultTypes: Array<{
    title: string;
    description: string;
    minScore: number;
    maxScore: number;
  }>;
  stats: {
    participantCount: number;
    likeCount: number;
  };
}

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

export default function TestPage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = use(params);
  const router = useRouter();
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [totalComments, setTotalComments] = useState(0);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const currentUser = useSelector((state: any) => state.user.currentUser);
  const dispatch = useDispatch();

  // 전체 답글 수 가져오기
  const fetchTotalComments = async () => {
    try {
      const q = query(
        collection(db, 'modoo-ai-comments'),
        where('testId', '==', testId)
      );
      const querySnapshot = await getDocs(q);
      setTotalComments(querySnapshot.size);
    } catch (error) {
      console.error('답글 수 로드 실패:', error);
    }
  };

  // 투표 여부 확인
  const checkVoteStatus = async () => {
    if (!currentUser?.uid || !test) return false;
    
    try {
      const userVoteQuery = query(
        collection(db, 'user-votes'),
        where('testId', '==', testId),
        where('userId', '==', currentUser.uid)
      );
      const snapshot = await getDocs(userVoteQuery);
      return !snapshot.empty;
    } catch (error) {
      console.error('투표 상태 확인 실패:', error);
      return false;
    }
  };

  useEffect(() => {
    const fetchTest = async () => {
      await fetchTotalComments();
      try {
        const testDoc = await getDoc(doc(db, 'modoo-ai-tests', testId));
        if (testDoc.exists()) {
          setTest(testDoc.data() as Test);
        }
      } catch (error) {
        console.error('테스트 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
  }, [testId]);

  // 투표 상태 체크
  useEffect(() => {
    const checkVoted = async () => {
      if (test && currentUser?.uid) {
        const voted = await checkVoteStatus();
        setHasVoted(voted);
      } else {
        setHasVoted(false);
      }
    };
    
    checkVoted();
  }, [test, testId, currentUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-gray-900 text-white/90">
        <div className="container mx-auto px-4 py-10">
          <div className="text-center">
            테스트를 불러오는 중...
          </div>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-gray-900 text-white/90">
        <div className="container mx-auto px-4 py-10">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">테스트를 찾을 수 없습니다</h1>
            <Button onClick={() => router.push('/modoo-ai')}>
              테스트 목록으로 돌아가기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-cyan-900 text-white/90 relative overflow-hidden">
      <ParticlesComponent />
      <div className="container mx-auto px-4 py-6 md:py-10 relative z-10">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* 제목 섹션 */}
          <div className="bg-gray-800/50 rounded-lg p-4 md:p-6">
            <h1 className="text-2xl md:text-2xl font-bold text-white text-center">{test.title}</h1>
          </div>

          {/* 이미지 섹션 */}
          {test.thumbnail && (
            <div>
              <img 
                src={test.thumbnail} 
                alt={test.title} 
                className="w-full rounded-lg shadow-lg"
              />
            </div>
          )}

          {/* 설명 섹션 */}
          <div className="bg-gray-800/50 rounded-lg p-4 md:p-6">
            <p className="text-base md:text-lg text-gray-300 whitespace-pre-wrap">{test.description}</p>
          </div>

          {/* 통계 섹션 */}
          <div className="flex flex-wrap gap-2 justify-center items-center mb-8">
            <div className="bg-gray-700/50 rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm">
              <div className="text-gray-400">참여</div>
              <div className="font-semibold">{test.stats.participantCount.toLocaleString()}</div>
            </div>
            <button
              onClick={async () => {
                try {
                  const testRef = doc(db, 'modoo-ai-tests', testId);
                  await updateDoc(testRef, {
                    'stats.likeCount': increment(1)
                  });
                  // 로컬 상태 업데이트
                  setTest(prev => prev ? {
                    ...prev,
                    stats: {
                      ...prev.stats,
                      likeCount: prev.stats.likeCount + 1
                    }
                  } : null);
                } catch (error) {
                  console.error('좋아요 업데이트 실패:', error);
                  alert('좋아요 업데이트에 실패했습니다.');
                }
              }}
              className="bg-gray-700/50 hover:bg-gray-600/50 rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm transition-colors"
            >
              <div className="text-gray-400">좋아요</div>
              <div className="font-semibold">{test.stats.likeCount.toLocaleString()}</div>
            </button>
            <div className="bg-gray-700/50 rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm">
              <div className="text-gray-400">답글</div>
              <div className="font-semibold">{totalComments}</div>
            </div>
            <Button
              variant="outline"
              className="bg-gray-700/50 hover:bg-gray-700 text-white h-[32px] w-[32px] p-0 flex items-center justify-center"
              onClick={() => router.push('/modoo-ai')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </Button>
          </div>

          {/* 버튼 섹션 */}
          <div className="flex flex-col gap-4 px-3 md:px-5">
            <Button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (!currentUser?.uid) {
                  setShowLoginDialog(true);
                  return;
                }

                const handleStartTest = async () => {
                  try {
                    // 참여 수 증가
                    const testRef = doc(db, 'modoo-ai-tests', testId);
                    await updateDoc(testRef, {
                      'stats.participantCount': increment(1)
                    });
                    
                    // 로컬 상태 업데이트
                    setTest(prev => prev ? {
                      ...prev,
                      stats: {
                        ...prev.stats,
                        participantCount: prev.stats.participantCount + 1
                      }
                    } : null);

                    // 페이지 이동
                    window.location.href = `/modoo-ai/tests/${testId}/questions/1`;
                  } catch (error) {
                    console.error('참여 수 업데이트 실패:', error);
                    alert('참여 처리 중 오류가 발생했습니다.');
                  }
                };

                await handleStartTest();
              }}
              className="w-full bg-blue-500/50 hover:bg-blue-600/50 text-white text-base md:text-lg py-4 rounded-lg backdrop-blur-sm transition-colors"
            >
              {currentUser?.uid ? '공감 시작하기' : '로그인하고 공감하기'}
            </Button>

            <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
              <DialogContent className="sm:max-w-md bg-white/10 backdrop-blur-sm border border-white/20">
                <DialogHeader>
                  <DialogTitle className="text-3xl font-bold text-white text-center">로그인</DialogTitle>
                  <p className="text-white/80 text-center mb-2">모두트리에 오신 것을 환영합니다!</p>
                  {/KAKAOTALK/i.test(navigator?.userAgent) && (
                    <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <p className="text-yellow-200 text-sm text-center">
                        카카오톡 창 구글 로그인 미지원
                        <br />
                        아래 새창 열기 또는 카톡 로그인 이용하세요
                      </p>
                    </div>
                  )}
                </DialogHeader>
                <div className="w-full flex flex-col gap-6 py-4">
                  <button
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black font-semibold shadow hover:bg-gray-100 transition-all hover:scale-[1.02]"
                    onClick={async () => {
                      const auth = getAuth(app);
                      const provider = new GoogleAuthProvider();
                      try {
                        await auth.setPersistence(browserLocalPersistence);
                        const result = await signInWithPopup(auth, provider);
                        const user = result.user;

                        // Firestore에 사용자 정보 저장
                        const userRef = doc(db, "users", user.uid);
                        const userDoc = await getDoc(userRef);

                        if (!userDoc.exists()) {
                          await setDoc(userRef, {
                            email: user.email,
                            photoURL: user.photoURL,
                            provider: "google",
                            createdAt: serverTimestamp(),
                          });

                          // 기본 설정 저장
                          await setDoc(doc(db, "users", user.uid, "settings", "background"), {
                            type: 'image',
                            value: 'https://firebasestorage.googleapis.com/v0/b/mtree-e0249.firebasestorage.app/o/backgrounds%2F1752324410072_leaves-8931849_1920.jpg?alt=media&token=bda5d723-d54d-43d5-8925-16aebeec8cfa',
                            animation: true
                          });
                        }

                        // Redux store 업데이트
                        dispatch(setUser({
                          uid: user.uid,
                          email: user.email,
                          photoURL: user.photoURL,
                          displayName: user.displayName
                        }));

                        setShowLoginDialog(false);
                      } catch (error) {
                        console.error("Google login error", error);
                        alert("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
                      }
                    }}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 533.5 544.3">
                      <path
                        d="M533.5 278.4c0-18.5-1.5-37.1-4.7-55.3H272.1v104.8h147c-6.1 33.8-25.7 63.7-54.4 82.7v68h87.7c51.5-47.4 81.1-117.4 81.1-200.2z"
                        fill="#4285f4" />
                      <path
                        d="M272.1 544.3c73.4 0 135.3-24.1 180.4-65.7l-87.7-68c-24.4 16.6-55.9 26-92.6 26-71 0-131.2-47.9-152.8-112.3H28.9v70.1c46.2 91.9 140.3 149.9 243.2 149.9z"
                        fill="#34a853" />
                      <path
                        d="M119.3 324.3c-11.4-33.8-11.4-70.4 0-104.2V150H28.9c-38.6 76.9-38.6 167.5 0 244.4l90.4-70.1z"
                        fill="#fbbc04" />
                      <path
                        d="M272.1 107.7c38.8-.6 76.3 14 104.4 40.8l77.7-77.7C405 24.6 339.7-.8 272.1 0 169.2 0 75.1 58 28.9 150l90.4 70.1c21.5-64.5 81.8-112.4 152.8-112.4z"
                        fill="#ea4335" />
                    </svg>
                    <span>Google로 로그인</span>
                  </button>
                  <KakaoAuthButton />
                  <div className="w-full flex justify-end mt-2">
                    <button
                      onClick={() => {
                        setShowLoginDialog(false);
                        window.location.href = "/register";
                      }}
                      className="text-blue-300 hover:underline text-sm"
                    >
                      회원가입
                    </button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {hasVoted && (
              <Button
                onClick={() => router.push(`/modoo-ai/tests/${testId}/results/1`)}
                className="w-full bg-blue-500/50 hover:bg-blue-600/50 text-white text-base md:text-lg py-4 rounded-lg backdrop-blur-sm transition-colors"
              >
                결과 페이지 보기
              </Button>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="bg-gray-700/50 hover:bg-gray-700 text-white text-sm py-2.5 rounded-lg flex items-center justify-center gap-2"
                onClick={async () => {
                  try {
                    // 이미 초기화되어 있더라도 다시 초기화
                    const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY;
                    if (!kakaoKey) {
                      throw new Error('카카오 API 키가 설정되지 않았습니다.');
                    }
                    
                    if (!window.Kakao) {
                      throw new Error('카카오 SDK가 로드되지 않았습니다.');
                    }

                    if (!window.Kakao.isInitialized()) {
                      await window.Kakao.init(kakaoKey);
                    }

                    if (!window.Kakao.Share) {
                      throw new Error('카카오 공유 모듈을 찾을 수 없습니다.');
                    }
                  } catch (error) {
                    console.error('카카오 초기화 오류:', error);
                    alert(error instanceof Error ? error.message : '카카오톡 초기화에 실패했습니다.');
                    return;
                  }

                  try {
                    const currentUrl = window.location.href;
                    const shareData = {
                      objectType: 'feed',
                      content: {
                        title: test.title || '모두트리 AI 공감 테스트',
                        description: test.description || '나와 잘 맞는 공감 테스트를 해보세요!',
                        imageUrl: test.thumbnail || 'https://www.modootree.com/Image/logo.png',
                        link: {
                          mobileWebUrl: currentUrl,
                          webUrl: currentUrl
                        }
                      },
                      buttons: [
                        {
                          title: '공감 시작하기',
                          link: {
                            mobileWebUrl: currentUrl,
                            webUrl: currentUrl
                          }
                        }
                      ]
                    };
                    
                    console.log('카카오 공유 데이터:', shareData);
                    await window.Kakao.Share.sendDefault(shareData);
                  } catch (error) {
                    console.error('카카오톡 공유 실패:', error);
                    alert('카카오톡 공유에 실패했습니다.');
                  }
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                  <polyline points="16 6 12 2 8 6"></polyline>
                  <line x1="12" y1="2" x2="12" y2="15"></line>
                </svg>
                카카오톡
              </Button>
              <Button 
                variant="outline" 
                className="bg-gray-700/50 hover:bg-gray-700 text-white text-sm py-2.5 rounded-lg flex items-center justify-center gap-2"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    alert('링크가 복사되었습니다!');
                  } catch (error) {
                    console.error('링크 복사 실패:', error);
                    alert('링크 복사에 실패했습니다.');
                  }
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                링크 복사
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}