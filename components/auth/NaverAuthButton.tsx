"use client"
import { useState } from 'react';
import { getAuth, signInWithPopup, OAuthProvider } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useDispatch } from 'react-redux';
import { setUser } from "@/store/userSlice";
import app, { db } from "@/firebase";
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Gallery3 from '@/components/template/Gallery3';
import DayOneCalendarTemplate from '@/components/template/DayOneCalendarTemplate';
import DayOneBook from '@/components/template/DayOneBook';
import QuestBook from '@/components/template/QuestBook';

export default function NaverAuthButton() {
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const router = useRouter();

  const handleNaverSign = async () => {
    try {
      setLoading(true);
      const auth = getAuth(app);
      
      const provider = new OAuthProvider('oidc.naver.com');
      
      // profile 스코프 추가
      provider.addScope('profile');

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Firestore에서 사용자 정보 확인
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // 신규 사용자인 경우 정보 저장
        await setDoc(userRef, {
          email: user.email,
          photoURL: user.photoURL,
          provider: "naver",
          createdAt: serverTimestamp(),
        });

        // 기본 설정 저장
        await setDoc(doc(db, "users", user.uid, "settings", "background"), {
          type: 'image',
          value: 'https://firebasestorage.googleapis.com/v0/b/mtree-e0249.firebasestorage.app/o/backgrounds%2F1755605333707_strawberries-7249448_1920.jpg?alt=media&token=c7331dd0-48ff-430a-86bb-039ba16fe23f',
          animation: true
        });

        // 기본 템플릿으로 시작
        await setDoc(doc(db, "users", user.uid, "links", "page"), {
          components: ["Gallery3", "DayOneCalendarTemplate", "DayOneBook", "QuestBook"],
          type: "community"
        });
      }

      dispatch(setUser({
        uid: user.uid,
        email: user.email,
        photoURL: user.photoURL,
      }));

      router.push('/');

    } catch (error) {
      console.error("Naver login error:", error);
      alert("네이버 로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleNaverSign}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#03C75A] text-white font-semibold shadow hover:bg-[#02b351] transition-all hover:scale-[1.02]"
    >
      <Image 
        src="/Image/sns/naver.png"
        alt="네이버 로그인"
        width={20}
        height={20}
        className="opacity-90"
      />
      {loading ? "로그인 중..." : "네이버로 시작하기"}
    </button>
  );
}
