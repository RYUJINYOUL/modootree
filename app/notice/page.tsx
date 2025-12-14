'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Upload, Video, Trash2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { loadSlim } from "tsparticles-slim";
import Particles from "react-tsparticles";
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';

const ADMIN_UID = 'vW1OuC6qMweyOqu73N0558pv4b03';

// Helper function to extract YouTube video ID
const getYouTubeVideoId = (url: string): string | null => {
  // Handle YouTube Shorts URLs
  const shortsRegExp = /(?:youtube\.com\/shorts\/|youtu\.be\/shorts\/)([a-zA-Z0-9_-]{11})/;
  const shortsMatch = url.match(shortsRegExp);
  if (shortsMatch && shortsMatch[1].length === 11) {
    return shortsMatch[1];
  }

  // Handle regular YouTube URLs
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// Particles Component
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
            value: ["#FFB6C1", "#FF69B4", "#FF1493", "#DC143C", "#FFF", "#FFD700", "#FF6347"]
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
            speed: { min: 0.5, max: 2 },
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
              area: 1000
            },
            value: 60
          },
          opacity: {
            animation: {
              enable: true,
              minimumValue: 0.2,
              speed: 1.5,
              sync: false
            },
            random: true,
            value: { min: 0.3, max: 0.8 }
          },
          shape: {
            type: ["heart", "star", "circle", "triangle"],
            options: {
              heart: {
                particles: {
                  size: {
                    value: { min: 8, max: 16 }
                  }
                }
              },
              star: {
                sides: 5,
                particles: {
                  size: {
                    value: { min: 6, max: 12 }
                  }
                }
              }
            }
          },
          size: {
            animation: {
              enable: true,
              minimumValue: 2,
              speed: 3,
              sync: false
            },
            random: true,
            value: { min: 3, max: 8 }
          },
          rotate: {
            animation: {
              enable: true,
              speed: 2,
              sync: false
            },
            direction: "random",
            random: true,
            value: { min: 0, max: 360 }
          }
        },
        detectRetina: true,
        interactivity: {
          events: {
            onHover: {
              enable: true,
              mode: "bubble"
            },
            onClick: {
              enable: true,
              mode: "push"
            }
          },
          modes: {
            bubble: {
              distance: 150,
              duration: 2,
              opacity: 1,
              size: 12
            },
            push: {
              quantity: 3
            }
          }
        }
      }}
    />
  );
};

interface NoticePost {
  id: string;
  title: string;
  content: string;
  createdAt: Date | number;
  youtubeUrl?: string;
  imageUrl?: string;
}

