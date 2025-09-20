'use client';

import { useEffect, useState, useCallback } from 'react';
import { db } from '../../firebase';
import { getAuth } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Dialog } from '@headlessui/react';
import { useSelector, useDispatch } from 'react-redux';
import { setUser, clearUser } from '../../store/userSlice';
import UserSampleCarousel from '@/components/UserSampleCarousel';
import UserSampleCarousel2 from '@/components/UserSampleCarousel2';
import UserSampleCarousel3 from '@/components/UserSampleCarousel3';
import Image from 'next/image';
import { ChevronDown, ChevronUp, X, Plus, Download } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import MainHeader from '@/components/MainHeader';
import { loadSlim } from "tsparticles-slim";
import Particles from "react-tsparticles";

const ParticlesComponent = () => {
  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  return (
    <Particles
      className="absolute inset-0"
      init={particlesInit}
      options={{
        fpsLimit: 120,
        particles: {
          color: {
            value: "#ffffff",
          },
          links: {
            color: "#ffffff",
            distance: 150,
            enable: true,
            opacity: 0.2,
            width: 1,
          },
          move: {
            enable: true,
            outModes: {
              default: "bounce",
            },
            random: false,
            speed: 1,
            straight: false,
          },
          number: {
            density: {
              enable: true,
              area: 800,
            },
            value: 80,
          },
          opacity: {
            value: 0.2,
          },
          shape: {
            type: "circle",
          },
          size: {
            value: { min: 1, max: 3 },
          },
        },
        detectRetina: true,
      }}
    />
  );
};

