"use client"
import { useState, useEffect } from "react";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, setPersistence, browserSessionPersistence, browserLocalPersistence } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { clearUser, setUser } from "../store/userSlice";

export default function useAuth() {
    const auth = getAuth();
    const [user, setUserss] = useState('');
    const [loading, setLoading] = useState(false);
    const { push } = useRouter();
    const dispatch = useDispatch();
    
    // 세션 지속 시간 설정 함수
    const setSessionPersistence = async (persistenceType = 'local') => {
        try {
            // 'local': 브라우저를 닫아도 로그인 유지 (기본값)
            // 'session': 브라우저 탭을 닫으면 로그아웃
            const persistence = persistenceType === 'session' ? browserSessionPersistence : browserLocalPersistence;
            await setPersistence(auth, persistence);
        } catch (error) {
            console.error('세션 지속 시간 설정 오류:', error);
            throw error;
        }
    };
    
    useEffect(() => {
        setLoading(true)
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if(user) {
            setUserss(user)
            push("/");
            setLoading(false);
            dispatch(setUser({
              uid: user.uid,
              displayName: user.displayName,
              photoURL: user.photoURL
            }))
          } else {
            push("/login");
            setLoading(false)
            dispatch(clearUser());
          }
        })
    
        return () => {
          unsubscribe();
        }
      }, [])

      return {user, loading, setSessionPersistence}
    }