export default function NoticePage() {
  const router = useRouter();
  const currentUser = useSelector((state: any) => state.user.currentUser);
  const isAdmin = currentUser && currentUser.uid === ADMIN_UID;

  const [showModal, setShowModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<NoticePost | null>(null);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostYoutubeUrl, setNewPostYoutubeUrl] = useState('');
  const [newPostImageUrl, setNewPostImageUrl] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [notices, setNotices] = useState<NoticePost[]>([]);
  const [loadingNotices, setLoadingNotices] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // 클라이언트에서만 실행되도록 보장
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Firebase에서 공지사항 불러오기
  useEffect(() => {
    const fetchNotices = async () => {
      if (!isMounted) return;
      
      setLoadingNotices(true);
      try {
        const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedNotices: NoticePost[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title,
          content: doc.data().content,
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          youtubeUrl: doc.data().youtubeUrl || undefined,
          imageUrl: doc.data().imageUrl || undefined,
        }));
        setNotices(fetchedNotices);
      } catch (error) {
        console.error('공지사항 불러오기 실패:', error);
      } finally {
        setLoadingNotices(false);
      }
    };

    fetchNotices();
  }, [isMounted]);

  // 공지사항 삭제 함수
  const handleDeletePost = async (postId: string) => {
    try {
      await deleteDoc(doc(db, 'notices', postId));
      setNotices(prev => prev.filter(post => post.id !== postId));
      console.log('Document successfully deleted!', postId);
    } catch (error) {
      console.error('Error removing document: ', error);
      alert('공지사항 삭제에 실패했습니다. 나중에 다시 시도해주세요.');
    } finally {
      setShowDeleteModal(false);
      setPostToDelete(null);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-300 via-pink-300 to-fuchsia-300 text-white/90 relative overflow-hidden">
      {/* 파티클 배경 효과 */}
      <div className="absolute inset-0 z-0">
        <ParticlesComponent />
      </div>
      
      {/* Container with proper margins for PC */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 py-4 pb-16 relative z-10">
        <div className="flex items-center justify-between mb-6 mt-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="bg-red-600 hover:bg-red-700 text-white shadow-lg transition-all hover:scale-105"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">공지사항</h1>
          </div>
          {isAdmin && (
            <Button
              variant="default"
              size="sm"
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg transition-all hover:scale-105 flex items-center gap-1"
              onClick={() => setShowWriteModal(true)}
            >
              <Plus className="h-4 w-4" />
              글쓰기
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-8">
          {loadingNotices ? (
            <div className="col-span-full text-center text-white/80 mt-20">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
              <p className="mt-4">공지사항을 불러오는 중...</p>
            </div>
          ) : notices.length === 0 ? (
            <div className="col-span-full text-center text-white/80 mt-20">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8">
                <Video className="w-16 h-16 text-white/60 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">공지사항이 없습니다</h3>
                <p className="text-white/70">새로운 소식이 있으면 알려드릴게요!</p>
              </div>
            </div>
          ) : (
            notices.map((post) => (
            <div 
              key={post.id}
              className="bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden hover:bg-white/20 transition-all duration-300 relative group hover:scale-105 hover:shadow-xl"
            >
              {/* Delete Button for Admin */}
              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPostToDelete(post.id);
                    setShowDeleteModal(true);
                  }}
                  className="absolute top-3 right-3 z-10 w-8 h-8 bg-red-500/80 hover:bg-red-500 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                  title="공지사항 삭제"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              )}
              
              <div 
                className="cursor-pointer"
                onClick={() => {
                  setSelectedPost(post);
                  setShowModal(true);
                }}
              >
                {/* Media Content - Vertical aspect ratio for shorts */}
                <div className="aspect-[9/16] bg-white/5 backdrop-blur-sm flex items-center justify-center">
                  {post.youtubeUrl ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${getYouTubeVideoId(post.youtubeUrl)}`}
                      className="w-full h-full"
                      frameBorder="0"
                      allowFullScreen
                    />
                  ) : post.imageUrl ? (
                    <Image
                      src={post.imageUrl}
                      alt={post.title}
                      width={300}
                      height={533}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-white/60 flex flex-col items-center">
                      <Video className="w-8 h-8 mb-2" />
                      <span className="text-sm">미디어 없음</span>
                    </div>
                  )}
                </div>
                
                {/* Title and Content at Bottom */}
                <div className="p-3">
                  <h2 className="text-sm font-semibold mb-1 line-clamp-1 text-white group-hover:text-pink-200 transition-colors">{post.title}</h2>
                  <p className="text-xs text-white/70 line-clamp-2">{post.content}</p>
                  <p className="text-xs text-white/50 mt-1" suppressHydrationWarning>
                    {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))
          )}
        </div>
      </div>
      
      {/* Post Detail Modal */}
      {showModal && selectedPost && (
        <div className="fixed inset-0 bg-pink-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto relative border border-pink-200 shadow-2xl">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-2xl transition-colors"
            >
              &times;
            </button>
            
            <h2 className="text-2xl font-bold mb-4 text-gray-800">{selectedPost.title}</h2>
            
            {/* Media Content in Modal */}
            {(selectedPost.youtubeUrl || selectedPost.imageUrl) && (
              <div className="mb-6 flex justify-center">
                {selectedPost.youtubeUrl ? (
                  <div className="aspect-[9/16] w-full max-w-md">
                    <iframe
                      src={`https://www.youtube.com/embed/${getYouTubeVideoId(selectedPost.youtubeUrl)}`}
                      className="w-full h-full rounded-lg"
                      frameBorder="0"
                      allowFullScreen
                    />
                  </div>
                ) : selectedPost.imageUrl ? (
                  <div className="relative max-w-md">
                    <Image
                      src={selectedPost.imageUrl}
                      alt={selectedPost.title}
                      width={400}
                      height={711}
                      className="w-full h-auto rounded-lg"
                    />
                  </div>
                ) : null}
              </div>
            )}
            
            <p className="text-gray-700 whitespace-pre-wrap mb-4">{selectedPost.content}</p>
            <p className="text-sm text-gray-500 text-right" suppressHydrationWarning>
              {new Date(selectedPost.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Write Post Modal */}
      {isAdmin && showWriteModal && (
        <div className="fixed inset-0 bg-pink-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative border border-pink-200 shadow-2xl">
            <button
              onClick={() => setShowWriteModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-2xl transition-colors"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">새 공지사항 작성</h2>
            
            <input
              type="text"
              placeholder="제목"
              className="w-full p-2 mb-4 bg-white border border-pink-200 rounded text-gray-800 placeholder-gray-500 focus:border-pink-400 focus:ring-2 focus:ring-pink-200"
              value={newPostTitle}
              onChange={(e) => setNewPostTitle(e.target.value)}
            />
            
            <textarea
              placeholder="내용"
              rows={6}
              className="w-full p-2 mb-4 bg-white border border-pink-200 rounded text-gray-800 placeholder-gray-500 focus:border-pink-400 focus:ring-2 focus:ring-pink-200"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
            ></textarea>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700">
                <Video className="inline w-4 h-4 mr-1" />
                YouTube URL (선택사항)
              </label>
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full p-2 bg-white border border-pink-200 rounded text-gray-800 placeholder-gray-500 focus:border-pink-400 focus:ring-2 focus:ring-pink-200"
                value={newPostYoutubeUrl}
                onChange={(e) => setNewPostYoutubeUrl(e.target.value)}
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700">
                <Upload className="inline w-4 h-4 mr-1" />
                이미지 URL (선택사항)
              </label>
              <input
                type="url"
                placeholder="https://example.com/image.jpg"
                className="w-full p-2 bg-white border border-pink-200 rounded text-gray-800 placeholder-gray-500 focus:border-pink-400 focus:ring-2 focus:ring-pink-200"
                value={newPostImageUrl}
                onChange={(e) => setNewPostImageUrl(e.target.value)}
              />
            </div>
            <Button
              onClick={async () => {
                if (!newPostTitle.trim() || !newPostContent.trim()) {
                  alert('제목과 내용을 모두 입력해주세요.');
                  return;
                }

                try {
                  const docRef = await addDoc(collection(db, 'notices'), {
                    title: newPostTitle,
                    content: newPostContent,
                    youtubeUrl: newPostYoutubeUrl || null,
                    imageUrl: newPostImageUrl || null,
                    createdAt: serverTimestamp(),
                  });
                  console.log('Document written with ID: ', docRef.id);

                  // Add to local state for immediate display
                  const newPost: NoticePost = {
                    id: docRef.id,
                    title: newPostTitle,
                    content: newPostContent,
                    createdAt: new Date(),
                    youtubeUrl: newPostYoutubeUrl || undefined,
                    imageUrl: newPostImageUrl || undefined,
                  };
                  
                  setNotices(prev => [newPost, ...prev]);

                  setShowWriteModal(false);
                  setNewPostTitle('');
                  setNewPostContent('');
                  setNewPostYoutubeUrl('');
                  setNewPostImageUrl('');
                } catch (e) {
                  console.error('Error adding document: ', e);
                  alert('공지사항 저장에 실패했습니다. 나중에 다시 시도해주세요.');
                }
              }}
              className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-lg transition-all hover:scale-105"
            >
              저장
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && postToDelete && (
        <div className="fixed inset-0 bg-pink-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-xl p-6 w-full max-w-md border border-pink-200 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-gray-800">공지사항 삭제</h3>
            <p className="text-gray-700 mb-6">이 공지사항을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => {
                  setShowDeleteModal(false);
                  setPostToDelete(null);
                }}
                variant="outline"
                className="text-gray-600 border-gray-300 hover:bg-gray-50"
              >
                취소
              </Button>
              <Button
                onClick={() => handleDeletePost(postToDelete)}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg transition-all hover:scale-105"
              >
                삭제
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
