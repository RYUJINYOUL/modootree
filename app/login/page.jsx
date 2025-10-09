"use client"
import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form';
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, updateProfile, browserLocalPersistence } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from 'react-redux';
import useAuth from '@/hooks/useAuth'
import app, { db } from "../../firebase";
import { setUser } from "@/store/userSlice";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import KakaoAuthButton from '@/components/auth/KakaoAuthButton';
import Gallery3 from '@/components/template/Gallery3';
import DayOneCalendarTemplate from '@/components/template/DayOneCalendarTemplate';
import DayOneBook from '@/components/template/DayOneBook';
import QuestBook from '@/components/template/QuestBook';



const LoginPage = () => {
  const auth = getAuth(app);
  const {
    register,
    watch,
    setError,
    setValue,
    formState: { errors },
    handleSubmit,
  } = useForm();

  const [errorFromSubmit, setErrorFromSubmit] = useState("");
  const [loading, setLoading] = useState(false);
  const { currentUser } = useSelector((state) => state.user);
  const { push } = useRouter();
  const login = useAuth();
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [googleUsername, setGoogleUsername] = useState("");
  const [tempGoogleUser, setTempGoogleUser] = useState(null);
  const [usernameError, setUsernameError] = useState("");
  const dispatch = useDispatch();

  const onSubmit = async (data) => {
    try {
      setLoading(true)

      // 로컬 지속성으로 변경 (브라우저를 닫아도 로그인 유지)
      await auth.setPersistence(browserLocalPersistence);

      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      
      // Redux store에 사용자 정보 저장
      dispatch(setUser({
        uid: user.uid,
        email: user.email,
        photoURL: user.photoURL
      }));

      // 메인 페이지로 이동
      push("/");
      
      setLoading(false);
    } catch (error) {
      console.error("로그인 실패:", error.code, error.message);
      switch (error.code) {
        case 'auth/user-not-found':
          setErrorFromSubmit("가입하지 않은 이메일입니다.");
          break;
        case 'auth/wrong-password':
          setErrorFromSubmit("비밀번호가 올바르지 않습니다.");
          break;
        case 'auth/invalid-email':
          setErrorFromSubmit("유효하지 않은 이메일 형식입니다.");
          break;
        case 'auth/user-disabled':
          setErrorFromSubmit("비활성화된 계정입니다.");
          break;
        case 'auth/too-many-requests':
          setErrorFromSubmit("너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.");
          break;
        default:
          setErrorFromSubmit("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
      }
      setLoading(false)
      setTimeout(() => {
        setErrorFromSubmit("")
      }, 5000);
    }
  }

  const handleGoogleSign = async () => {
    const provider = new GoogleAuthProvider();
    try {
      // 로컬 지속성으로 변경 (브라우저를 닫아도 로그인 유지)
      await auth.setPersistence(browserLocalPersistence);
      
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
          provider: "google",
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

      push("/");
    } catch (error) {
      console.error("Google login error", error);
      setErrorFromSubmit("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
      setTimeout(() => {
        setErrorFromSubmit("");
      }, 5000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-md bg-white/10 rounded-2xl shadow-lg p-10 flex flex-col items-center">
        <h1 className="text-3xl font-bold text-white mb-4">로그인</h1>
        <p className="text-white/80 mb-8">모두트리에 오신 것을 환영합니다!</p>
        <button
          className="w-full flex items-center justify-center gap-2 py-3 mb-6 rounded-xl bg-white text-black font-semibold shadow hover:bg-gray-100 transition"
          onClick={handleGoogleSign}
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
        <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <input
            className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 placeholder-gray-500 text-black text-sm focus:outline-none focus:border-blue-400 focus:bg-white"
            type="email" 
            name="Email"
            placeholder="이메일"
            {...register("email", { required: true, pattern: /^\S+@\S+$/i })}
          />
          {errors.email && <p className="text-red-400 text-xs">이메일은 필수입니다.</p>}
          <input
            className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 placeholder-gray-500 text-black text-sm focus:outline-none focus:border-blue-400 focus:bg-white"
            name="password"
            type="password"
            placeholder="비밀번호"
            {...register("password", { required: true, minLength: 6 })}
          />
          {errors.password && errors.password.type === "required" && <p className="text-red-400 text-xs">비밀번호는 필수입니다.</p>}
          {errors.password && errors.password.type === "minLength" && <p className="text-red-400 text-xs">비밀번호 6자 이상입니다.</p>}
          {errorFromSubmit && <p className="text-red-400 text-xs">{errorFromSubmit}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition"
          >
            로그인
          </button>
        </form>
        <div className="w-full flex justify-end mt-4">
          <button
            onClick={() => push("/register")}
            className="text-blue-300 hover:underline text-sm"
          >
            회원가입
          </button>
        </div>
      </div>
    </div>
  )
}

export default LoginPage