export default function Page() {
  const dispatch = useDispatch();
  const { currentUser } = useSelector((state) => state.user);
  const auth = getAuth();
  
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [allowedSites, setAllowedSites] = useState([]);
  const [showAllowedSites, setShowAllowedSites] = useState(false);
  const { push } = useRouter();
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // Firebase 인증 상태 변경 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // 사용자가 로그인한 경우
        dispatch(setUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        }));
      } else {
        // 사용자가 로그아웃한 경우
        dispatch(clearUser());
      }
    });

    return () => unsubscribe();
  }, [auth, dispatch]);

  // 사용자 데이터 로드
  useEffect(() => {
    const loadUserData = async () => {
      if (!currentUser?.uid) {
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserData(userSnap.data());
        }

        // 허용된 사이트 목록 가져오기
        const usernamesRef = collection(db, 'usernames');
        const usernamesSnap = await getDocs(usernamesRef);
        const usernames = [];

        for (const docSnapshot of usernamesSnap.docs) {
          const data = docSnapshot.data();
          const uid = data.uid;
          if (uid) {
            const permissionsRef = doc(db, 'users', uid, 'settings', 'permissions');
            const permissionsSnap = await getDoc(permissionsRef);
            
            if (permissionsSnap.exists()) {
              const permissionsData = permissionsSnap.data();
              const allowedUsers = permissionsData.allowedUsers || [];
              const isAllowed = allowedUsers.some(allowedUser => allowedUser.email === currentUser.email);
              
              if (isAllowed) {
                usernames.push({
                  username: docSnapshot.id,
                  uid: uid
                });
              }
            }
          }
        }

        setAllowedSites(usernames);
      } catch (e) {
        console.error('사용자 데이터 로드 중 오류:', e);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [currentUser]);

  const handleSaveUsername = async () => {
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
        components: [], // 빈 배열로 시작
        type: null // 타입도 초기에는 null
      });
      
      await setDoc(usernameRef, {
        uid: currentUser.uid,
      });

      setIsOpen(false);
      push(`/editor/${username}`);
    } catch (err) {
      setError('저장 중 오류가 발생했습니다.');
    }
  };

  const renderViewSiteButton = (type) => {
    const className = type === 'main'
      ? 'bg-blue-600 hover:bg-blue-700'
      : 'bg-sky-500 hover:bg-sky-600';

    const label = type === 'main' ? '내 사이트 만들기' : '내 사이트 보기';
    const href = type === 'main' ? `/editor/${userData?.username}` : `/${userData?.username}`;

    if (userData?.username) {
      return (
        <Link
          href={href}
          className={`${className} text-white px-6 py-3.5 rounded-2xl text-[15px] transition-colors`}
        >
          {label}
        </Link>
      );
    }

    if (currentUser?.uid) {
      return (
        <button
          onClick={() => setIsOpen(true)}
          className={`${className} text-white px-6 py-3.5 rounded-2xl text-[15px] transition-colors`}
        >
          {label}
        </button>
      );
    }

    return (
      <Link
        href="/register"
        className={`${className} text-white px-6 py-3.5 rounded-2xl text-[15px] transition-colors`}
      >
        {label}
      </Link>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <MainHeader />
      {/* 첫 번째 섹션 - 소개 및 버튼 */}
      <div className="w-full zinc-900 rounded-3xl">
        <div className="max-w-[1100px] mx-auto px-4">
          <div className="flex flex-col items-center justify-center pt-6 pb-6 md:py-10 text-center mb-8">
            <Sheet>
              <SheetTrigger asChild>
                <div className="animate-swing mb-4 relative cursor-pointer">
                  <Image
                    src="/Image/logo.png"
                    alt="모두트리 로고"
                    width={300}
                    height={300}
                    priority
                    className="w-24 h-24 md:w-32 md:h-32"
                  />
                  <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-1.5 shadow-lg flex items-center justify-center hover:bg-blue-600 transition-colors">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                </div>
              </SheetTrigger>
              <SheetContent side="right" className="bg-gray-900/95 border-gray-800 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="text-white">모두트리 로고</SheetTitle>
                  <p className="text-gray-400 text-sm">모두트리 로고를 다운로드 하세요.</p>
                </SheetHeader>
                <div className="mt-8 grid grid-cols-2 gap-4">
                  {[
                    { name: '웃음 모두트리', path: '/logos/m1.png', type: 'png' },
                    { name: '건방 모두트리', path: '/logos/m2.png', type: 'png' },
                    { name: '놀람 모두트리', path: '/logos/m3.png', type: 'png' },
                    { name: '부끄 모두트리', path: '/logos/m4.png', type: 'png' },
                    { name: '건달 모두트리', path: '/logos/m5.png', type: 'png' },
                    { name: '울음 모두트리', path: '/logos/m6.png', type: 'png' },
                    { name: '흘림 모두트리', path: '/logos/m7.png', type: 'png' },
                    { name: '어머 모두트리', path: '/logos/m8.png', type: 'png' },
                    { name: '화남 모두트리', path: '/logos/m9.png', type: 'png' },
                    { name: '뽀뽀 모두트리', path: '/logos/m10.png', type: 'png' },
                    { name: '방긋 모두트리', path: '/logos/m11.png', type: 'png' },
                    { name: '산타 모두트리', path: '/logos/m12.png', type: 'png' },
                    { name: '심슨 모두트리', path: '/logos/m13.png', type: 'png' },
                    { name: '괴물 모두트리', path: '/logos/m14.png', type: 'png' },
                  ].map((logo, index) => (
                    <div key={index} className="bg-gray-800/50 rounded-xl p-3 hover:bg-gray-800/70 transition-colors group">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-white text-sm font-medium truncate pr-2">{logo.name}</h3>
                        <a 
                          href={logo.path} 
                          download 
                          className="text-blue-400 hover:text-blue-300 transition-colors p-1.5 hover:bg-blue-500/10 rounded-full"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                      <div className="relative aspect-square w-full bg-black/20 rounded-lg overflow-hidden">
                        <Image
                          src={logo.path}
                          alt={logo.name}
                          fill
                          className="object-contain p-3"
                        />
                      </div>
                      <p className="text-gray-500 text-xs mt-1 text-right">{logo.type.toUpperCase()}</p>
                    </div>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-3xl font-bold text-white/90 mb-3">모두트리</h1>
            <p className="text-lg text-white/80 mb-10">나만의 특별한 한페이지를 만들어보세요</p>

            <div className="grid gap-3 w-full md:max-w-sm mx-auto mb-16">
              {renderViewSiteButton('main')}
              {renderViewSiteButton('sub')}
              <Link
                href="/likes/all"
                className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3.5 rounded-2xl text-[15px] transition-colors"
              >
                공감 한 조각
              </Link>
              <Link
                href="/joy"
                className="bg-violet-500 hover:bg-violet-600 text-white px-6 py-3.5 rounded-2xl text-[15px] transition-colors"
              >
                사진 한 조각
              </Link>
              {(currentUser?.uid) && allowedSites.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowAllowedSites(!showAllowedSites)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 h-[52px] rounded-2xl text-[15px] transition-colors flex items-center justify-center relative"
                  >
                    <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap">초대 페이지 목록 {allowedSites.length}개</span>
                    <span className="absolute right-4">
                      {showAllowedSites ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </span>
                  </button>
                  {showAllowedSites && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-emerald-600/95 backdrop-blur-sm rounded-2xl overflow-hidden shadow-lg z-10">
                      {allowedSites.map((site) => (
                        <Link
                          key={site.username}
                          href={`/${site.username}`}
                          className="block px-6 py-3 hover:bg-emerald-700/80 text-white text-[15px] text-left border-b border-white/10 last:border-none"
                        >
                          modootree.com/{site.username}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 두 번째 섹션 - 첫 번째 샘플 캐로셀 */}
      <section className="relative bg-gradient-to-b rounded-2xl from-black to-blue-950 py-4 overflow-hidden mb-12">
        <ParticlesComponent />
        <div className="relative z-10 py-16">
          <div className="flex flex-col items-center justify-center text-center mb-12">
          <h2 className="md:hidden text-xl font-medium text-white/90 mb-12 leading-relaxed">
              모두트리는 대한민국 5,500만명에게<br />
              작지만 의미 있는 한페이지를 선물합니다.
            </h2>

            <h2 className="md:block hidden text-2xl font-medium text-white/90 mb-12 leading-relaxed">
              모두트리는 대한민국 5,500만명에게<br />
              작지만 의미 있는 한페이지를 선물합니다.
            </h2>
          </div>
          <UserSampleCarousel />
        </div>
      </section>

      {/* 세 번째 섹션 - 두 번째 샘플 캐로셀 */}
      <div className="w-full bg-[#0d1b2a] rounded-2xl mb-12">
        <div className="max-w-[1100px] mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center text-center">
            <h2 className="md:hidden text-xl font-medium text-white/90 mb-12 leading-relaxed">
              세심하게 설계된 에디터 간편 기능<br /> 초대 · 번역 · 알림 · 템플릿 · 공감 · 공유 · AI답변 기능을 만나보세요 
            </h2>

            <h2 className="md:block hidden text-2xl font-medium text-white/90 mb-12 leading-relaxed">
            모두트리의 세심하게 설계된 에디터 간편 기능과<br /> 초대 · 번역 · 알림 · 템플릿 · 공감 · 공유 · AI답변 기능을 만나보세요 
            </h2>
          </div>
          <UserSampleCarousel2 />
        </div>
      </div>

      {/* 새로 추가된 섹션 - 세 번째 섹션 복사 */}
      <div className="w-full bg-[#1b263b] rounded-2xl mb-12">
        <div className="max-w-[1100px] mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center text-center">
            <h2 className="md:hidden text-xl font-medium text-white/90 mb-12 leading-relaxed">
              모두트리 이렇게 사용해 보세요<br /> 커플일기 · 오픈일정표 · 포트폴리오 · 링크모음 · 게스트북 · 커뮤니티
            </h2>

            <h2 className="md:block hidden text-2xl font-medium text-white/90 mb-12 leading-relaxed">
            모두트리 이렇게 사용해 보세요<br /> 커플일기 · 오픈일정표 · 포트폴리오 · 링크모음 · 게스트북 · 커뮤니티
            </h2>
          </div>
          <UserSampleCarousel3 />
        </div>
      </div>

      {/* 문의하기 섹션 */}
      <div className="w-full bg-[#415a77] backdrop-blur-sm rounded-2xl mb-12">
        <div className="max-w-[1100px] mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center text-center">
            <h2 className="text-2xl font-bold text-white mb-6">
              자주 묻는 질문
            </h2>
            <div className="w-full max-w-[800px] space-y-2 mb-12">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                  >
                    <h3 className="text-white font-medium">{faq.question}</h3>
                    {openFaqIndex === index ? (
                      <ChevronUp className="w-5 h-5 text-white flex-shrink-0 ml-4" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-white flex-shrink-0 ml-4" />
                    )}
                  </button>
                  {openFaqIndex === index && (
                    <div className="px-6 py-4 border-t border-white/10">
                      <p className="text-white/70 text-sm">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-white/80 mb-6">
              저희 모두트리에게 하실 말씀 있으신가요?
            </p>
            <Link
              href="/inquiry"
              className="inline-flex items-center px-6 py-3 bg-blue-500/10 hover:bg-blue-500/20 text-white font-medium rounded-xl transition-colors border-2 border-blue-500/50 hover:border-blue-500/70"
            >
              의견 작성하기
            </Link>
          </div>
        </div>
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
}

const faqs = [
  {
    question: '모두트리는 무료인가요?',
    answer: '네, 모두트리의 기본 기능은 모두 무료로 제공됩니다.'
  },
  {
    question: '페이지는 몇 개까지 만들 수 있나요?',
    answer: '현재는 계정당 1개의 페이지를 만들 수 있습니다.'
  },
  {
    question: '다른 사람의 페이지를 수정할 수 있나요?',
    answer: '페이지 소유자가 초대한 경우에만 수정이 가능합니다.'
  },
  {
    question: '페이지 주소를 변경할 수 있나요?',
    answer: '아니요, 현재는 한 번 설정한 페이지 주소는 변경할 수 없습니다. 신중하게 설정해주세요.'
  },
  {
    question: '추가 개선하고 싶은 기능은 있나요?',
    answer: '게시판에 글 남겨주시면 최대한 반영하겠습니다.'
  },
  {
    question: 'AI 기능은 어떤 컴포넌트에서 가능한가요?',
    answer: '현재 다이어리 또는 게스트북을 오늘 메모로 사용하면 AI 기능을 사용할 수 있습니다'
  },
  {
    question: '제작하는 방법을 잘 모르겠습니다?',
    answer: '카카오톡 체널 실시간 문의 주세요, 링크버튼 게시판 기재'
  }
];
