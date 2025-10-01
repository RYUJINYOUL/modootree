"use client"
import { useState, useEffect } from "react";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, setPersistence, browserSessionPersistence, browserLocalPersistence } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { clearUser, setUser } from "../store/userSlice";

export default function useAuth() {
    const auth = getAuth();
    const [user, setUserss] = useState(null);
    const [loading, setLoading] = useState(true);  // 초기값을 true로 설정
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
            setLoading(false);
            dispatch(setUser({
              uid: user.uid,
              displayName: user.displayName,
              photoURL: user.photoURL
            }))
          } else {
            // 로그인 페이지나 공개 페이지가 아닐 경우에만 로그인 페이지로 이동
            const publicPages = ['/login', '/register', '/', '/site'];
            const isPublicPage = publicPages.some(page => window.location.pathname.startsWith(page));
            if (!isPublicPage) {
              push("/login");
            }
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
