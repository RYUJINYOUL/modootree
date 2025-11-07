'use client';

import { useEffect, useState, useCallback } from 'react';
import { loadSlim } from "tsparticles-slim";
import Particles from "react-tsparticles";
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import CollapsibleFooter from '@/components/ui/CollapsibleFooter';
import { Button } from '@/components/ui/button';
import { useSelector } from 'react-redux';
import { collection, query, orderBy, getDocs, where, deleteDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { ChevronLeft, ChevronRight, ImageIcon, Loader2, MessageSquareDashed } from 'lucide-react';
import Link from 'next/link';
import LoginOutButton from '@/components/ui/LoginOutButton';
import { AIGenerationProgress } from '@/components/AIGenerationProgress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Tabs 컴포넌트 임포트
import NewsVotePage from '../news-vote/page'; // NewsVotePage 임포트
import ModooVotePage from '../modoo-vote/page'; // ModooVotePage 임포트

interface PhotoStory {
  id: string;
  photo: string;
  aiStories: {
    id: string;
    content: string;
    votes: number;
  }[];
  selectedStoryId: string;
  author: {
    uid: string;
    displayName: string;
    email: string;
    photoURL: string;
  };
  stats: {
    participantCount: number;
    viewCount: number;
  };
  likeCount: number;
  commentCount: number;
  createdAt: Date;
}

const ParticlesComponent = () => {
  const particlesInit = useCallback(async (engine: any) => {
    await loadSlim(engine);
  }, []);

  return (
    <Particles
      className="absolute inset-0 pointer-events-none"
      init={particlesInit}
      options={{
        background: {
          color: "transparent"
        },
        fpsLimit: 120,
        particles: {
          color: {
            value: ["#3498db", "#2980b9", "#8e44ad", "#2ecc71", "#16a085"]
          },
          collisions: {
            enable: false
          },
          move: {
            direction: "none",
            enable: true,
            outModes: {
              default: "out"
            },
            random: true,
            speed: 0.5,
            straight: false,
            attract: {
              enable: true,
              rotateX: 600,
              rotateY: 1200
            }
          },
          number: {
            density: {
              enable: true,
              area: 800
            },
            value: 100
          },
          opacity: {
            animation: {
              enable: true,
              minimumValue: 0.1,
              speed: 1,
              sync: false
            },
            random: true,
            value: { min: 0.1, max: 0.5 }
          },
          shape: {
            type: "circle"
          },
          size: {
            animation: {
              enable: true,
              minimumValue: 0.1,
              speed: 2,
              sync: false
            },
            random: true,
            value: { min: 1, max: 4 }
          }
        },
        detectRetina: true,
        interactivity: {
          events: {
            onHover: {
              enable: true,
              mode: "bubble"
            }
          },
          modes: {
            bubble: {
              distance: 200,
              duration: 2,
              opacity: 0.8,
              size: 6
            }
          }
        }
      }}
    />
  );
};

export default function PhotoStoryPage({ isActive = true }: { isActive?: boolean }) {
  const router = useRouter();
  const currentUser = useSelector((state: any) => state.user.currentUser);
  const [stories, setStories] = useState<PhotoStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [selectedStory, setSelectedStory] = useState<PhotoStory | null>(null);
  const [writeForm, setWriteForm] = useState({
    photo: '',
    pendingPhoto: null as File | null,
    aiStories: [] as { id: string; content: string; votes: number }[],
    selectedStoryId: '',
  });
  const [generatingStories, setGeneratingStories] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isAdmin = currentUser?.uid === 'vW1OuC6qMweyOqu73N0558pv4b03';
  const fetchStories = useCallback(async () => {
    if (!isActive) {
      setLoading(false);
      return;
    }
    try {
      const q = query(
        collection(db, 'photo-stories')
      );
      
      const querySnapshot = await getDocs(q);
      const storyList = await Promise.all(querySnapshot.docs.map(async (doc) => {
        const data = doc.data();
        
        // 댓글 수 가져오기
        const commentsQuery = query(
          collection(db, 'photo-story-comments'),
          where('storyId', '==', doc.id)
        );
        const commentsSnapshot = await getDocs(commentsQuery);
        const commentCount = commentsSnapshot.size;

        return {
          id: doc.id,
          photo: data.photo || '',
          aiStories: data.aiStories || [],
          selectedStoryId: data.selectedStoryId || '',
          author: data.author || {
            uid: '',
            displayName: '',
            email: '',
            photoURL: ''
          },
          stats: data.stats || {
            participantCount: 0,
            viewCount: 0
          },
          likeCount: data.likeCount || 0,
          commentCount: commentCount,
          createdAt: data.createdAt?.toDate() || new Date()
        } as PhotoStory;
      }));

      // JavaScript에서 날짜 기준으로 정렬
      const sortedStoryList = storyList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setStories(sortedStoryList);
    } catch (error) {
      console.error('스토리 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  }, [isActive]); // isActive 의존성만 필요

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const resizeImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // 최대 크기 제한 (1200px)
          const maxSize = 1200;
          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // JPEG 형식으로 변환하고 품질을 80%로 설정
          canvas.toBlob(
            (blob) => resolve(blob!),
            'image/jpeg',
            0.8
          );
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (file: File) => {
    try {
      // 이미지 크기 제한 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        const resizedBlob = await resizeImage(file);
        file = new File([resizedBlob], file.name, { type: 'image/jpeg' });
      }

      // 이미지 미리보기 URL 생성
      const previewUrl = URL.createObjectURL(file);
      await setWriteForm(prev => ({
        ...prev,
        photo: previewUrl,
        pendingPhoto: file
      }));
    } catch (error) {
      console.error('이미지 처리 중 오류:', error);
      alert('이미지 처리 중 오류가 발생했습니다. 다른 이미지를 시도해주세요.');
    }
  };

  const generateAndSaveStory = async () => {
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }
    
    // writeForm 상태가 아직 업데이트되지 않았을 수 있으므로 약간의 지연을 줍니다
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!writeForm.photo || !writeForm.pendingPhoto) {
      console.error('이미지가 준비되지 않았습니다');
      return;
    }

    setGeneratingStories(true);
    setGenerationComplete(false);

    try {
      // 1. 먼저 이미지 업로드
      const fileRef = ref(storage, `photo-stories/${currentUser.uid}/${Date.now()}_${writeForm.pendingPhoto.name}`);
      await uploadBytes(fileRef, writeForm.pendingPhoto);
      const imageUrl = await getDownloadURL(fileRef);

      // 2. base64 이미지 변환
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });
      reader.readAsDataURL(writeForm.pendingPhoto);
      const base64Image = await base64Promise;

      // 3. AI 스토리 생성
      const response = await fetch('/api/photo-story/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: base64Image })
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'AI 스토리 생성에 실패했습니다.');
      }

      // 4. 자동으로 Firebase에 저장
      const storyData = {
        photo: imageUrl,
        aiStories: result.stories.map((story: any) => ({
          id: story.id,
          content: story.content,
          votes: 0
        })),
        selectedStoryId: '0', // 첫 번째 스토리를 기본값으로
        author: {
          uid: currentUser.uid,
          displayName: currentUser.displayName || currentUser.email?.split('@')[0],
          email: currentUser.email,
          photoURL: currentUser.photoURL
        },
        stats: {
          participantCount: 0,
          viewCount: 0
        },
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'photo-stories'), storyData);
      
      setGenerationComplete(true);
      setShowWriteForm(false); // 모달 닫기
      
      // 생성 완료 후 해당 스토리 페이지로 이동
      router.push(`/photo-story/${docRef.id}`);

    } catch (error) {
      console.error('스토리 생성 실패:', error);
      alert('스토리 생성에 실패했습니다.');
    } finally {
      setGeneratingStories(false);
      setWriteForm({
        photo: '',
        pendingPhoto: null,
        aiStories: [],
        selectedStoryId: ''
      });
    }
  };

  const renderStoryList = () => {
    if (loading) {
      return (
        <div className="text-center py-10">
          스토리 목록을 불러오는 중...
        </div>
      );
    }

    if (stories.length === 0) {
      return (
        <div className="text-center py-10 text-gray-400">
          아직 생성된 스토리가 없습니다.
          {currentUser?.uid && (
            <div className="mt-4">
              <Button
                onClick={() => setShowWriteForm(true)}
                className="bg-blue-500 hover:bg-blue-600"
              >
                첫 번째 스토리 만들기
              </Button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stories.map((story) => (
          <div 
            key={story.id} 
            className="bg-white/10 rounded-lg overflow-hidden hover:bg-white/20 transition-colors cursor-pointer"
            onClick={() => router.push(`/photo-story/${story.id}`)}
          >
            <div className="aspect-square">
              <img 
                src={story.photo} 
                alt="Story" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-sm text-gray-300 line-clamp-2">
                    {Array.isArray(story.aiStories) 
                      ? story.aiStories.find(s => s.id === story.selectedStoryId)?.content 
                      : ''}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                      </svg>
                      <span>{story.likeCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                      <span>{story.commentCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      <span>{story.stats.viewCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 20h.01"></path>
                        <path d="M7 20v-4"></path>
                        <path d="M12 20v-8"></path>
                        <path d="M17 20v-6"></path>
                        <path d="M22 20v-2"></path>
                      </svg>
                      <span>{story.stats.participantCount}</span>
                    </div>
                  </div>
                </div>
                {(isAdmin || story.author.uid === currentUser?.uid) && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation(); // 클릭 이벤트 전파 방지
                      if (confirm('이 스토리를 삭제하시겠습니까?')) {
                        try {
                          setDeleting(story.id);
                          // 스토리 문서 삭제
                          await deleteDoc(doc(db, 'photo-stories', story.id));
                          // 이미지 삭제
                          if (story.photo) {
                            const imageRef = ref(storage, story.photo);
                            await deleteObject(imageRef);
                          }
                          // 투표 기록 삭제 (옵션)
                          const votesQuery = query(
                            collection(db, 'photo-story-votes'),
                            where('storyId', '==', story.id)
                          );
                          const votesSnapshot = await getDocs(votesQuery);
                          await Promise.all(
                            votesSnapshot.docs.map(doc => deleteDoc(doc.ref))
                          );
                          // 목록 새로고침
                          fetchStories();
                        } catch (error) {
                          console.error('스토리 삭제 실패:', error);
                          alert('스토리 삭제에 실패했습니다.');
                        } finally {
                          setDeleting(null);
                        }
                      }
                    }}
                    className={`ml-2 p-1.5 rounded-full bg-red-500/20 hover:bg-red-500/30 transition-colors group relative ${
                      deleting === story.id ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title="삭제하기"
                    disabled={deleting === story.id}
                  >
                    {deleting === story.id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
    {/* LoginOutButton을 고정된 헤더로 추가 */}
    <div className="fixed top-0 left-0 right-0 z-20 w-full">
      <LoginOutButton />
    </div>

    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-cyan-900 text-white/90 relative overflow-hidden pt-[80px]"> {/* pt-[80px] 추가 */}
      <div className="absolute inset-0 z-0">
        <ParticlesComponent /> {/* ParticlesComponent를 z-0으로 설정 */}
      </div>
      <div className="container mx-auto px-4 py-2 relative z-10">

        <Tabs 
          value="photo-story"
          className="w-full flex flex-col items-center"
        >
          <TabsList className="grid w-full max-w-lg grid-cols-3 bg-gray-700/50 mb-6 p-1 rounded-lg shadow-md">
            <TabsTrigger 
              value="news-vote" 
              className="py-2 px-4 rounded-md transition-colors text-gray-300 hover:bg-gray-600"
              onClick={() => router.push('/news-vote')}
            >
              뉴스투표
            </TabsTrigger>
            <TabsTrigger 
              value="modoo-vote" 
              className="py-2 px-4 rounded-md transition-colors text-gray-300 hover:bg-gray-600"
              onClick={() => router.push('/modoo-vote')}
            >
              공감투표
            </TabsTrigger>
            <TabsTrigger 
              value="photo-story" 
              className="py-2 px-4 rounded-md transition-colors bg-blue-600 text-white"
            >
              사진투표
            </TabsTrigger>
          </TabsList>

          <TabsContent value="photo-story" className="w-full">
            <div className="mb-10">
              {currentUser?.uid && (
                <div className="flex justify-end mb-4">
                  <Button
                    onClick={() => setShowWriteForm(true)}
                    variant="default"
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    만들기
                  </Button>
                </div>
              )}
              {!currentUser && (
                <p className="text-sm text-gray-400 text-center mt-4">
                  * 제작은 로그인이 필요합니다
                </p>
              )}

              {renderStoryList()}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>


    {/* AI 플로팅 버튼 */}
    <Link
      href="/ai-comfort"
      className="fixed bottom-[80px] right-4 z-[40] w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-all group"
    >
      <span className="text-white font-medium text-base">AI</span>
    </Link>

    {/* 작성 모달 */}
    <Dialog open={showWriteForm} onOpenChange={setShowWriteForm}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>AI 포토 스토리 만들기</DialogTitle>
          <DialogDescription>
            사진을 업로드하면 AI가 자동으로 재미있는 투표를 만들어드립니다
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-y-auto">
          {/* 사진 업로드 영역 */}
          <div className="relative aspect-square bg-gray-800/50 rounded-lg overflow-hidden">
            {writeForm.photo ? (
              <img
                src={writeForm.photo}
                alt="업로드된 사진"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <ImageIcon className="w-12 h-12 text-gray-400" />
                <p className="text-sm text-gray-400">모바일에서 캡쳐 사진 이용</p>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handlePhotoUpload(file);
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={generatingStories}
            />
          </div>

          {/* AI 스토리 생성 버튼 또는 진행 상황 */}
          {writeForm.photo && (
            generatingStories ? (
              <AIGenerationProgress />
            ) : (
              <Button
                onClick={generateAndSaveStory}
                disabled={generatingStories}
                className="w-full bg-blue-500 hover:bg-blue-600"
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                AI로 스토리 만들기
              </Button>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* 상세 보기 모달 */}
    <Dialog open={selectedStory !== null} onOpenChange={(open) => !open && setSelectedStory(null)}>
      <DialogContent className="sm:max-w-[600px]">
        {selectedStory && (
          <>
            <DialogHeader>
              <DialogTitle>사진 스토리</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="aspect-video relative">
                <img 
                  src={selectedStory.photo} 
                  alt="Story" 
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              <div className="space-y-4">
                {selectedStory.aiStories.map((story) => (
                  <button
                    key={story.id}
                    onClick={() => {
                      // TODO: 투표 기능 구현
                    }}
                    className={cn(
                      "w-full p-4 rounded-lg text-left transition-colors",
                      "flex items-center justify-between",
                      story.id === selectedStory.selectedStoryId
                        ? "bg-green-500/20 border-green-500"
                        : "bg-gray-800/50 hover:bg-gray-800/70"
                    )}
                  >
                    <span>{story.content}</span>
                    <span className="text-sm">
                      {story.votes} 표
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
    <CollapsibleFooter />
    </>
  );
}
