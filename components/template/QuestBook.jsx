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
  increment,
  setDoc,
  getDoc
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
import { Edit2, MessageCircle } from "lucide-react"
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { sendNotification } from '@/lib/utils/notification-manager'
// Dialog 관련 import 제거 (주석 처리)
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
//   DialogFooter,
// } from "@/components/ui/dialog"

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
  const pathname = usePathname()
  const isEditable = pathname ? pathname.startsWith('/editor') : false;
  const { currentUser } = useSelector((state) => state.user)
  const finalUid = uid ?? currentUser?.uid;
  const userRole = currentUser?.uid;
  const canDelete = isEditable ? finalUid : userRole === uid;
  const toast = useToast();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [entries, setEntries] = useState([])
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState('')
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
    if (!message.trim()) {
      return
    }

    // 저장 시작
    const messageToSave = message;
    setSaveStatus('저장 중...');
    
    // 이름이 없을 경우 '익명'으로 설정
    const finalName = name.trim() || '익명';

    try {
      if (replyTo) {
        // 답글 작성
        const commentRef = doc(db, 'users', finalUid, 'comments', replyTo.commentId)
        const commentDoc = await getDoc(commentRef)
        const currentReplies = commentDoc.data().replies || []

        // AI 답변 생성
        let aiResponse = '';
        try {
          const response = await fetch('/api/ai-response', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: message })
          });

          if (response.ok) {
            const data = await response.json();
            aiResponse = data.response;
          }
        } catch (error) {
          console.error('AI 답변 생성 중 오류:', error);
          aiResponse = '죄송합니다. AI 답변을 생성하는 중에 오류가 발생했습니다.';
        }

        await updateDoc(commentRef, {
          replies: [...currentReplies, {
            name: finalName,
            message: messageToSave,
            createdAt: new Date(),
            uid: currentUser?.uid || null,
            profileImage: currentUser?.photoURL || null,
            likes: 0,
            likedBy: [],
            aiResponse
          }]
        })
      } else {
        // 새 방명록 작성
        // AI 답변 생성
        let aiResponse = '';
        setSaveStatus('AI 답변을 생성하고 있습니다...');
        try {
          const response = await fetch('/api/ai-response', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: messageToSave })
          });

          if (response.ok) {
            const data = await response.json();
            aiResponse = data.response;
          }
        } catch (error) {
          console.error('AI 답변 생성 중 오류:', error);
          aiResponse = '죄송합니다. AI 답변을 생성하는 중에 오류가 발생했습니다.';
        }
        
        // 저장 완료 후 폼 초기화
        setMessage('');
        setName('');
        setIsFormOpen(false);
        setSaveStatus('');

        const docRef = await addDoc(collection(db, 'users', finalUid, 'comments'), {
          name: finalName,
          message: messageToSave,
          createdAt: new Date(),
          uid: currentUser?.uid || null,
          profileImage: currentUser?.photoURL || null,
          likes: 0,
          likedBy: [],
          replies: [],
          aiResponse
        })

        // 구독자들에게 알림 전송
        try {
          await sendNotification(finalUid, {
            type: 'questbook',
            title: '새로운 방명록이 등록되었습니다',
            content: `${name}: ${message.substring(0, 200)}`,
            sourceTemplate: 'questbook',
            metadata: {
              authorName: name,
              authorEmail: currentUser?.email || '',
              postId: docRef.id,
              postTitle: `${name}님의 방명록`,
              postContent: message.substring(0, 200)
            }
          });
        } catch (error) {
          console.error('알림 전송 실패:', error);
          // 알림 전송 실패는 방명록 작성에 영향을 주지 않음
        }
      }
    } catch (error) {
      console.error('방명록 작성 실패:', error)
      // 에러 발생 시 메시지 복원
      setMessage(messageToSave);
      setName(finalName);
      setIsFormOpen(true);
      setSaveStatus('');
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
  } catch (error) {
      console.error('좋아요 처리 실패:', error)
    }
  }

  return (
  <Drawer>
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent className={`w-full h-[85vh] flex flex-col bg-gray-50 ${drawerContentClassName}`}>
        <DrawerHeader>
          <DrawerTitle></DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto p-4 scrollbar-none">
          {/* 방명록 작성 폼 */}
          <form onSubmit={handleSubmit} className="mb-6 bg-white p-4 rounded-xl shadow-sm">
            {saveStatus && (
              <div className="mb-3 text-sm text-blue-600 bg-blue-50 p-2 rounded">
                {saveStatus}
              </div>
            )}
            <div className="flex flex-col space-y-3">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={replyTo ? "답글 쓰기" : "메시지를 입력하세요"}
                className="px-4 py-2 border border-gray-200 rounded-lg h-24 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                disabled={saveStatus !== ''}
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
                  {replyTo ? '답글 작성' : '메시지 작성'}
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
                <div className="flex items-center justify-end space-x-2">
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
                    <MessageCircle size={16} />
                    <span>답글</span>
      </button>
                </div>

                {/* 답글 목록 */}
                {entry.replies && entry.replies.length > 0 && (
                  <div className="mt-4 ml-8 space-y-3">
                    {entry.replies.map((reply, replyIndex) => (
                      <div key={replyIndex} className="space-y-3">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex justify-end">
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
                        {reply.aiResponse && (
                          <div 
                            className={cn(
                              "p-3 backdrop-blur-sm ml-4",
                              styleSettings.rounded === 'none' && 'rounded-none',
                              styleSettings.rounded === 'sm' && 'rounded',
                              styleSettings.rounded === 'md' && 'rounded-lg',
                              styleSettings.rounded === 'lg' && 'rounded-xl',
                              styleSettings.rounded === 'full' && 'rounded-full'
                            )}
                            style={{
                              backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.1) * 255).toString(16).padStart(2, '0')}`,
                              boxShadow: (() => {
                                const shadowColor = styleSettings.shadowColor 
                                  ? `rgba(${parseInt(styleSettings.shadowColor.slice(1, 3), 16)}, ${parseInt(styleSettings.shadowColor.slice(3, 5), 16)}, ${parseInt(styleSettings.shadowColor.slice(5, 7), 16)}, ${styleSettings.shadowOpacity ?? 0.2})`
                                  : 'rgba(0, 0, 0, 0.2)';
                                return styleSettings.shadow === 'none' ? 'none' : `0 2px 4px ${shadowColor}`;
                              })()
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                <div 
                                  className="w-6 h-6 rounded-full flex items-center justify-center"
                                  style={{ 
                                    backgroundColor: `${styleSettings.bgColor}${Math.round(0.2 * 255).toString(16).padStart(2, '0')}`,
                                    border: `1px solid ${styleSettings.textColor}20`
                                  }}
                                >
                                  <span className="text-xs font-medium" style={{ color: styleSettings.textColor }}>AI</span>
                                </div>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm whitespace-pre-wrap" style={{ color: styleSettings.textColor }}>{reply.aiResponse}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {isLoading && <div className="text-center py-4">로딩 중...</div>}
          {!isLoading && !hasMore && entries.length > 0 && (
            <div className="text-center py-4 text-gray-500">더 이상 메세지가 없습니다</div>
          )}
          {!isLoading && entries.length === 0 && (
            <div className="text-center py-4 text-gray-500">아직 메세지가 없습니다</div>
          )}
    </div>
  </DrawerContent>
</Drawer>
  )
}

const COLOR_PALETTE = [
  'transparent',
  '#000000', '#FFFFFF', '#F87171', '#FBBF24',
  '#34D399', '#60A5FA', '#A78BFA', '#F472B6',
];

export default function GuestbookTemplate({ username, uid }) {
  const [previewEntries, setPreviewEntries] = useState([]);
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [visibleEntries, setVisibleEntries] = useState(5);
  const [totalEntries, setTotalEntries] = useState(0);
  // 모달 관련 상태 제거 (주석 처리)
  // const [selectedEntry, setSelectedEntry] = useState(null);
  // const [showDetailModal, setShowDetailModal] = useState(false);
  const [styleSettings, setStyleSettings] = useState({
    bgColor: '#60A5FA',
    textColor: '#FFFFFF',
    bgOpacity: 0.2,
    shadow: 'none',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    rounded: 'md'
  });
  const pathname = usePathname();
  const { currentUser } = useSelector((state) => state.user);
  const finalUid = uid ?? currentUser?.uid;
  const { toast } = useToast();

  // canEdit 로직 추가
  const isEditMode = pathname ? pathname.startsWith('/editor') : false;
  const canEdit = isEditMode || (currentUser?.uid === finalUid);

  // 스타일 설정 저장 함수
  const saveStyleSettings = async (newSettings) => {
    if (!finalUid) return;
    try {
      await setDoc(doc(db, 'users', finalUid, 'settings', 'guestbook'), newSettings, { merge: true });
      setStyleSettings(newSettings);
    } catch (error) {
      console.error('스타일 설정 저장 실패:', error);
    }
  };

  // 스타일 설정 불러오기
  useEffect(() => {
    const loadStyleSettings = async () => {
      if (!finalUid) return;
      try {
        const docRef = doc(db, 'users', finalUid, 'settings', 'guestbook');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setStyleSettings(docSnap.data());
        }
      } catch (error) {
        console.error('스타일 설정 불러오기 실패:', error);
      }
    };
    loadStyleSettings();
  }, [finalUid]);

  const renderColorSettings = () => {
    if (!pathname?.startsWith('/editor')) return null;

    return (
      <div className="w-full max-w-[1100px] mb-4">
        <button
          onClick={() => setShowColorSettings(!showColorSettings)}
          className="w-full p-2 rounded-lg mb-2 hover:bg-opacity-30 transition-all"
          style={{ 
            backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
            color: styleSettings.textColor 
          }}
        >
          게스트북 스타일 설정 {showColorSettings ? '닫기' : '열기'}
        </button>

        {showColorSettings && (
          <div className="flex flex-col gap-4 bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-700">
            {/* 1. 배경색 설정 */}
            <div className="flex flex-col gap-2 bg-gray-700/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">배경색</span>
                <div className="flex flex-wrap gap-1 max-w-[calc(100%-6rem)]">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color}
                      onClick={() => saveStyleSettings({ ...styleSettings, bgColor: color })}
                      className={cn(
                        "w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110",
                        styleSettings.bgColor === color && "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">투명도</span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={styleSettings.bgOpacity ?? 0.2}
                  onChange={(e) => saveStyleSettings({ ...styleSettings, bgOpacity: parseFloat(e.target.value) })}
                  className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-100 w-12 text-right">
                  {(styleSettings.bgOpacity ?? 0.2).toFixed(1)}
                </span>
              </div>
            </div>

            {/* 2. 텍스트 색상 설정 */}
            <div className="flex items-center gap-2 bg-gray-700/50 p-3 rounded-lg">
              <span className="text-sm font-medium text-gray-100 w-24">텍스트</span>
              <div className="flex flex-wrap gap-1 max-w-[calc(100%-6rem)]">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={`text-${color}`}
                    onClick={() => saveStyleSettings({ ...styleSettings, textColor: color })}
                    className={cn(
                      "w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110",
                      styleSettings.textColor === color && "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* 3. 그림자 색상 설정 */}
            <div className="flex flex-col gap-2 bg-gray-700/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">그림자</span>
                <div className="flex flex-wrap gap-1 max-w-[calc(100%-6rem)]">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={`shadow-${color}`}
                      onClick={() => saveStyleSettings({ ...styleSettings, shadowColor: color })}
                      className={cn(
                        "w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110",
                        styleSettings.shadowColor === color && "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">투명도</span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={styleSettings.shadowOpacity ?? 0.2}
                  onChange={(e) => saveStyleSettings({ ...styleSettings, shadowOpacity: parseFloat(e.target.value) })}
                  className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-100 w-12 text-right">
                  {(styleSettings.shadowOpacity ?? 0.2).toFixed(1)}
                </span>
              </div>
            </div>

            {/* 4. 모서리와 그림자 스타일 설정 */}
            <div className="flex flex-col gap-4 bg-gray-700/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">모서리</span>
                <select
                  value={styleSettings.rounded || 'md'}
                  onChange={(e) => saveStyleSettings({ ...styleSettings, rounded: e.target.value })}
                  className="px-3 py-1.5 bg-gray-800 text-gray-100 rounded-lg border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32 overflow-y-auto"
                >
                  <option value="none">각진</option>
                  <option value="sm">약간 둥근</option>
                  <option value="md">둥근</option>
                  <option value="lg">많이 둥근</option>
                  <option value="full">완전 둥근</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">그림자</span>
                <select
                  value={styleSettings.shadow || 'none'}
                  onChange={(e) => saveStyleSettings({ ...styleSettings, shadow: e.target.value })}
                  className="px-3 py-1.5 bg-gray-800 text-gray-100 rounded-lg border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32 overflow-y-auto"
                >
                  <option value="none">없음</option>
                  <option value="sm">약한</option>
                  <option value="md">보통</option>
                  <option value="lg">강한</option>
                  <option value="retro">레트로</option>
                  <option value="float">플로팅</option>
                  <option value="glow">글로우</option>
                  <option value="inner">이너</option>
                  <option value="sharp">샤프</option>
                  <option value="soft">소프트</option>
                  <option value="stripe">스트라이프</option>
                  <option value="cross">크로스</option>
                  <option value="diagonal">대각선</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const getStyleObject = () => ({
    backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
    color: styleSettings.textColor,
    boxShadow: (() => {
      const shadowColor = styleSettings.shadowColor 
        ? `rgba(${parseInt(styleSettings.shadowColor.slice(1, 3), 16)}, ${parseInt(styleSettings.shadowColor.slice(3, 5), 16)}, ${parseInt(styleSettings.shadowColor.slice(5, 7), 16)}, ${styleSettings.shadowOpacity ?? 0.2})`
        : 'rgba(0, 0, 0, 0.2)';
      
      switch (styleSettings.shadow) {
        case 'none':
          return 'none';
        case 'sm':
          return `0 1px 2px ${shadowColor}`;
        case 'md':
          return `0 4px 6px ${shadowColor}`;
        case 'lg':
          return `0 10px 15px ${shadowColor}`;
        case 'retro':
          return `8px 8px 0px 0px ${shadowColor}`;
        case 'float':
          return `0 10px 20px -5px ${shadowColor}`;
        case 'glow':
          return `0 0 20px ${shadowColor}`;
        case 'inner':
          return `inset 0 2px 4px ${shadowColor}`;
        case 'sharp':
          return `-10px 10px 0px ${shadowColor}`;
        case 'soft':
          return `0 5px 15px ${shadowColor}`;
        case 'stripe':
          return `4px 4px 0 ${shadowColor}, 8px 8px 0 ${shadowColor}, 12px 12px 0 ${shadowColor}`;
        case 'cross':
          return `4px 4px 0 ${shadowColor}, -4px -4px 0 ${shadowColor}, 4px -4px 0 ${shadowColor}, -4px 4px 0 ${shadowColor}`;
        case 'diagonal':
          return `4px 4px 0 ${shadowColor}, 8px 8px 0 ${shadowColor}, 12px 12px 0 ${shadowColor}, -4px -4px 0 ${shadowColor}, -8px -8px 0 ${shadowColor}, -12px -12px 0 ${shadowColor}`;
        default:
          return 'none';
      }
    })(),
    borderColor: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(styleSettings.shadow || '') ? styleSettings.shadowColor || '#000000' : undefined,
    borderWidth: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(styleSettings.shadow || '') ? '2px' : undefined,
    borderStyle: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(styleSettings.shadow || '') ? 'solid' : undefined,
  });

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
    } catch (error) {
      console.error('좋아요 처리 실패:', error)
    }
  };

  // 최근 방명록 3개 로드
  useEffect(() => {
    if (!finalUid) return
    
    // 총 방명록 수 가져오기
    const fetchTotalEntries = async () => {
      const snapshot = await getDocs(collection(db, 'users', finalUid, 'comments'));
      setTotalEntries(snapshot.size);
    };
    fetchTotalEntries();

    // 방명록 목록 가져오기
    const q = query(
      collection(db, 'users', finalUid, 'comments'),
      orderBy('createdAt', 'desc'),
      limit(visibleEntries)
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
  }, [finalUid, visibleEntries])

  const [guestBookTitle, setGuestBookTitle] = useState('게스트북');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  useEffect(() => {
    const loadGuestBookTitle = async () => {
      if (!finalUid) return;
      try {
        const docRef = doc(db, 'users', finalUid, 'info', 'guestBookSettings');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().title) {
          setGuestBookTitle(docSnap.data().title);
        }
      } catch (error) {
        console.error('게스트북 제목 불러오기 실패:', error);
      }
    };
    loadGuestBookTitle();
  }, [finalUid]);

  const handleTitleSave = async (newTitle) => {
    if (!finalUid || !canEdit) return;
    try {
      const docRef = doc(db, 'users', finalUid, 'info', 'guestBookSettings');
      await setDoc(docRef, { title: newTitle }, { merge: true });
      setGuestBookTitle(newTitle);
      setIsEditingTitle(false);
    } catch (error) {
      console.error('제목 저장 실패:', error);
      alert('제목 저장에 실패했습니다.');
    }
  };

  return (
    <div className='p-2 pt-4 md:flex md:flex-col md:items-center md:w-full overflow-y-auto'>
      <style jsx global>{`
        @keyframes floating {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .floating-animation {
          animation: floating 5s ease-in-out infinite;
        }
      `}</style>
      {renderColorSettings()}
      {/* 게스트북 제목 */}
      <div 
        className={cn(
          "relative flex items-center justify-center text-[21px] font-bold w-full max-w-[1100px] rounded-2xl p-4 backdrop-blur-sm tracking-tight mt-2",
          styleSettings.rounded === 'none' && 'rounded-none',
          styleSettings.rounded === 'sm' && 'rounded',
          styleSettings.rounded === 'md' && 'rounded-lg',
          styleSettings.rounded === 'lg' && 'rounded-xl',
          styleSettings.rounded === 'full' && 'rounded-full'
        )}
        style={getStyleObject()}
      >
        <HeaderDrawer uid={finalUid}>
          <button 
            className="absolute left-4 p-2 rounded-lg hover:bg-opacity-30 transition-all"
            style={{ 
              backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
              color: styleSettings.textColor 
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        </HeaderDrawer>
        <div className="flex items-center justify-center gap-2 relative">
          {isEditingTitle ? (
            <input
              type="text"
              value={guestBookTitle}
              onChange={(e) => setGuestBookTitle(e.target.value)}
              onBlur={() => handleTitleSave(guestBookTitle)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleTitleSave(guestBookTitle);
                }
              }}
              className="text-xl font-semibold text-center bg-transparent border-b-2 border-gray-300 focus:border-blue-500 outline-none px-2 py-1"
              autoFocus
            />
          ) : (
            <div className="relative flex items-center justify-center">
              <h1 className="text-xl font-semibold text-center px-8">
                {guestBookTitle}
              </h1>
              {canEdit && (
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
        <HeaderDrawer uid={finalUid}>
          <button 
            className="absolute right-4 p-2 rounded-lg hover:bg-opacity-30 transition-all"
            style={{ 
              backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
              color: styleSettings.textColor 
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </HeaderDrawer>
      </div>
      <div className='h-[12px]'/>
      {/* 메인 리스트 */}
      <div className="w-full flex flex-col items-center gap-4">
        {previewEntries.map((entry) => (
          <HeaderDrawer key={entry.id} uid={finalUid}>
            <div 
              className={cn(
                "w-full max-w-[1100px] p-4 backdrop-blur-sm transition-all duration-300 ease-in-out floating-animation",
                styleSettings.rounded === 'none' && 'rounded-none',
                styleSettings.rounded === 'sm' && 'rounded',
                styleSettings.rounded === 'md' && 'rounded-lg',
                styleSettings.rounded === 'lg' && 'rounded-xl',
                styleSettings.rounded === 'full' && 'rounded-full'
              )}
              style={getStyleObject()}
            >
              <p style={{ color: styleSettings.textColor }} className="leading-relaxed">
                {entry.message}
              </p>
              {entry.aiResponse && (
                <div 
                  className={cn(
                    "mt-4 p-3 backdrop-blur-sm",
                    styleSettings.rounded === 'none' && 'rounded-none',
                    styleSettings.rounded === 'sm' && 'rounded',
                    styleSettings.rounded === 'md' && 'rounded-lg',
                    styleSettings.rounded === 'lg' && 'rounded-xl',
                    styleSettings.rounded === 'full' && 'rounded-full'
                  )}
                  style={{
                    backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.1) * 255).toString(16).padStart(2, '0')}`,
                    boxShadow: (() => {
                      const shadowColor = styleSettings.shadowColor 
                        ? `rgba(${parseInt(styleSettings.shadowColor.slice(1, 3), 16)}, ${parseInt(styleSettings.shadowColor.slice(3, 5), 16)}, ${parseInt(styleSettings.shadowColor.slice(5, 7), 16)}, ${styleSettings.shadowOpacity ?? 0.2})`
                        : 'rgba(0, 0, 0, 0.2)';
                      return styleSettings.shadow === 'none' ? 'none' : `0 2px 4px ${shadowColor}`;
                    })()
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ 
                          backgroundColor: `${styleSettings.bgColor}${Math.round(0.2 * 255).toString(16).padStart(2, '0')}`,
                          border: `1px solid ${styleSettings.textColor}20`
                        }}
                      >
                        <span className="text-xs font-medium" style={{ color: styleSettings.textColor }}>AI</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm" style={{ color: styleSettings.textColor }}>{entry.aiResponse}</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMainLike(entry.id);
                      }}
                      className="flex items-center space-x-1 transition-colors"
                      style={{ color: styleSettings.textColor, opacity: 0.7 }}
                    >
                      <FaHeart className={entry.likedBy?.includes(currentUser?.uid || 'anonymous') ? "text-red-500" : ""} />
                      <span>{entry.likes || 0}</span>
                    </button>
                    <HeaderDrawer uid={finalUid}>
                      <button
                        className="flex items-center space-x-1 transition-colors"
                        style={{ color: styleSettings.textColor, opacity: 0.7 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageCircle size={16} />
                        <span>{entry.replies?.length || 0}</span>
                      </button>
                    </HeaderDrawer>
                  </div>
                </div>
                <span 
                  className="text-sm px-2 py-1 rounded-full"
                  style={{ 
                    color: styleSettings.textColor,
                    backgroundColor: `${styleSettings.bgColor}${Math.round(0.1 * 255).toString(16).padStart(2, '0')}`,
                  }}
                >
                  {getTimeAgo(entry.createdAt)}
                </span>
              </div>
            </div>
          </HeaderDrawer>
        ))}
      </div>

      {/* 모달 컴포넌트 완전히 제거 */}

      {previewEntries.length > 0 && (
        <>
          <div className="h-[20px]" />
          {totalEntries > visibleEntries && (
            <button
              onClick={() => setVisibleEntries(prev => prev + 5)}
              className={cn(
                "w-full max-w-[1100px] p-4 backdrop-blur-sm transition-all duration-300 ease-in-out text-center",
                styleSettings.rounded === 'none' && 'rounded-none',
                styleSettings.rounded === 'sm' && 'rounded',
                styleSettings.rounded === 'md' && 'rounded-lg',
                styleSettings.rounded === 'lg' && 'rounded-xl',
                styleSettings.rounded === 'full' && 'rounded-full'
              )}
              style={getStyleObject()}
            >
              더보기 ({visibleEntries}/{totalEntries})
            </button>
          )}
        </>
      )}
    </div>
  );
}
