"use client"
import React, { useState } from 'react'
import { useForm } from 'react-hook-form';
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from 'react-redux';
import useAuth from '@/hooks/useAuth'
import app from '../../firebase';


const LoginPage = () => {
    const auth = getAuth(app);

    const { register, handleSubmit, formState: { errors } } = useForm();
    const [errorFromSubmit, setErrorFromSubmit] = useState("")
    const [loading, setLoading] = useState(false);
    const { currentUser } = useSelector(state => state.user)
    const { push } = useRouter();
    const login = useAuth();

    const onSubmit = async (data) => {
        try {
            setLoading(true)

            await signInWithEmailAndPassword(auth, data.email, data.password);

            setLoading(false)
        } catch (error) {
            setErrorFromSubmit(error.message)
            setLoading(false)
            setTimeout(() => {
                setErrorFromSubmit("")
            }, 5000);
        }
    }

    const handleGoogleSign = async () => {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider).then((data) => {
          console.log(data);
        }).catch((err) => console.log(err));
      }

    return (
        <div className="min-h-screen bg-gray-100 text-gray-900 flex justify-center">
        <div className="max-w-screen-xl m-0 sm:m-10 bg-white shadow sm:rounded-lg flex justify-center flex-1">
            <div className="lg:w-1/2 xl:w-5/12 p-6 sm:p-12">
              
                <div className="mt-12 flex flex-col items-center">
                    <h1 className="text-2xl xl:text-3xl font-extrabold">
                        로그인
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
    
                        <div className="mx-auto my-6 border-b text-center">
                            <div
                                className="leading-none inline-block text-sm text-gray-600 tracking-wide font-medium bg-white transform translate-y-1/2">
                                이메일로 로그인
                            </div>
                        </div>
    
                        <form className="mx-auto max-w-xs" onSubmit={handleSubmit(onSubmit)}>
                            <input
                                className="w-full px-8 py-4 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-gray-400 focus:bg-white"
                                type="email" 
                                name="Email"
                                placeholder="Email"
                                {...register("email", { required: true, pattern: /^\S+@\S+$/i })}
                                />
                                 {errors.email && <p>This email field is required</p>}
                            <input
                                className="w-full px-8 py-4 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-gray-400 focus:bg-white mt-5"
                                name="password"
                                type="password"
                                placeholder="password"
                                {...register("password", { required: true, minLength: 6 })}
                                />
                                {errors.password && errors.password.type === "required" && <p>This password field is required</p>}
                                {errors.password && errors.password.type === "minLength" && <p>Password must have at least 6 characters</p>}
    
                                {errorFromSubmit &&
                                    <p>{errorFromSubmit}</p>
                                }
                       
    
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
                                로그인
                            </span>
                        </button>

                        
                        <div className='mt-2' />
                        <div className="my-6 border-b text-center">
                            <div
                                className="leading-none px-2 inline-block text-sm text-gray-600 tracking-wide font-medium bg-white transform translate-y-1/2">
                                회원가입
                            </div>
                        </div>
                        
                        <button
                            onClick={() => {
                                push("/register");
                            }}
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
                           
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
    )
}

export default LoginPage
