'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Home, ChevronRight, Menu, Phone, Copy, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { loadSlim } from "tsparticles-slim";
import Particles from "react-tsparticles";

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

export default function ProsMenu() {
  const [isOpen, setIsOpen] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);
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
            <Home className="w-4 h-4" />
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
      <div className="relative w-full flex items-center justify-center z-10 py-45 sm:py-55 md:py-60">
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

         {/* Speech Bubbles - Top */}

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

         {/* Speech Bubbles - Bottom */}
        

        {/* Penc Logo */}
        <div className="absolute bottom-[20%] right-[20%] z-10">
          <button onClick={() => router.push('/link-letter')} className="hover:scale-110 transition-transform duration-300 cursor-penc-hover">
            <PencLogo />
          </button>
        </div>

        
      </div>
      

      {/* 링크편지 설명 섹션 */}
      <div className="relative z-20 px-6 pb-12">
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
                    퀴즈로 마음 전달
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
                    다양한 테마
                  </h3>
                  <p className="text-white/80 text-sm leading-relaxed" style={{ fontFamily: '"Noto Sans KR", sans-serif' }}>
                    사랑, 감사, 가족, 우정 등 다양한 테마로 상황에 맞는 링크편지를 작성하세요.
                  </p>
                </div>
              </div>
            </button>

            {/* 카드 3: 개인화 */}
            <button 
              onClick={() => router.push('/link-letter')}
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
                  <h3 className="text-white text-lg font-bold mb-2" style={{ fontFamily: '"Noto Sans KR", sans-serif' }}>
                    개인화된 경험
                  </h3>
                  <p className="text-white/80 text-sm leading-relaxed" style={{ fontFamily: '"Noto Sans KR", sans-serif' }}>
                    받는 사람만을 위한 맞춤형 퀴즈와 메시지로 세상에 하나뿐인 링크편지를 만들어보세요.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

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
