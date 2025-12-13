'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Home as HomeIcon, ChevronRight, Menu, Phone, Copy, Check, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { loadSlim } from "tsparticles-slim";
import Particles from "react-tsparticles";

interface YoutubeVideo {
  id: string;
  title: string;
  thumbnail: string; // 실제 썸네일 URL로 업데이트
  youtubeUrl: string;
}

// 유튜브 영상 ID 추출 함수
const getYoutubeVideoId = (url: string): string | null => {
  const watchMatch = url.match(/(?:\?v=|\/embed\/|\.be\/)([^&\n?#]+)/);
  if (watchMatch && watchMatch[1]) {
    return watchMatch[1];
  }
  const shortsMatch = url.match(/shorts\/([^?\n&]+)/);
  if (shortsMatch && shortsMatch[1]) {
    return shortsMatch[1];
  }
  return null;
};

const YoutubeVideoPlayer: React.FC<{ video: YoutubeVideo }> = ({ video }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoId = getYoutubeVideoId(video.youtubeUrl);

  if (!videoId) {
    return <div className="relative w-full h-0 pb-[56.25%] bg-gray-900 flex items-center justify-center text-red-400">Invalid video URL</div>;
  }

  return (
    <div className="relative w-full h-0 pb-[56.25%] bg-gray-900 rounded-lg overflow-hidden cursor-pointer" onClick={() => setIsPlaying(true)}>
      {!isPlaying ? (
        <>
          <img
            src={video.thumbnail}
            alt={video.title}
            className="absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-300"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 transition-all duration-300">
            <img src="/Image/sns/youtube.png" alt="Play Video" className="w-16 h-16 object-contain" />
          </div>
        </>
      ) : (
        <iframe
          className="absolute top-0 left-0 w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&showinfo=0&rel=0`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      )}
    </div>
  );
};

const dummyYoutubeVideos: YoutubeVideo[] = [
  {
    id: 'video1',
    title: '퀴즈를 풀어야 볼 수 있는 편지',
    youtubeUrl: 'https://youtube.com/shorts/1GmgcfZRoOU?si=OLZ6ihPXL-H1aLBz',
    thumbnail: 'https://img.youtube.com/vi/1GmgcfZRoOU/hqdefault.jpg',
  },
  {
    id: 'video2',
    title: '모두트리 눈사람 산타가 되다',
    youtubeUrl: 'https://youtube.com/shorts/KPNhNq7q7vA?si=z9YH1jDslFMw4Wqb',
    thumbnail: 'https://img.youtube.com/vi/KPNhNq7q7vA/hqdefault.jpg',
  },
  {
    id: 'video3',
    title: '모두트리 응원송',
    youtubeUrl: 'https://youtube.com/shorts/DxSfJI23bMU?si=QuuY4Q4VXZ8c1lD4',
    thumbnail: 'https://img.youtube.com/vi/DxSfJI23bMU/hqdefault.jpg',
  },
  {
    id: 'video4',
    title: '모두트리 공감송',
    youtubeUrl: 'https://youtube.com/shorts/2ieKWOCIaIU?si=xVN2xjwhI88Vhn1Y',
    thumbnail: 'https://img.youtube.com/vi/2ieKWOCIaIU/hqdefault.jpg',
  },
  {
    id: 'video5',
    title: '링크편지 대신 보내 드립니다',
    youtubeUrl: 'https://youtube.com/shorts/-Zv4mvmlWpA?si=7NS98Xr5lXhCnea_',
    thumbnail: 'https://img.youtube.com/vi/-Zv4mvmlWpA/hqdefault.jpg',
  },
  {
    id: 'video6',
    title: '문 앞, 가족의 속마음',
    youtubeUrl: 'https://youtube.com/shorts/4cxJ-fKORnw?si=t1W2AkSwCFyZLzZ9',
    thumbnail: 'https://img.youtube.com/vi/4cxJ-fKORnw/hqdefault.jpg',
  },
];

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
            value: ["#FFB6C1", "#FF69B4", "#FF1493", "#DC143C", "#FFF", "#FFD700", "#FF6347"]
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
            speed: { min: 0.5, max: 2 },
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
              area: 1000
            },
            value: 60
          },
          opacity: {
            animation: {
              enable: true,
              minimumValue: 0.2,
              speed: 1.5,
              sync: false
            },
            random: true,
            value: { min: 0.3, max: 0.8 }
          },
          shape: {
            type: ["heart", "star", "circle", "triangle"],
            options: {
              heart: {
                particles: {
                  size: {
                    value: { min: 8, max: 16 }
                  }
                }
              },
              star: {
                sides: 5,
                particles: {
                  size: {
                    value: { min: 6, max: 12 }
                  }
                }
              }
            }
          },
          size: {
            animation: {
              enable: true,
              minimumValue: 2,
              speed: 3,
              sync: false
            },
            random: true,
            value: { min: 3, max: 8 }
          },
          rotate: {
            animation: {
              enable: true,
              speed: 2,
              sync: false
            },
            direction: "random",
            random: true,
            value: { min: 0, max: 360 }
          }
        },
        detectRetina: true,
        interactivity: {
          events: {
            onHover: {
              enable: true,
              mode: "bubble"
            },
            onClick: {
              enable: true,
              mode: "push"
            }
          },
          modes: {
            bubble: {
              distance: 150,
              duration: 2,
              opacity: 1,
              size: 12
            },
            push: {
              quantity: 3
            }
          }
        }
      }}
    />
  );
};

