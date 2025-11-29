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
import UserSampleCarousel6 from '@/components/UserSampleCarousel6';
import UserSampleCarousel7 from '@/components/UserSampleCarousel7';
import Image from 'next/image';
import { ChevronDown, ChevronUp, X, Plus, Download, Loader2, Palette } from 'lucide-react';
import FallingImagesEffect from '@/components/FallingImagesEffect'; // FallingImagesEffect 임포트
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
      className="absolute inset-0 z-[1]"
      init={particlesInit}
      options={{
        background: {
          opacity: 0
        },
        particles: {
          color: {
            value: ["#64B5F6", "#81C784", "#9575CD", "#4FC3F7", "#4DB6AC", "#7986CB"]
          },
          move: {
            direction: "none",
            enable: true,
            outModes: {
              default: "bounce"
            },
            random: false,
            speed: 2,
            straight: false
          },
          number: {
            density: {
              enable: true,
              area: 800
            },
            value: 30
          },
          opacity: {
            value: 0.4,
            animation: {
              enable: true,
              speed: 1,
              minimumValue: 0.1
            }
          },
          size: {
            value: { min: 5, max: 10 },
            animation: {
              enable: true,
              speed: 2,
              minimumValue: 3
            }
          },
          links: {
            color: "#ffffff",
            distance: 150,
            enable: true,
            opacity: 0.2,
            width: 1
          }
        }
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
  const [isLoading, setIsLoading] = useState(false); // 로딩 상태 추가
  const [allowedSites, setAllowedSites] = useState([]);
  const [showAllowedSites, setShowAllowedSites] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { push } = useRouter();
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [bgColorIndex, setBgColorIndex] = useState(0);
  const bgColors = [
    '#282c34',
    '#5b3c53',
    '#1a535c',
    '#e27d60',
    '#7a4e61',
    '#4c3a5e',
    '#5c8d89',
    '#b2c8d2',
    '#c94a53',
    '#6a0572',
    '#99b898',
    '#feceab',
    '#ff847c',
    '#e84a5f',
    '#2a363b',
  ];

  const changeBackgroundColor = () => {
    setBgColorIndex((prevIndex) => (prevIndex + 1) % bgColors.length);
  };

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

    setIsLoading(true); // 로딩 시작

    const usernameRef = doc(db, 'usernames', username);
    const existing = await getDoc(usernameRef);
    if (existing.exists()) {
      setError('이미 사용 중인 닉네임입니다.');
      setIsLoading(false); // 로딩 종료
      return;
    }

    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        username,
      });

      await setDoc(doc(db, "users", currentUser.uid, "links", "page"), {
        components: ["프로필카드", "매거진"],
        type: "community"
      });
      
      await setDoc(usernameRef, {
        uid: currentUser.uid,
      });

      setIsOpen(false);
      push(`/editor/${username}`);
    } catch (err) {
      setError('저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false); // 로딩 종료
    }
  };

  const renderViewSiteButton = () => {
    const className = 'bg-blue-600 hover:bg-blue-700';
    const label = '클릭 2번, 매거진 만들기';

    if (userData?.username) {
      return (
        <Link
          href={`/editor/${userData.username}`}
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
    <div
      className="min-h-screen bg-cover bg-center"
      style={{
        backgroundImage: 'url(\'/back/back.png\')',
      }}
    >
      <FallingImagesEffect /> {/* 여기에 FallingImagesEffect 컴포넌트 추가 */}
      <MainHeader />
      {/* 첫 번째 섹션 - 소개 및 버튼 */}
      <div className="w-full zinc-900 rounded-3xl">
        <div className="max-w-[2000px] mx-auto px-4">
    <div className="flex flex-col items-center justify-center pt-6 pb-0 md:py-4 text-center mb-0">
      {/* 1. 상단 여백 pt-10을 pt-20으로 수정 */}
      <h1 className="text-3xl pt-15 font-bold text-white/90 mb-3">모두트리 매거진</h1>
      <p className="text-lg text-white/80 mb-10">나만의 특별한 매거진을 만들어 보세요</p>

      {/* 2. 하단 여백 mb-8을 mb-4로 수정 */}
      <div className="grid gap-3 w-full md:max-w-sm mx-auto">
              {renderViewSiteButton('main')}
        
              <Link
                href={`/${userData?.username || ''}`}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 h-[52px] rounded-2xl text-[15px] transition-colors flex items-center justify-center"
                onClick={(e) => {
                  if (!currentUser?.uid) {
                    e.preventDefault();
                    push('/login');
                    return;
                  }
                  if (!userData?.username) {
                    e.preventDefault();
                    setIsOpen(true);
                    return;
                  }
                }}
              >
          매거진으로 이동합니다
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 모두트리 소개 섹션 */}
      <section className="w-full py-12 md:py-12 my-8">
        <div
          className="w-full rounded-3xl relative overflow-hidden bg-transparent"
          style={{
            backgroundColor: `${bgColors[bgColorIndex]}D9`,
          }}
        >
          <div className="absolute inset-0 z-0">
            <ParticlesComponent />
          </div>
          <div className="relative z-20 py-8 px-4">
          <div className="max-w-[1500px] mx-auto">
            <div className="flex justify-end mb-4">
              <button
                onClick={changeBackgroundColor}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-colors"
              >
                color
              </button>
            </div>


                  <div value="features">
                    <div className="relative rounded-2xl py-4 overflow-hidden">
                      <div className="absolute inset-0 z-0">
                        <ParticlesComponent />
                      </div>
                      <div className="relative z-10 py-0">
                        <div className="flex flex-col items-center justify-center text-center">
                        <h2 className="md:hidden text-xl font-medium text-white/90 mb-6 leading-relaxed">
                         매거진 샘플을 방문 해보세요.<br /> AI 일기 감정 분석 · 업로드 사진 스타일 적용 · 공감 기능
                          </h2>
                        <h2 className="md:block hidden text-2xl font-medium text-white/90 mb-6 leading-relaxed">
                        매거진 샘플을 방문 해보세요<br /> AI 일기 감정 분석 · 업로드 사진 스타일 적용 · 공감 기능
                          </h2>
                        </div>
                        <div className="pb-10">
                          <UserSampleCarousel6 />
                        </div>
                      </div>
                    </div>
                  </div>
          </div>
        </div>
        </div>
      </section>

       {/* 모두트리 소개 섹션 */}
       <section className="w-full py-4 md:py-2 my-8 pb-16 md:pb-24">
        <div
          className="w-full rounded-3xl relative overflow-hidden bg-transparent"
          style={{
            backgroundColor: `${bgColors[bgColorIndex]}D9`,
          }}
        >
          <div className="absolute inset-0 z-0">
            <ParticlesComponent />
          </div>
          <div className="relative z-20 py-8 px-4">
          <div className="max-w-[1500px] mx-auto">
          <div value="examples">
            <div className="relative rounded-2xl py-4 overflow-hidden">
              <div className="absolute inset-0 z-0">
                <ParticlesComponent />
              </div>
              <div className="relative z-10 py-4">
                <div className="flex flex-col items-center justify-center text-center">
                  <h2 className="md:hidden text-xl font-medium text-white/90 mb-12 leading-relaxed">
                  모두트리 매거진을 만들어 보세요.<br /> AI가 내 감성 기록 분석 · 내 사진으로 매거진을 만들어 드립니다.
                  </h2>
                  <h2 className="md:block hidden text-2xl font-medium text-white/90 mb-12 leading-relaxed">
                  모두트리 매거진을 만들어 보세요.<br /> AI가 내 감성 기록 분석 · 내 사진으로 매거진을 만들어 드립니다.
                  </h2>
                </div>
                <UserSampleCarousel7 />
              </div>
            </div>
          </div>
          </div>
        </div>
        </div>
      </section>


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

          <h2 className="text-blue-100 text-xl font-bold mb-6 text-center">매거진 만들기</h2>
          
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
                disabled={isLoading} // 로딩 중일 때 비활성화
              />
              {isLoading && <Loader2 className="w-5 h-5 animate-spin text-blue-300 ml-2" />} {/* 스피너 추가 */}
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
          {isLoading && (
            <div className="flex justify-center mt-4">
              <Loader2 className="w-6 h-6 text-blue-200 animate-spin" />
            </div>
          )}
        </Dialog.Panel>
      </Dialog>
    </div>
  );
}
