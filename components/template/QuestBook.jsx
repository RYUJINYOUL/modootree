'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { db } from '@/firebase'
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  addDoc,
  deleteDoc,
  getDocs,
  doc,
  onSnapshot
} from 'firebase/firestore'
import { useSelector } from 'react-redux'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { IoClose } from "react-icons/io5"




const HeaderDrawer = ({ children, drawerContentClassName, uid, ...props }) => {
  const pathname = usePathname();
  const isEditable = pathname.startsWith('/editor');
  const { currentUser } = useSelector((state) => state.user)
  const finalUid = uid ?? currentUser?.uid;
  const userRole = currentUser?.uid;
  const canDelete = isEditable ? finalUid : userRole === uid;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [entries, setEntries] = useState([])
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [lastVisible, setLastVisible] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const observer = useRef()
  const COMMENTS_LIMIT = 10
  const [isFormOpen, setIsFormOpen] = useState(false);

  // 실시간 최초 데이터
  useEffect(() => {
    if (!finalUid) return;
    const q = query(
      collection(db, 'users', finalUid, 'comments'),
      orderBy('createdAt', 'desc'),
      limit(COMMENTS_LIMIT)
    )

    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const data = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }))
        setEntries(data)
        setLastVisible(snap.docs[snap.docs.length - 1])
        setHasMore(snap.docs.length === COMMENTS_LIMIT)
      } else {
        setEntries([])
        setHasMore(false)
      }
      setIsLoading(false)
    })

    return () => unsub()
  }, [finalUid])

  // 무한 스크롤
  const loadMore = useCallback(async () => {
    if (!finalUid || !lastVisible || !hasMore) return
    const next = query(
      collection(db, 'users', finalUid, 'comments'),
      orderBy('createdAt', 'desc'),
      startAfter(lastVisible),
      limit(COMMENTS_LIMIT)
    )
    const snap = await getDocs(next)
    if (!snap.empty) {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }))
      setEntries((prev) => [...prev, ...data])
      setLastVisible(snap.docs[snap.docs.length - 1])
      setHasMore(snap.docs.length === COMMENTS_LIMIT)
    } else {
      setHasMore(false)
    }
  }, [finalUid, lastVisible, hasMore])

  const lastEntryRef = useCallback((node) => {
    if (isLoading || !hasMore) return
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore()
    })
    if (node) observer.current.observe(node)
  }, [isLoading, hasMore, loadMore])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name || !message) return

    try {
      await addDoc(collection(db, 'users', finalUid, 'comments'), {
        name,
        message,
        createdAt: new Date(),
        uid: currentUser?.uid || null,
        profileImage: currentUser?.photoURL || null,
      })
      setName('')
      setMessage('')
    } catch (error) {
      console.error('방명록 작성 실패:', error)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return
    try {
      await deleteDoc(doc(db, 'users', finalUid, 'comments', id))
    } catch (error) {
      console.error('삭제 실패:', error)
    }
  }

  // 시간 표시 함수 추가
  const getTimeAgo = (date) => {
    const now = new Date();
    const timeStamp = date instanceof Date ? date : date.toDate();
    const diffInSeconds = Math.floor((now - timeStamp) / 1000);
    
    if (diffInSeconds < 60) return '방금 전';
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}일 전`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 5) return `${diffInWeeks}주 전`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths}개월 전`;
    
    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears}년 전`;
  };

  const handleFormToggleOrSubmit = async (e) => {
  e.preventDefault();
  if (!isFormOpen) {
    setIsFormOpen(true); // 처음 클릭: 폼 열기
    return;
  }

  // 폼 제출 처리
  if (!name || !message) return;

  try {
    await addDoc(collection(db, 'users', finalUid, 'comments'), {
      name,
      message,
      createdAt: new Date(),
      uid: currentUser?.uid || null,
      profileImage: currentUser?.photoURL || null,
    });
    setName('');
    setMessage('');
    setIsFormOpen(false); // 제출 후 폼 닫기
  } catch (error) {
    console.error('방명록 작성 실패:', error);
  }
};

  return (
  //   <Drawer direction="bottom">
  // <DrawerTrigger>{children}</DrawerTrigger>
  // <DrawerContent className="w-full h-[80vh] flex flex-col">
  <Drawer {...props}>
      <DrawerTrigger asChild>
        {/* 드로어를 여는 트리거 요소 (버튼, 아이콘 등) */}
        <button className='px-6 py-3.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-center shadow-md transition-all hover:bg-gray-50 hover:border-gray-300 hover:scale-105 active:scale-95 select-none'>
          방명록 목록 열기 · 쓰기
        </button>
      </DrawerTrigger>
      <DrawerContent className={drawerContentClassName}> {/* className을 DrawerContent에 전달 */}
        {/* {children} */}
    <div className="flex-1 overflow-y-auto space-y-5 p-6">
      {entries.map((entry, idx) => (
        <div
          key={entry.id}
          ref={idx === entries.length - 1 ? lastEntryRef : null}
          className="bg-white rounded-2xl p-6 border border-blue-100/50 shadow-md hover:shadow-lg transition-all duration-300"
        >
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-gray-800 text-lg tracking-tight">{entry.name}</span>
            <span className="text-sm text-gray-500 font-medium bg-gray-50 px-3 py-1.5 rounded-full">
              {getTimeAgo(entry.createdAt)}
            </span>
          </div>
          <p className="text-gray-700 text-base leading-relaxed">{entry.message}</p>
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold shadow-lg transition-all hover:from-red-600 hover:to-red-700 hover:scale-105 active:scale-95"
              onClick={() => handleDelete(entry.id)}
            >
              삭제
            </Button>
          )}
        </div>
      ))}
      {!hasMore && entries.length > 0 && (
        <p className="text-center text-gray-500 font-medium py-6">더 이상 방명록이 없습니다</p>
      )}
    </div>

    {/* 작성 폼 (하단 고정) */}
   <div className="rounded-3xl p-6 mt-4 shadow-lg border border-blue-100/50 bg-gradient-to-br from-white to-blue-50/50 backdrop-blur-sm">
      <form className="space-y-4" onSubmit={handleFormToggleOrSubmit}>
      

        {isFormOpen && (
          <>
           <button
        type="button"
        onClick={() => setIsFormOpen(false)}
        className="absolute top-6 right-6 text-gray-500 hover:text-gray-700 transition-colors"
        aria-label="닫기"
      >
        <IoClose className="w-6 h-6" />
      </button>
            <input
              type="text"
              placeholder="이름을 입력해주세요"
              className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <textarea
              rows={3}
              placeholder="메시지를 입력해주세요"
              className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all resize-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </>
        )}
        <button
          type="submit"
          className="w-full p-3.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold shadow-lg transition-all hover:from-blue-600 hover:to-indigo-600 hover:scale-[1.02] active:scale-98"
        >
          {isFormOpen ? '방명록 남기기' : '방명록 쓰기'}
        </button>
      </form>
    </div>
  </DrawerContent>
</Drawer>

  )
}




export default function GuestbookTemplate({ username, uid }) {
  const [previewEntries, setPreviewEntries] = useState([])
  const { currentUser } = useSelector((state) => state.user)
  const finalUid = uid ?? currentUser?.uid

  // 시간 표시 함수
  const getTimeAgo = (date) => {
    const now = new Date();
    const timeStamp = date instanceof Date ? date : date.toDate();
    const diffInSeconds = Math.floor((now - timeStamp) / 1000);
    
    if (diffInSeconds < 60) return '방금 전';
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}일 전`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 5) return `${diffInWeeks}주 전`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths}개월 전`;
    
    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears}년 전`;
  };

  // 최초 데이터 로드
  useEffect(() => {
    if (!finalUid) return
    const q = query(
      collection(db, 'users', finalUid, 'comments'),
      orderBy('createdAt', 'desc'),
      limit(3)
    )
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }))
      setPreviewEntries(data)
    })
    return () => unsub()
  }, [finalUid])

  return (
    <div className='p-2 pt-9 md:flex md:flex-col md:items-center md:justify-center md:w-full'>
      <div className="text-center text-[21px] font-bold md:w-[320px] w-full bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 shadow-lg border border-blue-100/50 backdrop-blur-sm tracking-tight text-gray-800">게스트북</div>
      <div className='h-[20px]'/>
      <div className="space-y-5 bg-gradient-to-br from-white to-blue-50/30 p-8 rounded-3xl border border-blue-100/50 w-full max-w-[1100px] shadow-lg backdrop-blur-sm">
        {previewEntries.map((entry, i) => (
          <div key={entry.id} className="bg-white/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-gray-800 text-lg tracking-tight">{entry.name}</span>
              <span className="text-sm text-gray-500 font-medium bg-gray-50 px-3 py-1.5 rounded-full">
                {getTimeAgo(entry.createdAt)}
              </span>
            </div>
            <p className="text-gray-700 leading-relaxed">{entry.message}</p>
            {i !== previewEntries.length - 1 && <div className='mt-4' />}
          </div>
        ))}
      </div>
      <div className="pt-4 w-full flex justify-center">
        <HeaderDrawer uid={finalUid} drawerContentClassName="md:w-[1100px] pt-6 p-2">
          {/* Drawer 트리거 버튼 스타일 수정은 HeaderDrawer 컴포넌트에서 진행 */}
        </HeaderDrawer>
      </div>
    </div>
  )
}