export default function Home() {
  const [isOpen, setIsOpen] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const router = useRouter();

  if (!isOpen) return null;

  const handleNavigateToLinkLetter = () => {
    router.push('/link-letter');
  };

  return (
    <div className="min-h-screen bg-[#e93e4a] overflow-y-auto cursor-penc relative">
      {/* 파티클 배경 효과 */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <ParticlesComponent />
      </div>
      
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
      <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.push('/');
            }}
            className="text-white hover:opacity-80 transition flex items-center gap-2 cursor-penc-hover relative z-50 pointer-events-auto"
          >
            <HomeIcon className="w-4 h-4" />
            <span className="font-bold">모두트리</span>
          </button>
        <div className="flex flex-col items-end gap-2">
          <p className="text-white text-sm">
            퀴즈를 풀어야 볼 수 있는{' '}
            <span className="font-bold">링크편지</span>
          </p>
          
        </div>
      </header>

      {/* Main Menu Container */}
      <div className="relative w-full flex items-center justify-center z-10 py-50 sm:py-55 md:py-60">
        {/* Organic Blob Shape - More Distorted */}
        <svg
          className="absolute w-[90%] sm:w-[80%] md:w-[70%] h-[80%]"
          viewBox="0 0 800 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
           d="M400 50C550 50 700 150 750 300C800 450 750 600 700 700C650 800 500 850 400 850C300 850 150 800 100 700C50 600 0 450 50 300C100 150 250 50 400 50Z"
            fill="#F5F5F0"
          />
        </svg>

         {/* Menu Items */}
         <nav className="relative z-10 text-center">
         <p className="text-black text-lg mb-1">
             퀴즈를 풀어야 볼 수 있는{' '}
             <span className="font-bold">링크편지</span>
           </p>
           <ul className="space-y-4">
             <MenuItem text="모두트리" active={false} />
             <MenuItem text="링크편지" active={true} />
           </ul>

         </nav>

        {/* Penc Logo */}
        <div className="absolute bottom-[20%] right-[20%] z-10">
          <button onClick={() => router.push('/link-letter')} className="hover:scale-110 transition-transform duration-300 cursor-penc-hover">
            <PencLogo />
          </button>
        </div>
        
      </div>

      {/* 링크편지 설명 섹션 */}
      <div className="relative z-20 px-6 pb-1">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-white text-lg md:text-2xl font-bold text-center mb-8" style={{ fontFamily: '"Noto Sans KR", sans-serif' }}>
            링크편지로 특별한 마음을 전하세요
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* 카드 1: 퀴즈 기능 */}
            <button 
              onClick={() => router.push('/link-letter')}
              className="w-full bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 text-left cursor-penc-hover"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"/>
                    <path d="m6.2 5.3 3.1 3.9"/>
                    <path d="m12.4 3.4 3.1 4"/>
                    <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-white text-lg font-bold mb-2" style={{ fontFamily: '"Noto Sans KR", sans-serif' }}>
                    퀴즈 편지로 마음을 전달하세요
                  </h3>
                  <p className="text-white/80 text-sm leading-relaxed" style={{ fontFamily: '"Noto Sans KR", sans-serif' }}>
                    상대방만 알 수 있는 특별한 퀴즈를 만들어 진심을 담은 편지 링크를 전달하세요.
                  </p>
                </div>
              </div>
            </button>

            {/* 카드 2: 카테고리별 */}
            <button 
              onClick={() => router.push('/link-letter')}
              className="w-full bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 text-left cursor-penc-hover"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="7.5 4.21 12 6.81 16.5 4.21"/>
                    <polyline points="7.5 19.79 7.5 14.6 3 12"/>
                    <polyline points="21 12 16.5 14.6 16.5 19.79"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                    <line x1="12" x2="12" y1="22.08" y2="12"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-white text-lg font-bold mb-2" style={{ fontFamily: '"Noto Sans KR", sans-serif' }}>
                    객관·주관식을 모두 지원합니다
                  </h3>
                  <p className="text-white/80 text-sm leading-relaxed" style={{ fontFamily: '"Noto Sans KR", sans-serif' }}>
                    객관식 주관식 혼합으로 받는 사람만 볼 수 있는 퀴즈편지로 만들어 보세요. 
                  </p>
                </div>
              </div>
            </button>

            {/* 카드 3: 개인화 */}
            <button 
              onClick={() => router.push('/anonymous-chat')}
              className="w-full bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 text-left cursor-penc-hover"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 18a2 2 0 0 0-4 0"/>
                    <path d="m19 11-2.11-6.657a2 2 0 0 0-2.752-1.148l-1.276.61A2 2 0 0 1 12 4H8.5a2 2 0 0 0-1.925 1.456L5 11"/>
                    <path d="M2 11h20"/>
                    <circle cx="17" cy="18" r="3"/>
                    <circle cx="7" cy="18" r="3"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-white text-base md:text-lg font-bold mb-0 md:mb-2" style={{ fontFamily: '"Noto Sans KR", sans-serif' }}>
                    대신 보내 드립니다.
                  </h3>
                  <p className="text-white/80 text-xs md:text-sm leading-relaxed" style={{ fontFamily: '"Noto Sans KR", sans-serif' }}>
                    익명으로 퀴즈 편지를 대신 보내 드립니다. 신청 게시판, 양식에 맞게 작성해 주세요.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 유튜브 영상 캐러셀 섹션 */}
      <section className="relative z-20 px-4 py-12 bg-white/10 backdrop-blur-sm rounded-3xl mt-12 mb-12 mx-4">
        <div className="max-w-6xl mx-auto text-center">
        <h2 className="md:hidden text-xl font-medium text-white/90 mb-6 leading-relaxed">
                모두트리 SNS 영상<br />유튜브 쇼츠로 만나보세요
              </h2>
              <h2 className="md:block hidden text-2xl font-medium text-white/90 mb-6 leading-relaxed">
                모두트리 SNS 영상<br />유튜브 쇼츠로 만나보세요
              </h2>

          {/* 모바일: 단일 카드 캐러셀 */}
          <div className="md:hidden relative max-w-sm mx-auto">
            <div className="overflow-hidden rounded-xl shadow-xl border border-white/20">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{
                  transform: `translateX(-${currentVideoIndex * 100}%)`,
                }}
              >
                {dummyYoutubeVideos.map((video, index) => (
                  <div key={video.id} className="w-full flex-shrink-0 px-2">
                    <YoutubeVideoPlayer video={video} />
                    <p className="mt-4 mb-4 md:mb-2 text-sm font-medium text-white/90 text-center px-2">{video.title}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 모바일 네비게이션 버튼 */}
            {dummyYoutubeVideos.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentVideoIndex((prev) => (prev - 1 + dummyYoutubeVideos.length) % dummyYoutubeVideos.length)}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-all duration-300 z-10"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentVideoIndex((prev) => (prev + 1) % dummyYoutubeVideos.length)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-all duration-300 z-10"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* 모바일 인디케이터 */}
            <div className="flex justify-center gap-2 mt-6">
              {dummyYoutubeVideos.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentVideoIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    currentVideoIndex === index ? 'bg-white shadow-lg' : 'bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* PC: 다중 카드 그리드 */}
          <div className="hidden md:block">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {dummyYoutubeVideos.map((video, index) => (
                <div key={video.id} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300">
                  <YoutubeVideoPlayer video={video} />
                  <h3 className="mt-4 text-lg font-medium text-white/90 text-center leading-relaxed">
                    {video.title}
                  </h3>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Google AdSense */}
      <div className="mt-12 text-center">
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6697023128093217"
             crossOrigin="anonymous"></script>
        {/* 모두트리 */}
        <ins className="adsbygoogle"
             style={{ display: 'block' }}
             data-ad-client="ca-pub-6697023128093217"
             data-ad-slot="5076482687"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
        <script>
             (adsbygoogle = window.adsbygoogle || []).push({});
        </script>
      </div>

    </div>
  );
}

function MenuItem({ text, active }: { text: string; active: boolean }) {
  return (
    <li>
      <a
        href="#"
        className={`
          inline-block text-7xl sm:text-8xl md:text-9xl font-bold tracking-tight
          transition-all duration-300 hover:scale-110
          ${
            active
              ? 'text-[#EF3340]'
              : 'text-gray-900 hover:text-[#EF3340]'
          }
        `}
        style={{
          fontFamily: '"Noto Sans KR", system-ui, -apple-system, sans-serif',
          fontWeight: 700,
          letterSpacing: '-0.02em',
        }}
      >
        {text}
      </a>
    </li>
  );
}

function PencLogo() {
  return (
    <div className="animate-float">
      <img
        src="/logos/penc.png"
        alt="Penc Logo"
        width={100}
        height={100}
        className="w-20 h-20 object-contain"
      />
    </div>
  );
}
