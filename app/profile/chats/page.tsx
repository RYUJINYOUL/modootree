'use client';

import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { collection, query, getDocs, orderBy, addDoc, serverTimestamp, where, doc, updateDoc, limit } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/firebase';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Book, Loader2, PenSquare, Trash2 } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/firebase';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  searchResults?: {
    title: string;
    description: string;
    link: string;
  }[];
}

interface ChatDraft {
  id: string;
  chatId: string;
  content: string;
  date: Date;
  status: string;
  createdAt: { seconds: number; toDate: () => Date };
  updatedAt: { seconds: number; toDate: () => Date };
  publishedId?: string;
  images?: string[];
}

interface DailyChat {
  id: string;
  messages: ChatMessage[];
  date: string;
  diary?: {
    status: 'generating' | 'generated' | 'failed';
    content?: string;
    draftId?: string;  // 임시저장 ID
    publishedId?: string;  // 최종 발행된 일기 ID
    lastUpdated?: Date;
    images?: string[];
  };
}

// 일기 형식 요약 생성
function generateDiarySummary(messages: ChatMessage[]): string {
  return '작성하기를 누르면 AI가 자동으로 일기를 작성해 드립니다.';
}


export default function ChatsPage() {
  const router = useRouter();
  const { currentUser } = useSelector((state: any) => state.user);
  const [chats, setChats] = useState<DailyChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWriting, setIsWriting] = useState(false);
  const [editingDiary, setEditingDiary] = useState<{
    id: string;
    content: string;
    date: Date;
    images: string[];
    pendingImages: File[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 일기 생성 함수
  const handleGenerateDiary = async (chat: DailyChat) => {
    if (!currentUser?.uid) return;

    try {
      // 상태를 생성 중으로 변경
      setChats(prev => prev.map(c => 
        c.id === chat.id 
          ? { ...c, diary: { status: 'generating', lastUpdated: new Date() } }
          : c
      ));

      // 토큰 가져오기
      const token = await auth.currentUser.getIdToken(true);

      // AI에게 일기 작성 요청
      const response = await fetch('/api/ai-comfort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '이 대화를 일기로 작성해줘',
          token,
          conversationHistory: chat.messages
        })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      // chat_diaries에 임시 저장
      const draftRef = await addDoc(collection(db, `users/${currentUser.uid}/chat_diaries`), {
        chatId: chat.id,
        content: data.response,
        date: new Date(chat.date),
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 상태 업데이트
      setChats(prev => prev.map(c =>
        c.id === chat.id
          ? {
              ...c,
              diary: {
                status: 'generated',
                content: data.response,
                draftId: draftRef.id,
                lastUpdated: new Date()
              }
            }
          : c
      ));

    } catch (error) {
      console.error('일기 생성 실패:', error);
      alert('일기 생성 중 오류가 발생했습니다.');
      // 상태를 실패로 변경
      setChats(prev => prev.map(c => 
        c.id === chat.id 
          ? { ...c, diary: { status: 'failed', lastUpdated: new Date() } }
          : c
      ));
    }
  };

  useEffect(() => {
    const fetchChats = async () => {
      if (!currentUser?.uid) return;

      try {
        setLoading(true);
        console.log('채팅 데이터 로딩 시작...', currentUser.uid);
        
        // 1. 사용자별 채팅 데이터 쿼리 (userId 필드 사용)
        const userChatsQuery = query(
          collection(db, 'dailyChats'),
          where('userId', '==', currentUser.uid),
          orderBy('dateKey', 'desc'),
          limit(20) // 최근 20개만 로드
        );
        
        const querySnapshot = await getDocs(userChatsQuery);
        console.log('쿼리 결과:', querySnapshot.docs.length, '개의 채팅 발견');

        // 2. 모든 임시저장 일기를 한 번에 가져오기
        const draftsQuery = query(
          collection(db, `users/${currentUser.uid}/chat_diaries`),
          orderBy('createdAt', 'desc')
        );
        const draftsSnapshot = await getDocs(draftsQuery);
        const draftsMap = new Map<string, ChatDraft>();
        
        draftsSnapshot.docs.forEach(doc => {
          const draft = { ...doc.data(), id: doc.id } as ChatDraft;
          if (!draftsMap.has(draft.chatId) || 
              draft.createdAt?.seconds > draftsMap.get(draft.chatId)!.createdAt?.seconds) {
            draftsMap.set(draft.chatId, draft);
          }
        });

        // 3. 데이터 조합
        const loadedChats: DailyChat[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const draft = draftsMap.get(doc.id);
          
          console.log('채팅 문서:', doc.id, '메시지 수:', data.messages?.length || 0);
          
          return {
            id: doc.id,
            messages: data.messages || [],
            date: data.dateKey || doc.id.split('_')[0],
            diary: draft ? {
              status: 'generated',
              content: draft.content,
              draftId: draft.id,
              publishedId: draft.publishedId,
              lastUpdated: draft.updatedAt?.toDate(),
              images: draft.images || []
            } : undefined
          };
        });
        
        console.log('최종 로드된 채팅:', loadedChats.length, '개');
        setChats(loadedChats);
      } catch (error) {
        console.error('Error fetching chats:', error);
        // 에러 발생 시 기존 방식으로 폴백
        try {
          console.log('폴백 방식으로 재시도...');
          const q = query(collection(db, 'dailyChats'));
          const querySnapshot = await getDocs(q);
          
          const loadedChats: DailyChat[] = [];
          
          for (const doc of querySnapshot.docs) {
            const [dateStr, uid] = doc.id.split('_');
            if (uid === currentUser.uid) {
              const draftQuery = query(
                collection(db, `users/${currentUser.uid}/chat_diaries`),
                where('chatId', '==', doc.id)
              );
              const draftSnapshot = await getDocs(draftQuery);
              const drafts = draftSnapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
              })) as ChatDraft[];
              const draft = drafts.length > 0
                ? drafts.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)[0]
                : null;

              loadedChats.push({
                id: doc.id,
                messages: doc.data().messages || [],
                date: dateStr,
                diary: draft ? {
                  status: 'generated',
                  content: draft.content,
                  draftId: draft.id,
                  publishedId: draft.publishedId,
                  lastUpdated: draft.updatedAt?.toDate(),
                  images: draft.images || []
                } : undefined
              });
            }
          }

          loadedChats.sort((a, b) => b.date.localeCompare(a.date));
          console.log('폴백으로 로드된 채팅:', loadedChats.length, '개');
          setChats(loadedChats);
        } catch (fallbackError) {
          console.error('폴백 방식도 실패:', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, [currentUser?.uid]);

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">로그인이 필요합니다.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 md:p-6 py-6 overflow-auto w-full">
        <div className="w-full space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-2 md:px-0">
            {/* 스켈레톤 로딩 */}
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-[#2A4D45]/40 backdrop-blur-sm border border-[#358f80]/20 rounded-lg overflow-hidden animate-pulse">
                <div className="bg-[#2A4D45]/50 backdrop-blur-sm border-b border-[#358f80]/20 px-4 py-3">
                  <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-600 rounded w-1/2"></div>
                </div>
                <div className="py-4 px-2 space-y-4">
                  <div className="bg-[#2A4D45]/50 backdrop-blur-sm border border-[#358f80]/20 py-2 px-2 rounded-lg">
                    <div className="h-4 bg-gray-600 rounded w-2/3 mb-2"></div>
                    <div className="h-3 bg-gray-600 rounded w-full mb-1"></div>
                    <div className="h-3 bg-gray-600 rounded w-3/4"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-gray-600 rounded w-20"></div>
                    <div className="h-6 bg-gray-600 rounded w-24"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 md:p-6 py-6 overflow-auto w-full">
      <div className="w-full space-y-6">
        {/* 대화 기록 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-2 md:px-0">
          {chats.length === 0 ? (
            <div className="text-center py-8 bg-[#2A4D45]/40 backdrop-blur-sm border border-[#358f80]/20 rounded-lg md:col-span-3">
              <p className="text-white">아직 AI와의 대화 기록이 없습니다.</p>
            </div>
          ) : (
            chats.map(chat => (
              <div
                key={chat.id}
                className="block bg-[#2A4D45]/40 backdrop-blur-sm border border-[#358f80]/20 rounded-lg overflow-hidden"
              >
                {/* 날짜 헤더 */}
                <div className="bg-[#2A4D45]/50 backdrop-blur-sm border-b border-[#358f80]/20 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white">
                      {format(new Date(chat.date), 'PPP', { locale: ko })}
                    </span>
                  </div>
                  <span className="text-sm text-gray-300">
                    {chat.messages.length}개의 대화 내용
                  </span>
                </div>

                {/* 요약 보기 */}
                <div className="py-4 px-2 space-y-4">
                  <div className="bg-[#2A4D45]/50 backdrop-blur-sm border border-[#358f80]/20 py-2 px-2 rounded-lg">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Book className="w-4 h-4 text-white" />
                          <span className="text-sm font-medium text-white">AI 일기 작성</span>
                        </div>
                        <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!chat.diary || chat.diary.status !== 'generated') {
                                  // 작성하기 - AI 일기 생성 시작
                                  await handleGenerateDiary(chat);
                                } else {
                                  // 수정하기 - 수정 다이얼로그 오픈
                                  setEditingDiary({
                                    id: chat.diary.draftId!,
                                    content: chat.diary.content!,
                                    date: new Date(chat.date),
                                    images: chat.diary.images || [],
                                    pendingImages: []
                                  });
                                  setIsWriting(true);
                                }
                              }}
                          disabled={chat.diary?.status === 'generating'}
                          className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1.5
                            ${chat.diary?.status === 'generating'
                              ? 'bg-[#2A4D45]/50 cursor-not-allowed'
                              : 'bg-[#2A4D45]/40 hover:bg-[#2A4D45]/50'
                            } text-white`}
                        >
                          {chat.diary?.status === 'generating' && (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          )}
                          {chat.diary?.status === 'generated' ? '수정하기' : 
                           chat.diary?.status === 'generating' ? '생성 중...' : 
                           '작성하기'}
                        </button>
                      </div>
                    {chat.diary?.status === 'generated' ? (
                      <div className="text-xs text-gray-300">
                        <p className="mb-1 text-white">작성된 일기:</p>
                        <p className="whitespace-pre-wrap line-clamp-3">
                          {chat.diary.content}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-300 line-clamp-2">
                        {generateDiarySummary(chat.messages)}
                      </p>
                    )}
                  </div>

                      <div className="flex items-center gap-2 mt-2">
                        <Link
                          href={`/profile/chats/${chat.id}`}
                          className="text-xs bg-[#2A4D45]/40 hover:bg-[#2A4D45]/50 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          대화 내용 보기
                        </Link>
                        <Link
                          href="/modoo-vote/submit"
                          className="text-xs bg-[#2A4D45]/40 hover:bg-[#2A4D45]/50 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          공감 투표 만들기
                        </Link>
                        {chat.diary?.status === 'generated' && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (chat.diary?.publishedId) return;
                              if (!currentUser?.uid || !chat.diary?.draftId) return;

                              try {
                                // 일기로 저장
                                const diaryRef = await addDoc(collection(db, `users/${currentUser.uid}/private_diary`), {
                                  title: `${format(new Date(chat.date), 'PPP', { locale: ko })}의 일기`,
                                  content: chat.diary.content,
                                  date: new Date(chat.date),
                                  chatId: chat.id,
                                  images: chat.diary.images || [],
                                  createdAt: serverTimestamp(),
                                  updatedAt: serverTimestamp()
                                });

                                // 임시저장 상태 업데이트
                                const draftRef = doc(db, `users/${currentUser.uid}/chat_diaries`, chat.diary.draftId);
                                await updateDoc(draftRef, {
                                  status: 'published',
                                  publishedId: diaryRef.id,
                                  updatedAt: serverTimestamp()
                                });

                                // 상태 업데이트
                                setChats(prev => prev.map(c => {
                                  if (c.id === chat.id && c.diary) {
                                    return {
                                      ...c,
                                      diary: {
                                        ...c.diary,
                                        publishedId: diaryRef.id
                                      }
                                    };
                                  }
                                  return c;
                                }));

                                alert('일기가 저장되었습니다.');
                              } catch (error) {
                                console.error('일기 저장 실패:', error);
                                alert('일기 저장 중 오류가 발생했습니다.');
                              }
                            }}
                            disabled={!!chat.diary?.publishedId}
                            className={`text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                              chat.diary?.publishedId
                                ? 'bg-gray-500 cursor-not-allowed text-gray-300'
                                : 'bg-[#56ab91]/60 hover:bg-[#56ab91]/80 text-white'
                            }`}
                          >
                            {chat.diary?.publishedId ? '저장완료' : '일기로 저장'}
                          </button>
                        )}
                      </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 수정 다이얼로그 */}
      <Dialog
        open={isWriting}
        onOpenChange={(open) => {
          if (!open) {
            setEditingDiary(null);
          }
          setIsWriting(open);
        }}
      >
        <DialogContent className="sm:max-w-[800px] bg-[#2A4D45]/40 backdrop-blur-sm border border-[#358f80]/20">
          <DialogHeader>
            <DialogTitle>일기 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">내용</label>
              <Textarea
                value={editingDiary?.content || ''}
                onChange={(e) => setEditingDiary(prev => prev ? { ...prev, content: e.target.value } : null)}
                placeholder="일기를 수정해주세요..."
                className="min-h-[200px] bg-[#2A4D45]/40 border-[#358f80]/20 text-white placeholder-gray-400"
              />
            </div>

            {/* 이미지 업로드 */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">사진</label>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="bg-[#2A4D45]/40 border-[#358f80]/20 text-white hover:bg-[#2A4D45]/50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    사진 선택
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      const previewUrls = files.map(file => URL.createObjectURL(file));
                      setEditingDiary(prev => prev ? {
                        ...prev,
                        images: [...prev.images, ...previewUrls],
                        pendingImages: [...prev.pendingImages, ...files]
                      } : null);
                    }}
                    className="hidden"
                  />
                </div>

                {/* 이미지 미리보기 */}
                {editingDiary?.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {editingDiary.images.map((url, index) => (
                      <div key={index} className="aspect-square relative group">
                        <img
                          src={url}
                          alt={`업로드 이미지 ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          onClick={() => {
                            setEditingDiary(prev => prev ? {
                              ...prev,
                              images: prev.images.filter((_, i) => i !== index),
                              pendingImages: prev.pendingImages.filter((_, i) => i !== index)
                            } : null);
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              className="bg-[#2A4D45]/40 border-[#358f80]/20 text-white hover:bg-[#2A4D45]/50"
              onClick={() => setIsWriting(false)}
            >
              취소
            </Button>
            <Button
              onClick={async () => {
                if (!editingDiary || !currentUser?.uid) return;

                try {
                  // 새로운 이미지 업로드
                  const uploadedUrls = await Promise.all(
                    editingDiary.pendingImages.map(async (file) => {
                      const fileRef = ref(storage, `chat_diaries/${currentUser.uid}/${Date.now()}_${file.name}`);
                      await uploadBytes(fileRef, file);
                      return getDownloadURL(fileRef);
                    })
                  );

                  // 기존 이미지와 새로 업로드된 이미지 합치기
                  const allImages = [
                    ...editingDiary.images.filter(url => !url.startsWith('blob:')),
                    ...uploadedUrls
                  ];

                  // 임시저장 일기 업데이트
                  const draftRef = doc(db, `users/${currentUser.uid}/chat_diaries`, editingDiary.id);
                  await updateDoc(draftRef, {
                    content: editingDiary.content,
                    images: allImages,
                    updatedAt: serverTimestamp()
                  });

                  // 상태 업데이트
                  setChats(prev => prev.map(chat => {
                    if (chat.diary?.draftId === editingDiary.id) {
                      return {
                        ...chat,
                        diary: {
                          ...chat.diary,
                          content: editingDiary.content,
                          images: allImages,
                          lastUpdated: new Date()
                        }
                      };
                    }
                    return chat;
                  }));

                  setIsWriting(false);
                  setEditingDiary(null);
                } catch (error) {
                  console.error('일기 수정 실패:', error);
                  alert('일기 수정 중 오류가 발생했습니다.');
                }
              }}
              className="bg-[#56ab91]/60 hover:bg-[#56ab91]/80 text-white"
            >
              저장
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
