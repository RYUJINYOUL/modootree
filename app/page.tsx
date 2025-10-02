'use client';

import { useEffect, useState, useCallback } from 'react';
import { loadSlim } from "tsparticles-slim";
import Particles from "react-tsparticles";
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import LoginOutButton from '@/components/ui/LoginOutButton';
import { db } from '@/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import Image from 'next/image';
import { BottomTabs } from '@/components/ui/bottom-tabs';
import { cn } from "@/lib/utils";
import { Plus, Volume2, VolumeX } from 'lucide-react';
import { Dialog } from '@headlessui/react';

export default function HomePage() {
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isMuted, setIsMuted] = useState(true);
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);

  useEffect(() => {
    console.log('Component mounted, isAudioLoaded:', isAudioLoaded);
  }, [isAudioLoaded]);

  // 음악 자동 재생을 위한 처리
  useEffect(() => {
    const audio = document.getElementById('bgMusic') as HTMLAudioElement;
    if (audio) {
      console.log('Audio element found');
      
      // 음악 로드 시작 시
      audio.addEventListener('loadstart', () => {
        console.log('Audio loading started');
      });

      // 음악 로드 완료 시
      audio.addEventListener('loadeddata', () => {
        console.log('Audio loaded successfully');
        setIsAudioLoaded(true);
        audio.volume = 0.05; // 볼륨을 5%로 설정
      });

      // 음악 재생 오류 시
      audio.addEventListener('error', (e) => {
        console.error('Audio loading error:', e);
        console.error('Audio error code:', audio.error?.code);
        console.error('Audio error message:', audio.error?.message);
        setIsAudioLoaded(false);
      });

      // 자동 재생 시도
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsMuted(false);
        }).catch((error) => {
          // 자동 재생이 차단된 경우
          console.log('Autoplay prevented:', error);
          setIsMuted(true);
        });
      }
    }

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      if (audio) {
        audio.removeEventListener('loadeddata', () => {});
        audio.removeEventListener('error', () => {});
      }
    };
  }, []);
  const router = useRouter();
  const currentUser = useSelector((state: any) => state.user.currentUser);
  const [userData, setUserData] = useState<any>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);

  useEffect(() => {
    const loadUserData = async () => {
      if (!currentUser?.uid) return;
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserData(userSnap.data());
        }
      } catch (e) {
        console.error('사용자 데이터 로드 중 오류:', e);
      }
    };
    loadUserData();
  }, [currentUser]);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const particlesInit = useCallback(async (engine: any) => {
    await loadSlim(engine);
  }, []);

  const menuItems = [
  {
    title: "모두트리 예술 작품",
    description: "사진을 예술 작품으로 변화되는\n 즐거움을 선물합니다",
    icon: "/logos/ai2.png",
    path: "/art-generation"
  },
    {
      title: "AI 사진 투표",
      description: `AI가 만들어 주는 사진 투표\n당신의 선택은?`,
      icon: "/logos/ai2.png",
      path: "/photo-story",
      color: "from-blue-500 to-purple-500"
    },
    {
      title: "AI 사연 투표",
      description: "AI가 만들어 주는 사연 투표\n당신의 선택은?",
      icon: "/logos/ai3.png",
      path: "/modoo-ai",
      color: "from-purple-500 to-pink-500"
    },
    {
      title: "공감 한 조각",
      description: "기쁨 슬픔 등의 내 감정 기록\n 은근 공감 받는 공유 익명 일기",
      icon: "/logos/ai1.png",
      path: "/likes/all",
      color: "from-pink-500 to-red-500"
    },
    {
      title: "내 사이트",
      description: "AI 분석과 조언으로\n 나만의 감정 지도를 완성하세요",
      icon: "/logos/m12.png",
      path: !currentUser?.uid ? '/login' : (userData?.username ? `/${userData.username}` : ''),
      color: "from-green-500 to-blue-500"
    },
    {
      title: "열린 게시판",
      description: "의견 말씀 감사합니다\n열린 게시판 및 카카오톡 채팅",
      icon: "/logos/ai4.png",
      path: "/inquiry",
      color: "from-blue-400 to-cyan-500"
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white/90 relative">
      <Particles
        className="absolute inset-0"
        init={particlesInit}
          options={{
            fpsLimit: 120,
            particles: {
              color: {
                value: ["#ffffff", "#87CEEB", "#FFD700"]
              },
              links: {
                color: "#ffffff",
                distance: 150,
                enable: true,
                opacity: 0.05,
                width: 1,
              },
              collisions: {
                enable: false,
              },
              move: {
                direction: "none",
                enable: true,
                outModes: {
                  default: "out"
                },
                random: true,
                speed: { min: 0.1, max: 0.3 },
                straight: false,
                attract: {
                  enable: true,
                  rotate: {
                    x: 600,
                    y: 1200
                  }
                }
              },
              number: {
                density: {
                  enable: true,
                  area: 800
                },
                value: 120
              },
              opacity: {
                animation: {
                  enable: true,
                  minimumValue: 0.1,
                  speed: 1,
                  sync: false
                },
                random: true,
                value: { min: 0.1, max: 0.8 }
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
                value: { min: 1, max: 3 }
              },
              twinkle: {
                lines: {
                  enable: true,
                  frequency: 0.005,
                  opacity: 0.5,
                  color: {
                    value: ["#ffffff", "#87CEEB"]
                  }
                },
                particles: {
                  enable: true,
                  frequency: 0.05,
                  opacity: 0.5
                }
              }
            },
            detectRetina: true
        }}
      />

      <div className="relative z-10 min-h-screen flex flex-col">
        <LoginOutButton />
        
        {/* 음악 컨트롤 */}
        {isAudioLoaded && (
          <button
            onClick={() => {
              const audio = document.getElementById('bgMusic') as HTMLAudioElement;
              if (audio) {
                if (isMuted) {
                  const playPromise = audio.play();
                  if (playPromise !== undefined) {
                    playPromise.then(() => {
                      audio.volume = 0.05;
                      setIsMuted(false);
                    }).catch((error) => {
                      console.log('Play prevented:', error);
                    });
                  }
                } else {
                  audio.pause();
                  setIsMuted(true);
                }
              }
            }}
            className="fixed top-4 right-16 z-50 w-9 h-9 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-all"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
          </button>
        )}

        {/* 배경 음악 */}
        <audio id="bgMusic" loop preload="auto">
          <source src="/music/background.mp3" type="audio/mpeg" />
          음악 파일을 재생할 수 없습니다.
        </audio>
        
        <div className="container mx-auto px-4 flex-1 flex items-center">
           <div className="w-full mt-15 md:-mt-20">
            <div className="text-center mb-6">
              <div className="flex justify-center">
                <button 
                  onClick={() => router.push('/site')} 
                  className="animate-swing mb-2 relative cursor-pointer group inline-flex"
                >
                  <Image
                    src="/Image/logo.png"
                    alt="모두트리 로고"
                    width={250}
                    height={250}
                    priority
                    className="w-24 h-24 md:w-32 md:h-32"
                  />
                  <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-1.5 shadow-lg flex items-center justify-center hover:bg-blue-600 transition-colors">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                </button>
              </div>
              <h1 className="text-3xl font-bold text-white/90 mb-2">모두트리</h1>
              <p className="text-1xl md:text-1xl font-medium text-white mb-4">우주 안의 나, 모두트리의 너</p>

              {/* 로고 섹션 */}
              <div className="w-full overflow-x-auto overflow-y-hidden py-2 mb-4">
                <div className="flex flex-nowrap items-center justify-start md:justify-center gap-4 md:gap-6 px-4 min-w-max md:min-w-0">
                  {[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map((num) => (
                    <img
                      key={num}
                      src={`/logos/m${num}.png`}
                      alt={`Logo ${num}`}
                      className="w-12 h-12 object-contain transition-all hover:scale-110 flex-shrink-0"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* 메뉴 그리드 */}
             <div className="max-w-[1030px] mx-auto p-4 mb-10 md:mb-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {menuItems.map((item, index) => (
                    <div key={index} className="flex justify-start">
                      <button
                        onClick={() => {
                          if (index === 3 && currentUser?.uid && !userData?.username) {
                            setIsOpen(true);
                          } else {
                            router.push(item.path);
                          }
                        }}
                        className={`w-[330px] md:w-[316px] aspect-[3/1] group relative overflow-hidden rounded-[20px] bg-gradient-to-r from-blue-500/10 to-blue-600/20 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] shadow-lg border ${
                          index === 0 ? 'border-yellow-300/50' :
                          index === 1 ? 'border-orange-300/50' :
                          index === 2 ? 'border-rose-200/50' :
                          index === 3 ? 'border-emerald-200/50' :
                          'border-white/40'
                        }`}
                    >
                      <div className="h-full px-4 flex items-center">
                        {/* Row */}
                        <div className="flex items-center w-full">
                          {/* 아이콘 영역 */}
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/10 p-2 shadow-sm backdrop-blur-sm">
                            <Image
                              src={item.icon}
                              alt={item.title}
                              width={24}
                              height={24}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          
                          {/* Column: 제목/설명 영역 */}
                          <div className="flex flex-col ml-5 flex-grow min-w-0 text-left">
                            <h2 className="text-lg font-bold text-white/90 truncate text-left mb-1">{item.title}</h2>
                            <p className="text-sm text-white/60 text-left whitespace-pre-line">{item.description}</p>
                          </div>

                          {/* 컬러 바 */}
                          <div className={`w-1 h-12 rounded-full ml-4 flex-shrink-0 ${item.color}`} />
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <BottomTabs />
      </div>

      {/* 모달 */}
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/70" aria-hidden="true" />

        <Dialog.Panel className="bg-blue-900/90 p-8 rounded-2xl shadow-lg z-50 max-w-sm w-full relative border border-blue-500/30 backdrop-blur-lg">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 text-blue-200 hover:text-white text-xl transition-colors"
            aria-label="닫기"
          >
            &times;
          </button>

          <h2 className="text-blue-100 text-xl font-bold mb-6 text-center">새 페이지 만들기</h2>
          
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center bg-blue-950/50 rounded-xl shadow-inner p-4 border border-blue-400/20 focus-within:border-blue-400 transition-all w-full">
              <span className="text-blue-200 text-lg mr-1">modootree.com/</span>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.trim());
                  setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveUsername();
                  }
                }}
                placeholder="ID"
                className="flex-grow text-blue-200 text-lg outline-none bg-transparent placeholder-blue-300/30"
              />
            </div>

            <p className="text-blue-200/80 text-sm">
              ID 입력 후 Enter를 눌러주세요
            </p>
          </div>

          {error && (
            <p className="text-red-300 text-sm mt-4 text-center animate-pulse">
              {error}
            </p>
          )}
        </Dialog.Panel>
      </Dialog>
    </div>
  );

  async function handleSaveUsername() {
    if (!username) {
      setError('닉네임을 입력해주세요.');
      return;
    }

    const usernameRef = doc(db, 'usernames', username);
    const existing = await getDoc(usernameRef);
    if (existing.exists()) {
      setError('이미 사용 중인 닉네임입니다.');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        username,
      });

      await setDoc(doc(db, "users", currentUser.uid, "links", "page"), {
        components: [],
        type: null
      });
      
      await setDoc(usernameRef, {
        uid: currentUser.uid,
      });

      setIsOpen(false);
      router.push(`/editor/${username}`);
    } catch (err) {
      setError('저장 중 오류가 발생했습니다.');
    }
  }
}