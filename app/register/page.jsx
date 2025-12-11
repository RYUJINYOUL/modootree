"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import {
  getAuth,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import app, { db } from "../../firebase";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { setUser } from "@/store/userSlice";

const RegisterPage = () => {
    const auth = getAuth(app);
    const { push } = useRouter();
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [errorFromSubmit, setErrorFromSubmit] = useState("");

    const {
        register,
        formState: { errors },
        handleSubmit,
    } = useForm();

    const onSubmit = async (data) => {
        try {
            setLoading(true);
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                data.email,
                data.password
            );
            const user = userCredential.user;

            // 사용자 기본 정보만 Firestore 저장
            await setDoc(doc(db, "users", user.uid), {
                email: data.email,
                createdAt: serverTimestamp(),
            });

            // 빈 컴포넌트로 시작
            await setDoc(doc(db, "users", user.uid, "links", "page"), {
                components: [], // 빈 배열로 시작
                type: null // 타입도 초기에는 null
            });

            // 이메일 회원가입
            await setDoc(doc(db, "users", user.uid, "settings", "background"), {
                type: 'image',
                value: 'https://firebasestorage.googleapis.com/v0/b/mtree-e0249.firebasestorage.app/o/backgrounds%2F1755605333707_strawberries-7249448_1920.jpg?alt=media&token=c7331dd0-48ff-430a-86bb-039ba16fe23f',
                animation: true
            });

            dispatch(
                setUser({
                    uid: user.uid,
                    email: user.email,
                    photoURL: null,
                })
            );

            push("/");
        } catch (error) {
            console.error("가입 실패:", error.message);
            switch (error.code) {
                case 'auth/email-already-in-use':
                    setErrorFromSubmit("이미 사용 중인 이메일입니다. 다른 이메일을 사용하시거나 로그인해주세요.");
                    break;
                case 'auth/invalid-email':
                    setErrorFromSubmit("유효하지 않은 이메일 형식입니다.");
                    break;
                case 'auth/operation-not-allowed':
                    setErrorFromSubmit("이메일/비밀번호 회원가입이 비활성화되어 있습니다.");
                    break;
                case 'auth/weak-password':
                    setErrorFromSubmit("비밀번호가 너무 약합니다. 더 강력한 비밀번호를 사용해주세요.");
                    break;
                default:
                    setErrorFromSubmit("회원가입 중 오류가 발생했습니다. 다시 시도해주세요.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSign = async () => {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            // 구글 로그인의 배경 설정도 동일한 URL로 수정
            if (!userSnap.exists()) {
                // 신규 사용자 기본 정보만 저장
                await setDoc(userRef, {
                    email: user.email,
                    photoURL: user.photoURL,
                    createdAt: serverTimestamp(),
                });

                // 빈 컴포넌트로 시작
                await setDoc(doc(db, "users", user.uid, "links", "page"), {
                    components: [], // 빈 배열로 시작
                    type: null // 타입도 초기에는 null
                });

                // 기본 배경 설정
                await setDoc(doc(db, "users", user.uid, "settings", "background"), {
                    type: 'image',
                    value: 'https://firebasestorage.googleapis.com/v0/b/mtree-e0249.firebasestorage.app/o/backgrounds%2F1755605333707_strawberries-7249448_1920.jpg?alt=media&token=c7331dd0-48ff-430a-86bb-039ba16fe23f',
                    animation: true
                });
            }

            dispatch(
                setUser({
                    uid: user.uid,
                    email: user.email,
                    photoURL: user.photoURL,
                })
            );

            push("/");
        } catch (error) {
            console.error("구글 로그인 실패:", error);
            switch (error.code) {
                case 'auth/popup-closed-by-user':
                    setErrorFromSubmit("로그인 창이 닫혔습니다. 다시 시도해주세요.");
                    break;
                case 'auth/popup-blocked':
                    setErrorFromSubmit("팝업이 차단되었습니다. 팝업 차단을 해제해주세요.");
                    break;
                case 'auth/cancelled-popup-request':
                    setErrorFromSubmit("진행 중인 로그인이 취소되었습니다.");
                    break;
                default:
                    setErrorFromSubmit("구글 로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
            }
        }
    };

    const handleKakaoRegister = () => {
        const KAKAO_CLIENT_ID = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID;
        const REDIRECT_URI = process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI;
        
        if (!KAKAO_CLIENT_ID || !REDIRECT_URI) {
            console.error('카카오 로그인 설정이 없습니다.');
            alert('카카오 로그인 설정에 문제가 있습니다.');
            return;
        }
        
        const kakaoURL = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code`;
        window.location.href = kakaoURL;
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black">
            <div className="w-full max-w-md bg-white/10 rounded-2xl shadow-lg p-10 flex flex-col items-center">
                <h1 className="text-3xl font-bold text-white mb-4">회원가입</h1>
                <p className="text-white/80 mb-8">모두트리에 오신 것을 환영합니다!</p>
                <button
                    className="w-full flex items-center justify-center gap-2 py-3 mb-6 rounded-xl bg-white text-black font-semibold shadow hover:bg-gray-100 transition"
                    onClick={handleGoogleSign}
                >
                    <svg className="w-5 h-5" viewBox="0 0 533.5 544.3">
                        <path d="M533.5 278.4c0-18.5-1.5-37.1-4.7-55.3H272.1v104.8h147c-6.1 33.8-25.7 63.7-54.4 82.7v68h87.7c51.5-47.4 81.1-117.4 81.1-200.2z" fill="#4285f4"/>
                        <path d="M272.1 544.3c73.4 0 135.3-24.1 180.4-65.7l-87.7-68c-24.4 16.6-55.9 26-92.6 26-71 0-131.2-47.9-152.8-112.3H28.9v70.1c46.2 91.9 140.3 149.9 243.2 149.9z" fill="#34a853"/>
                        <path d="M119.3 324.3c-11.4-33.8-11.4-70.4 0-104.2V150H28.9c-38.6 76.9-38.6 167.5 0 244.4l90.4-70.1z" fill="#fbbc04"/>
                        <path d="M272.1 107.7c38.8-.6 76.3 14 104.4 40.8l77.7-77.7C405 24.6 339.7-.8 272.1 0 169.2 0 75.1 58 28.9 150l90.4 70.1c21.5-64.5 81.8-112.4 152.8-112.4z" fill="#ea4335"/>
                    </svg>
                    <span>Google로 회원가입</span>
                </button>
                <button
                    className="w-full flex items-center justify-center gap-2 py-3 mb-6 rounded-xl bg-[#FEE500] text-black font-semibold shadow hover:bg-[#FEE500]/90 transition"
                    onClick={handleKakaoRegister}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2.25C6.47715 2.25 2 5.82076 2 10.1991C2 12.9035 3.74275 15.2919 6.45036 16.7105L5.00377 21.2153C4.92516 21.4689 5.16707 21.6831 5.39576 21.5435L10.8222 18.1352C11.2057 18.1809 11.5989 18.2045 12 18.2045C17.5229 18.2045 22 14.6338 22 10.2554C22 5.87702 17.5229 2.25 12 2.25Z" fill="black"/>
                    </svg>
                    <span>카카오로 회원가입</span>
                </button>
                {/* <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
                    <input
                        className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 placeholder-gray-500 text-black text-sm focus:outline-none focus:border-blue-400 focus:bg-white"
                        type="email"
                        placeholder="이메일"
                        {...register("email", { required: true, pattern: /^\S+@\S+$/i })}
                    />
                    {errors.email && <p className="text-red-400 text-xs">이메일은 필수입니다.</p>}
                    <input
                        className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 placeholder-gray-500 text-black text-sm focus:outline-none focus:border-blue-400 focus:bg-white"
                        type="password"
                        placeholder="비밀번호"
                        {...register("password", { required: true, minLength: 6 })}
                    />
                    {errors.password && errors.password.type === "required" && (
                        <p className="text-red-400 text-xs">비밀번호는 필수입니다.</p>
                    )}
                    {errors.password && errors.password.type === "minLength" && (
                        <p className="text-red-400 text-xs">비밀번호는 6자 이상이어야 합니다.</p>
                    )}
                    {errorFromSubmit && <p className="text-red-400 text-xs">{errorFromSubmit}</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition"
                    >
                        회원가입
                    </button>
                </form> */}
            </div>
        </div>
    );
};

export default RegisterPage;
