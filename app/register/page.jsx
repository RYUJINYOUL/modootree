"use client";
import React, { useState,useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import app, { db } from "../../firebase";
import {
  getFirestore,
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
    const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
    const [tempGoogleUser, setTempGoogleUser] = useState(null);
    const [googleUsername, setGoogleUsername] = useState("");
    const [checking, setChecking] = useState(false);
    const [isAvailable, setIsAvailable] = useState(null);
    // const login = useAuth();

    const {
        register,
        watch,
        setError,
        setValue,
        formState: { errors },
        handleSubmit,
    } = useForm();

    const username = watch("username");


    // 실시간 username 중복 체크
    useEffect(() => {
        if (!username) {
        setIsAvailable(null);
        return;
        }

        const delay = setTimeout(async () => {
        setChecking(true);
        const docRef = doc(db, "usernames", username);
        const docSnap = await getDoc(docRef);
        setIsAvailable(!docSnap.exists());
        setChecking(false);
        }, 500);

        return () => clearTimeout(delay);
    }, [username]);

  
    const onSubmit = async (data) => {
        try {
        const usernameDoc = doc(db, "usernames", data.name);
        const usernameSnap = await getDoc(usernameDoc);

        if (usernameSnap.exists()) {
            setError("name", { message: "이미 사용 중인 이름입니다." });
            setValue("name", ""); // 입력값 비우기
            return;
        }

        const userCredential = await createUserWithEmailAndPassword(
            auth,
            data.email,
            data.password
        );
        const user = userCredential.user;

        // 사용자 Firestore 저장
        await setDoc(doc(db, "users", user.uid), {
            email: data.email,
            username: data.name,
            createdAt: serverTimestamp(),
        });

        dispatch(
            setUser({
                uid: user.uid,
                displayName: user.displayName,
                photoURL: user.photoURL,
            })
            );
        

        // usernames 컬렉션 등록
        await setDoc(usernameDoc, {
            uid: user.uid,
        });


         // usernames 컬렉션 등록
        await setDoc(doc(db, "users", user.uid, "links", "page"), {
            components: ["이미지", "링크카드", "달력", "게스트북"],
        });

        // Firebase 사용자 프로필 업데이트
        await updateProfile(user, {
            displayName: data.username,
        });

        push("/"); // 가입 완료 후 이동

        } catch (error) {
        console.error("가입 실패:", error.message);
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

        if (userSnap.exists()) {
            // 이미 Firestore에 등록된 사용자
            dispatch(
            setUser({
                uid: user.uid,
                displayName: user.displayName,
                photoURL: user.photoURL,
            })
            );
            push("/");
        } else {
            // 신규 사용자 → username 입력받기
            setTempGoogleUser(user);
            setShowUsernamePrompt(true);
        }
        } catch (err) {
        console.error(err);
        setErrorFromSubmit("구글 로그인 중 오류 발생");
        }
    };


    


    const handleGoogleUsernameSubmit = async () => {
        if (!googleUsername || !tempGoogleUser) return;

        const usernameDoc = doc(db, "usernames", googleUsername);
        const usernameSnap = await getDoc(usernameDoc);

        if (usernameSnap.exists()) {
            setError("Username", { message: "이미 사용 중인 이름입니다." });
            setValue("Username", ""); // 입력값 비우기
            return;
        }
        
        await updateProfile(tempGoogleUser, {
        displayName: googleUsername,
        });

        await setDoc(doc(db, "users", tempGoogleUser.uid), {
        email: tempGoogleUser.email,
        username: googleUsername,
        photoURL: tempGoogleUser.photoURL || null,
        createdAt: serverTimestamp(),
        });

        await setDoc(usernameDoc, {
        uid: tempGoogleUser.uid,
      });

        dispatch(
        setUser({
            uid: tempGoogleUser.uid,
            displayName: googleUsername,
            photoURL: tempGoogleUser.photoURL,
        })
        );

        push("/");
    };
  

    return (
      <div className="min-h-screen bg-gray-100 text-gray-900 flex justify-center">
        <div className="max-w-screen-xl m-0 sm:m-10 bg-white shadow sm:rounded-lg flex justify-center flex-1">
            <div className="lg:w-1/2 xl:w-5/12 p-6 sm:p-12">
              
                <div className="mt-12 flex flex-col items-center">
                    <h1 className="text-2xl xl:text-3xl font-extrabold">
                        회원가입
                    </h1>
                    <div className="w-full flex-1 mt-8">
                    <div className="flex flex-col items-center">
                            <button
                                className="w-full max-w-xs font-bold shadow-sm rounded-lg py-3 bg-indigo-100 text-gray-800 flex items-center justify-center transition-all duration-300 ease-in-out focus:outline-none hover:shadow focus:shadow-sm focus:shadow-outline"
                                onClick={handleGoogleSign}
                                >
                                
                                <div className="bg-white p-2 rounded-full">
                                    <svg className="w-4" viewBox="0 0 533.5 544.3">
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
                                </div>
                                <span className="ml-4">
                                    Sign Up with Google
                                </span>
                            </button>
                        </div>

                        {/* username 입력 모달 */}
                            {showUsernamePrompt && (
                                <div className="mt-6 border p-4 bg-gray-50 rounded shadow">
                                <p className="mb-2 font-medium">사용할 사용자 이름을 입력하세요</p>
                                <input
                                    type="text"
                                    name="Username"
                                    value={googleUsername}
                                    onChange={(e) => setGoogleUsername(e.target.value)}
                                    placeholder="이름은 도메인주소입니다"
                                    className="w-full px-4 py-2 border rounded mb-2"
                                />{errors.Username?.message && (
                                    <p className="text-red-500 text-sm mt-1">{errors.Username.message}</p>
                                    )}

                                <button
                                    onClick={handleGoogleUsernameSubmit}
                                    className="w-full bg-indigo-500 text-white py-2 rounded hover:bg-indigo-600"
                                >
                                    확인
                                </button>
                                </div>
                            )}



                        <div className='mt-5'/>
                        <form className="mx-auto max-w-xs" onSubmit={handleSubmit(onSubmit)}>
                            <input
                                className="w-full px-8 py-4 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-gray-400 focus:bg-white"
                                type="email" 
                                name="Email"
                                placeholder="Email"
                                {...register("email", { required: true, pattern: /^\S+@\S+$/i })}
                                />
                                 {errors.email && <p>이메일 설정은 필수입니다.</p>}
                                 <div className='mt-5'/>
                            <input
                                className="w-full px-8 py-4 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-gray-400 focus:bg-white"
                                name='name'
                                type='text'
                                placeholder="이름은 도메인주소입니다"
                                {...register("name", { required: true, maxLength: 10 })}
                                />
                                {errors.name?.message && (
                                    <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                                    )}
                                {errors.name && errors.name.type === "required" && <p>이름 설정은 필수입니다.</p>}
                                {errors.name && errors.name.type === "maxLength" && <p>최대글자 수는 10자입니다.</p>}     
                            <input
                                className="w-full px-8 py-4 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-gray-400 focus:bg-white mt-5"
                                name="password"
                                type="password"
                                placeholder="password"
                                {...register("password", { required: true, minLength: 6 })}
                                />
                                {errors.password && errors.password.type === "required" && <p>비밀번호 설정은 필수입니다.</p>}
                                {errors.password && errors.password.type === "minLength" && <p>비밀번호설정은 특수문자와 최소6자 이상입니다.</p>}
    
                                {errorFromSubmit &&
                                    <p>{errorFromSubmit}</p>
                                }
                                <div className='mt-5'/>
                            <input
                                className="w-full px-8 py-4 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-gray-400 focus:bg-white"
                                name='passwordConfirm'
                                type='password'
                                placeholder="passwordConfirm"
                                {...register("passwordConfirm", { required: '비밀번호 확인은 필수입니다.', 
                                validate: (value) => 
                                    value === watch('password') || '비밀번호가 일치하지 않습니다'
                                })}
                            
                                    />
                                    {errors.passwordConfirm && (
                                <p className="text-red-500 mt-1">{errors.passwordConfirm.message}</p>
                                )}
    
                         <button
                            type="submit"
                            disabled={loading}
                            className="mt-5 tracking-wide font-semibold bg-indigo-500 text-gray-100 w-full py-4 rounded-lg hover:bg-indigo-700 transition-all duration-300 ease-in-out flex items-center justify-center focus:shadow-outline focus:outline-none">
                            <svg className="w-6 h-6 -ml-2" fill="none" stroke="currentColor" strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                <circle cx="8.5" cy="7" r="4" />
                                <path d="M20 8v6M23 11h-6" />
                            </svg>
                            <span className="ml-3">
                                회원가입
                            </span>
                        </button>
                        
                        
                        <div className='mt-2' />
                        <div className="my-6 border-b text-center">
                            <div
                                className="leading-none px-2 inline-block text-sm text-gray-600 tracking-wide font-medium bg-white transform translate-y-1/2">
                                로그인
                            </div>
                        </div>
                        
                        <button
                            onClick={() => {
                                push("/login");
                            }}
                            className="mt-5 tracking-wide font-semibold bg-indigo-500 text-gray-100 w-full py-4 rounded-lg hover:bg-indigo-700 transition-all duration-300 ease-in-out flex items-center justify-center focus:shadow-outline focus:outline-none">
                            <svg className="w-6 h-6 -ml-2" fill="none" stroke="currentColor" strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                <circle cx="8.5" cy="7" r="4" />
                                <path d="M20 8v6M23 11h-6" />
                            </svg>
                            <span className="ml-3">
                                로그인
                            </span>
                        </button>
                           
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
  )
}

export default RegisterPage
