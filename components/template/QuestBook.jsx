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
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore'
import { useSelector } from 'react-redux'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { IoClose } from "react-icons/io5"
import { FaHeart, FaRegHeart, FaReply } from "react-icons/fa"
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'

// getTimeAgo 함수를 컴포넌트 외부로 이동
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

const HeaderDrawer = ({ children, drawerContentClassName, uid, ...props }) => {
  const pathname = usePathname();
  const isEditable = pathname.startsWith('/editor');
  const { currentUser } = useSelector((state) => state.user)
  const finalUid = uid ?? currentUser?.uid;
  const userRole = currentUser?.uid;
  const canDelete = isEditable ? finalUid : userRole === uid;
  const { toast } = useToast();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [entries, setEntries] = useState([])
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [replyTo, setReplyTo] = useState(null)
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
          ...doc.data(),
          likes: doc.data().likes || 0,
          likedBy: doc.data().likedBy || [],
          replies: doc.data().replies || []
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
        ...doc.data(),
        likes: doc.data().likes || 0,
        likedBy: doc.data().likedBy || [],
        replies: doc.data().replies || []
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

  const showToast = (title, description, duration = 2000) => {
    toast({
      title,
      description,
      duration,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name || !message) {
      showToast("입력 오류", "이름과 메시지를 모두 입력해주세요.");
      return
    }

    try {
      if (replyTo) {
        // 답글 추가
        const commentRef = doc(db, 'users', finalUid, 'comments', replyTo.commentId)
        await updateDoc(commentRef, {
          replies: arrayUnion({
            name,
            message,
            createdAt: new Date(),
            uid: currentUser?.uid || null,
            profileImage: currentUser?.photoURL || null,
            likes: 0,
            likedBy: []
          })
        })
        setReplyTo(null)
      } else {
        // 새 댓글 추가
        await addDoc(collection(db, 'users', finalUid, 'comments'), {
          name,
          message,
          createdAt: new Date(),
          uid: currentUser?.uid || null,
          profileImage: currentUser?.photoURL || null,
          likes: 0,
          likedBy: [],
          replies: []
        })
      }
      setName('')
      setMessage('')
      setIsFormOpen(false)
      showToast("성공", replyTo ? "답글이 등록되었습니다." : "방명록이 등록되었습니다.");
    } catch (error) {
      console.error('방명록 작성 실패:', error)
      showToast("오류", "작성에 실패했습니다. 다시 시도해주세요.");
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return
    try {
      await deleteDoc(doc(db, 'users', finalUid, 'comments', id))
      showToast("삭제 완료", "방명록이 삭제되었습니다.");
    } catch (error) {
      console.error('삭제 실패:', error)
      showToast("오류", "삭제에 실패했습니다.");
    }
  }

  const handleLike = async (commentId, isReply = false, replyIndex = -1) => {
    try {
      const commentRef = doc(db, 'users', finalUid, 'comments', commentId)
      const userId = currentUser?.uid || `anonymous_${Math.random().toString(36).substr(2, 9)}`
      
      if (isReply) {
        // 답글 좋아요 처리
        const comment = entries.find(e => e.id === commentId)
        const reply = comment.replies[replyIndex]
        const hasLiked = reply.likedBy?.includes(userId)
        
        const updatedReplies = [...comment.replies]
        updatedReplies[replyIndex] = {
          ...reply,
          likes: (reply.likes || 0) + (hasLiked ? -1 : 1),
          likedBy: hasLiked 
            ? (reply.likedBy || []).filter(id => id !== userId)
            : [...(reply.likedBy || []), userId]
        }
        
        await updateDoc(commentRef, { replies: updatedReplies })
      } else {
        // 댓글 좋아요 처리
        const comment = entries.find(e => e.id === commentId)
        const hasLiked = comment.likedBy?.includes(userId)
        
        await updateDoc(commentRef, {
          likes: increment(hasLiked ? -1 : 1),
          likedBy: hasLiked 
            ? arrayRemove(userId)
            : arrayUnion(userId)
        })
      }
      
      showToast("좋아요", "반영되었습니다.", 1000);
    } catch (error) {
      console.error('좋아요 처리 실패:', error)
      showToast("오류", "좋아요 처리에 실패했습니다.");
    }
  }

  return (
    <Drawer {...props}>
      <DrawerTrigger asChild>
        <button className='px-6 py-3.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-center shadow-md transition-all hover:bg-gray-50 hover:border-gray-300 hover:scale-105 active:scale-95 select-none'>
          방명록 목록 열기 · 쓰기
        </button>
      </DrawerTrigger>
      <DrawerContent className={`w-full h-[85vh] flex flex-col bg-gray-50 ${drawerContentClassName}`}>
        <DrawerHeader>
          <DrawerTitle>게스트북</DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto p-4">
          {/* 방명록 작성 폼 */}
          <form onSubmit={handleSubmit} className="mb-6 bg-white p-4 rounded-xl shadow-sm">
            <div className="flex flex-col space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름"
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={replyTo ? `${replyTo.name}님에게 답글 쓰기` : "방명록 메시지를 입력하세요"}
                className="px-4 py-2 border border-gray-200 rounded-lg h-24 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
              />
              <div className="flex justify-between items-center">
                {replyTo && (
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    답글 취소
                  </button>
                )}
                <Button type="submit" className="ml-auto">
                  {replyTo ? '답글 작성' : '방명록 작성'}
                </Button>
              </div>
            </div>
          </form>

          {/* 방명록 목록 */}
          <div className="space-y-4">
            {entries.map((entry, index) => (
              <div
                key={entry.id}
                ref={index === entries.length - 1 ? lastEntryRef : null}
                className="bg-white p-4 rounded-xl shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {entry.profileImage ? (
                      <img src={entry.profileImage} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 rounded-full" />
                    )}
                    <span className="font-semibold">{entry.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{getTimeAgo(entry.createdAt)}</span>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <IoClose size={20} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-gray-700 whitespace-pre-wrap">{entry.message}</p>
                <div className="mt-3 flex items-center space-x-4">
                  <button
                    onClick={() => handleLike(entry.id)}
                    className="flex items-center space-x-1 text-gray-500 hover:text-red-500"
                  >
                    {entry.likedBy?.includes(currentUser?.uid || 'anonymous') ? (
                      <FaHeart className="text-red-500" />
                    ) : (
                      <FaRegHeart />
                    )}
                    <span>{entry.likes || 0}</span>
                  </button>
                  <button
                    onClick={() => setReplyTo({ commentId: entry.id, name: entry.name })}
                    className="flex items-center space-x-1 text-gray-500 hover:text-blue-500"
                  >
                    <FaReply />
                    <span>답글</span>
                  </button>
                </div>

                {/* 답글 목록 */}
                {entry.replies && entry.replies.length > 0 && (
                  <div className="mt-4 ml-8 space-y-3">
                    {entry.replies.map((reply, replyIndex) => (
                      <div key={replyIndex} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            {reply.profileImage ? (
                              <img src={reply.profileImage} alt="" className="w-6 h-6 rounded-full" />
                            ) : (
                              <div className="w-6 h-6 bg-gray-200 rounded-full" />
                            )}
                            <span className="font-semibold text-sm">{reply.name}</span>
                          </div>
                          <span className="text-xs text-gray-500">{getTimeAgo(reply.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-sm text-gray-700">{reply.message}</p>
                        <div className="mt-2">
                          <button
                            onClick={() => handleLike(entry.id, true, replyIndex)}
                            className="flex items-center space-x-1 text-sm text-gray-500 hover:text-red-500"
                          >
                            {reply.likedBy?.includes(currentUser?.uid || 'anonymous') ? (
                              <FaHeart className="text-red-500" size={12} />
                            ) : (
                              <FaRegHeart size={12} />
                            )}
                            <span>{reply.likes || 0}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {isLoading && <div className="text-center py-4">로딩 중...</div>}
          {!isLoading && !hasMore && entries.length > 0 && (
            <div className="text-center py-4 text-gray-500">더 이상 방명록이 없습니다</div>
          )}
          {!isLoading && entries.length === 0 && (
            <div className="text-center py-4 text-gray-500">아직 방명록이 없습니다</div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export default function GuestbookTemplate({ username, uid }) {
  const [previewEntries, setPreviewEntries] = useState([])
  const { currentUser } = useSelector((state) => state.user)
  const finalUid = uid ?? currentUser?.uid
  const { toast } = useToast();

  const showToast = (title, description, duration = 2000) => {
    toast({
      title,
      description,
      duration,
    });
  };

  const handleMainLike = async (commentId) => {
    try {
      const commentRef = doc(db, 'users', finalUid, 'comments', commentId)
      const userId = currentUser?.uid || `anonymous_${Math.random().toString(36).substr(2, 9)}`
      
      // 현재 좋아요 상태 확인
      const entry = previewEntries.find(e => e.id === commentId)
      const hasLiked = entry.likedBy?.includes(userId)
      
      await updateDoc(commentRef, {
        likes: increment(hasLiked ? -1 : 1),
        likedBy: hasLiked 
          ? arrayRemove(userId)
          : arrayUnion(userId)
      })
      
      showToast("좋아요", "반영되었습니다.", 1000);
    } catch (error) {
      console.error('좋아요 처리 실패:', error)
      showToast("오류", "좋아요 처리에 실패했습니다.");
    }
  };

  // 최근 방명록 3개 로드
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
        ...doc.data(),
        likes: doc.data().likes || 0,
        likedBy: doc.data().likedBy || [],
        replies: doc.data().replies || []
      }))
      setPreviewEntries(data)
    })
    return () => unsub()
  }, [finalUid])

  return (
    <div className='p-2 pt-9 md:flex md:flex-col md:items-center md:justify-center md:w-full'>
      <div className="relative flex items-center justify-center text-[21px] font-bold md:w-[320px] w-full bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 shadow-lg border border-blue-100/50 backdrop-blur-sm tracking-tight text-gray-800">
        <button className="absolute left-4 bg-white p-2 rounded-lg shadow-sm hover:text-blue-600 hover:shadow-md transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </button>
        게스트북
        <button className="absolute right-4 bg-white p-2 rounded-lg shadow-sm hover:text-blue-600 hover:shadow-md transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
      <div className='h-[20px]'/>
      <div className="w-full flex flex-col items-center gap-6">
        {previewEntries.map((entry) => (
          <div key={entry.id} className="w-full max-w-[1100px] bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-blue-100/50">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                {entry.profileImage ? (
                  <img src={entry.profileImage} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 bg-gray-200 rounded-full" />
                )}
                <span className="font-bold text-gray-800 text-lg tracking-tight">{entry.name}</span>
              </div>
              <span className="text-sm text-gray-500 font-medium bg-gray-50 px-3 py-1.5 rounded-full">
                {getTimeAgo(entry.createdAt)}
              </span>
            </div>
            <p className="text-gray-700 leading-relaxed">{entry.message}</p>
            <div className="mt-3 flex items-center space-x-4">
              <button
                onClick={() => handleMainLike(entry.id)}
                className="flex items-center space-x-1 text-gray-500 hover:text-red-500 transition-colors"
              >
                <FaHeart className={entry.likedBy?.includes(currentUser?.uid || 'anonymous') ? "text-red-500" : "text-gray-300"} />
                <span>{entry.likes || 0}</span>
              </button>
              {entry.replies?.length > 0 && (
                <div className="flex items-center space-x-1 text-gray-500">
                  <FaReply className="text-gray-300" />
                  <span>{entry.replies.length}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="pt-4 w-full flex justify-center">
        <HeaderDrawer uid={finalUid} drawerContentClassName="md:w-[1100px] pt-6 p-2">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">방명록</h2>
            <p className="text-gray-600">방문 기록을 남겨주세요</p>
          </div>
        </HeaderDrawer>
      </div>
    </div>
  )
}
