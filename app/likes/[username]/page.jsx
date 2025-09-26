'use client';

import { useEffect, useState, useCallback } from 'react';
import { db } from '../../../firebase';
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  updateDoc,
  doc,
  increment,
  getDoc,
  deleteDoc,
  addDoc,
  where,
  onSnapshot,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { getStorage, ref, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import Link from 'next/link';
import CategoryCarousel from '../../components/CategoryCarousel';
import { Button } from '@/components/ui/button';
import { useSelector } from 'react-redux';
import { Trash2, MessageCircle, Edit, Send, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import LoginOutButton from '@/components/ui/LoginOutButton';
import Header from '@/components/Header';
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";

const ParticlesComponent = () => {
  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  return (
    <Particles
      className="absolute inset-0"
      init={particlesInit}
      options={{
        background: {
          opacity: 0
        },
        particles: {
          color: {
            value: [
              "#64B5F6",  // 하늘색
              "#81C784",  // 연두색
              "#9575CD",  // 보라색
              "#4FC3F7",  // 밝은 파랑
              "#4DB6AC",  // 청록색
              "#7986CB"   // 남색
            ]
          },
          move: {
            direction: "none",
            enable: true,
            outModes: {
              default: "bounce"
            },
            random: false,
            speed: 2,
            straight: false
          },
          number: {
            density: {
              enable: true,
              area: 800
            },
            value: 30
          },
          opacity: {
            value: 0.6,
            animation: {
              enable: true,
              speed: 1,
              minimumValue: 0.2
            }
          },
          size: {
            value: { min: 5, max: 10 },
            animation: {
              enable: true,
              speed: 2,
              minimumValue: 3
            }
          },
          links: {
            color: "#ffffff",
            distance: 150,
            enable: true,
            opacity: 0.3,
            width: 1
          }
        }
      }}
    />
  );
};

const CATEGORIES = ['일상', '감정', '관계', '목표/취미', '특별한 날', '기타/자유'];
// 관리자 UID 목록 추가
const ADMIN_UIDS = ['dalkomme@gmail.com'];

const REACTIONS = [
  { 
    id: 'awesome', 
    text: '멋져요',
    bgColor: 'bg-blue-500/10 hover:bg-blue-500/20',
    textColor: 'text-blue-200',
    countBgColor: 'bg-blue-500/20'
  },
  { 
    id: 'cheer', 
    text: '힘내세요',
    bgColor: 'bg-green-500/10 hover:bg-green-500/20',
    textColor: 'text-green-200',
    countBgColor: 'bg-green-500/20'
  },
  { 
    id: 'sad', 
    text: '슬퍼요',
    bgColor: 'bg-purple-500/10 hover:bg-purple-500/20',
    textColor: 'text-purple-200',
    countBgColor: 'bg-purple-500/20'
  },
  { 
    id: 'same', 
    text: '저도그래요',
    bgColor: 'bg-rose-500/10 hover:bg-rose-500/20',
    textColor: 'text-rose-200',
    countBgColor: 'bg-rose-500/20'
  },
];

// 이메일 마스킹 함수 추가
const maskEmail = (email) => {
  if (!email) return '';
  if (!email.includes('@')) return email;
  
  const [username, domain] = email.split('@');
  const domainParts = domain.split('.');
  const lastPart = domainParts[domainParts.length - 1];
  
  if (lastPart.length >= 2) {
    domainParts[domainParts.length - 1] = lastPart.slice(0, -2) + '**';
  }
  
  return `${username}@${domainParts.join('.')}`;
};

// 글자 수 제한 상수 추가
const CONTENT_PREVIEW_LENGTH = 100;

export default function LikesPage() {
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [isMobile, setIsMobile] = useState(false);
  const [reacting, setReacting] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedLike, setSelectedLike] = useState(null);
  const { currentUser } = useSelector((state) => state.user) || {};
  const auth = getAuth();
  
  // 답글 관련 상태 추가
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [showComments, setShowComments] = useState({});
  const [selectedPost, setSelectedPost] = useState(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [userReactions, setUserReactions] = useState({});  // 사용자가 누른 공감 버튼 추적
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [currentImageSet, setCurrentImageSet] = useState([]);
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [writeForm, setWriteForm] = useState({
    title: '',
    content: '',
    images: [],
    pendingImages: [],
    category: '일상'  // 기본 카테고리
  });
  const [isSaving, setIsSaving] = useState(false);

  // 관리자 UID 목록
  const isAdmin = currentUser?.uid && ADMIN_UIDS.includes(currentUser.uid);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
        const likesRef = collection(db, 'likes');
        const q = query(likesRef, orderBy('createdAt', 'desc'));
        
    // 실시간 업데이트를 위한 리스너 설정
    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const likesData = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          likesData.push({
            id: doc.id,
            ...data,
            currentImageIndex: 0,  // 이미지 캐러셀 인덱스 초기화
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            reactions: data.reactions || {
              awesome: 0,
              cheer: 0,
              sad: 0,
              same: 0
            }
          });
        });
        
        setLikes(likesData);
        setLoading(false);
      } catch (error) {
        console.error('공감 목록 가져오기 실패:', error);
      }
    });

    // 컴포넌트 언마운트 시 리스너 해제
    return () => unsubscribe();
  }, []);

  // 실시간 업데이트를 위한 useEffect 추가
  useEffect(() => {
    if (!currentUser) return;

    const likesRef = collection(db, 'likes');
    const unsubscribe = onSnapshot(likesRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "modified") {
          const updatedData = change.doc.data();
          setLikes(prevLikes => 
            prevLikes.map(like => 
              like.id === change.doc.id 
                ? {
                    ...like,
                    reactions: updatedData.reactions || like.reactions,
                    viewCount: updatedData.viewCount || like.viewCount
                  }
                : like
            )
          );
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser]);

  // 사용자의 이전 공감 기록 불러오기
  useEffect(() => {
    if (!currentUser) return;

    const loadUserReactions = async () => {
      try {
        const q = query(
          collection(db, 'userReactions'),
          where('userId', '==', currentUser.uid)
        );
        const snapshot = await getDocs(q);
        const reactions = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          reactions[`${data.postId}:${data.reactionId}`] = true;
        });
        setUserReactions(reactions);
      } catch (error) {
        console.error('사용자 공감 기록 로드 실패:', error);
      }
    };

    loadUserReactions();
  }, [currentUser]);

  // 공감 버튼 핸들러 수정
  const handleReaction = async (postId, reactionId) => {
    if (!currentUser) {
      alert('공감하려면 로그인이 필요합니다.');
      return;
    }

    const reactionKey = `${postId}:${reactionId}`;
    if (reacting === reactionKey) return;

    if (userReactions[reactionKey]) {
      alert('이미 공감하셨습니다.');
      return;
    }

    setReacting(reactionKey);
    try {
      const postRef = doc(db, 'likes', postId);
      
      // 사용자별 공감 기록 저장
      const userReactionRef = doc(db, 'userReactions', `${currentUser.uid}_${postId}_${reactionId}`);
      await setDoc(userReactionRef, {
        userId: currentUser.uid,
        postId,
        reactionId,
        createdAt: new Date()
      });
      
      await updateDoc(postRef, {
        [`reactions.${reactionId}`]: increment(1)
      });

      setUserReactions(prev => ({
        ...prev,
        [reactionKey]: true
      }));

    } catch (error) {
      console.error('공감 반응 저장 실패:', error);
      alert('공감 저장에 실패했습니다.');
    } finally {
      setReacting(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedLike) return;

    try {
      // 이미지가 있는 경우 Storage에서도 삭제
      if (selectedLike.images && selectedLike.images.length > 0) {
        const storage = getStorage();
        const deletePromises = selectedLike.images.map(async (imageUrl) => {
          try {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef);
          } catch (error) {
            console.error('이미지 삭제 실패:', error);
          }
        });
        await Promise.all(deletePromises);
      }

      await deleteDoc(doc(db, 'likes', selectedLike.id));
      setLikes(prevLikes => prevLikes.filter(like => like.id !== selectedLike.id));
      setDeleteConfirmOpen(false);
      setSelectedLike(null);
    } catch (error) {
      console.error('공감 삭제 실패:', error);
      alert('공감 삭제에 실패했습니다.');
    }
  };

  const canDelete = (like) => {
    if (!currentUser) return false;
    return ADMIN_UIDS.includes(currentUser.email) || like.userId === currentUser.uid;
  };

  // 현재 사용자 정보를 가져오는 함수
  const getCurrentUserInfo = () => {
    const user = auth.currentUser || currentUser;
    
    if (!user) return null;

    // providerData에서 첫 번째 항목 가져오기 (소셜 로그인 정보)
    const providerData = user.providerData && user.providerData[0];
    
    return {
      uid: user.uid,
      email: user.email || providerData?.email || '',
      displayName: user.displayName || providerData?.displayName || '',
      photoURL: user.photoURL || providerData?.photoURL || ''
    };
  };

  // 답글 관련 함수들 수정
  const handleAddComment = async (likeId) => {
    const userInfo = getCurrentUserInfo();

    if (!userInfo?.uid) {
      alert('답글을 작성하려면 로그인이 필요합니다.');
      return;
    }

    if (!newComment.trim()) {
      return;
    }
    
    try {
      // 사용자 정보 처리
      const commentUserInfo = {
        userId: userInfo.uid,
        userName: userInfo.displayName || (userInfo.email ? userInfo.email.split('@')[0] : ''),
        userEmail: userInfo.email || ''
      };

      const commentData = {
        likeId,
        content: newComment.trim(),
        userId: commentUserInfo.userId,
        userName: commentUserInfo.userName,
        userEmail: commentUserInfo.userEmail,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'comments'), commentData);
      setNewComment('');
    } catch (error) {
      console.error('답글 작성 실패:', error);
      alert('답글 작성에 실패했습니다.');
    }
  };

  const handleEditComment = async (comment) => {
    if (!currentUser) return;
    if (comment.userId !== currentUser.uid && !ADMIN_UIDS.includes(currentUser.email)) return;

    try {
      await updateDoc(doc(db, 'comments', comment.id), {
        content: editCommentText,
        updatedAt: new Date(),
      });
      setEditingComment(null);
      setEditCommentText('');
    } catch (error) {
      console.error('답글 수정 실패:', error);
      alert('답글 수정에 실패했습니다.');
    }
  };

  const handleDeleteComment = async (comment) => {
    if (!currentUser) return;
    if (comment.userId !== currentUser.uid && !ADMIN_UIDS.includes(currentUser.email)) return;
    
    if (!window.confirm('답글을 삭제하시겠습니까?')) return;

    try {
      await deleteDoc(doc(db, 'comments', comment.id));
    } catch (error) {
      console.error('답글 삭제 실패:', error);
      alert('답글 삭제에 실패했습니다.');
    }
  };

  // 답글 실시간 업데이트를 위한 useEffect 추가
  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'comments'), orderBy('createdAt', 'asc')),
      (snapshot) => {
        const newComments = {};
        snapshot.docs.forEach((doc) => {
          const comment = { id: doc.id, ...doc.data() };
          if (!newComments[comment.likeId]) {
            newComments[comment.likeId] = [];
          }
          newComments[comment.likeId].push(comment);
        });
        setComments(newComments);
      }
    );

    return () => unsubscribe();
  }, []);

  // 조회수 증가 함수
  const incrementViewCount = async (postId) => {
    try {
      const postRef = doc(db, 'likes', postId);
      await updateDoc(postRef, {
        viewCount: increment(1)
      });
      
      // 로컬 상태 업데이트
      setLikes(prevLikes => 
        prevLikes.map(like => 
          like.id === postId 
            ? { ...like, viewCount: (like.viewCount || 0) + 1 }
            : like
        )
      );
    } catch (error) {
      console.error('조회수 업데이트 실패:', error);
    }
  };

  // 게시글 클릭 핸들러
  const handlePostClick = (post) => {
    setSelectedPost(post);
    setIsPostModalOpen(true);
    incrementViewCount(post.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filteredLikes = selectedCategory === '전체' 
    ? likes 
    : likes.filter(like => like.category === selectedCategory);

  // 사용자 정보 표시 함수 수정
  const getUserDisplayName = (comment) => {
    // 기존 데이터 호환성 (userEmail이 username으로 사용된 경우)
    if (comment.userEmail && !comment.userEmail.includes('@')) {
      return comment.userEmail;
    }

    // userName이 있는 경우
    if (comment.userName && comment.userName.trim() !== '') {
      return comment.userName;
    }

    // userEmail이 있는 경우
    if (comment.userEmail && comment.userEmail.includes('@')) {
      return comment.userEmail.split('@')[0];
    }

    // userId가 있고 현재 사용자인 경우
    const userInfo = getCurrentUserInfo();
    if (userInfo && comment.userId === userInfo.uid) {
      return userInfo.displayName || userInfo.email?.split('@')[0] || '사용자';
    }

    return '알 수 없음';
  };

  // 답글 렌더링 부분 수정
  const renderComment = (comment) => {
    return (
      <div key={comment.id} className="flex items-start space-x-2 p-2 rounded-lg bg-blue-500/10">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">
              {getUserDisplayName(comment)}
            </span>
            <span className="text-xs text-white/50">
              {(() => {
                try {
                  if (!comment.createdAt) return '시간 정보 없음';
                  const date = comment.createdAt.toDate ? comment.createdAt.toDate() : new Date(comment.createdAt);
                  return date.toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  });
                } catch (error) {
                  console.error('날짜 변환 오류:', error);
                  return '시간 정보 오류';
                }
              })()}
            </span>
          </div>
          {editingComment?.id === comment.id ? (
            <div className="mt-1 flex items-center gap-2">
              <input
                type="text"
                value={editCommentText}
                onChange={(e) => setEditCommentText(e.target.value)}
                className="flex-1 bg-blue-500/20 rounded px-2 py-1 text-white"
              />
              <button
                onClick={() => handleEditComment(comment)}
                className="text-sm text-blue-300 hover:text-blue-400"
              >
                저장
              </button>
              <button
                onClick={() => {
                  setEditingComment(null);
                  setEditCommentText('');
                }}
                className="text-sm text-red-300 hover:text-red-400"
              >
                취소
              </button>
            </div>
          ) : (
            <p className="mt-1 text-white/90">{comment.content}</p>
          )}
        </div>
        {(currentUser?.uid === comment.userId || ADMIN_UIDS.includes(currentUser?.email)) && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setEditingComment(comment);
                setEditCommentText(comment.content);
              }}
              className="p-1 text-blue-300 hover:text-blue-400"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteComment(comment)}
              className="p-1 text-red-300 hover:text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  };

  // 반응 버튼 컴포넌트
  const ReactionButton = ({ reaction, postId }) => {
    const reactionKey = `${postId}:${reaction.id}`;
    const isReacted = userReactions[reactionKey];
    const isReacting = reacting === reactionKey;

    return (
      <Button
        onClick={() => handleReaction(postId, reaction.id)}
        disabled={!currentUser || isReacting}
        variant="ghost"
        className={`flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg text-sm transition-colors
          ${!currentUser 
            ? 'opacity-50 cursor-not-allowed' 
            : isReacting
              ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
              : isReacted
                ? `${reaction.bgColor} ${reaction.textColor} ring-2 ring-blue-500`
                : `${reaction.bgColor} ${reaction.textColor}`
          }`}
      >
        <span>{reaction.text}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${reaction.countBgColor} relative`}>
          {likes.find(l => l.id === postId)?.reactions[reaction.id] || 0}
          {isReacting && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
          )}
        </span>
      </Button>
    );
  };

  return (
    <>
      <LoginOutButton />
      <Header />
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-gray-900 text-white/90 relative">
        <ParticlesComponent />
        <div className="container mx-auto px-4 py-10 relative z-10">
        
          {/* 제목과 작성 버튼 */}
          <div className="relative flex items-center justify-center mb-6">
            <h1 className="text-2xl font-bold text-white text-center">
            공감 한조각
          </h1>
            {currentUser?.uid && (
              <div className="absolute right-0">
                <Button
                  onClick={() => setShowWriteForm(true)}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  글쓰기
                </Button>
              </div>
            )}
          </div>

          {/* 작성 모달 */}
          <Dialog open={showWriteForm} onOpenChange={setShowWriteForm}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>공감 글 작성</DialogTitle>
              </DialogHeader>
                <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">카테고리</label>
                  <select
                    value={writeForm.category}
                    onChange={(e) => setWriteForm({ ...writeForm, category: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">제목</label>
                  <input
                    type="text"
                    value={writeForm.title}
                    onChange={(e) => setWriteForm({ ...writeForm, title: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="제목을 입력하세요"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">내용</label>
                  <textarea
                    value={writeForm.content}
                    onChange={(e) => setWriteForm({ ...writeForm, content: e.target.value })}
                    className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="내용을 입력하세요"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">사진</label>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById('image-upload').click()}
                      >
                        사진 선택
                      </Button>
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          const previewUrls = files.map(file => URL.createObjectURL(file));
                          setWriteForm(prev => ({
                            ...prev,
                            images: [...prev.images, ...previewUrls],
                            pendingImages: [...(prev.pendingImages || []), ...files]
                          }));
                        }}
                        className="hidden"
                      />
                    </div>

                    {/* 이미지 미리보기 */}
                    {writeForm.images.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {writeForm.images.map((url, index) => (
                          <div key={index} className="aspect-square relative group">
                            <img
                              src={url}
                              alt={`업로드 이미지 ${index + 1}`}
                              className="w-full h-full object-cover rounded-lg"
                            />
                            <button
                              onClick={() => {
                                setWriteForm(prev => ({
                                  ...prev,
                                  images: prev.images.filter((_, i) => i !== index),
                                  pendingImages: prev.pendingImages.filter((_, i) => i !== index)
                                }));
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
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowWriteForm(false)}>
                  취소
                </Button>
                <Button
                  disabled={isSaving || !writeForm.title.trim() || !writeForm.content.trim()}
                  onClick={async () => {
                    if (!currentUser) {
                      alert('로그인이 필요합니다.');
                      return;
                    }

                    setIsSaving(true);
                    try {
                      const storage = getStorage();
                      const uploadedUrls = [];

                      // 이미지 업로드
                      if (writeForm.pendingImages?.length > 0) {
                        for (const file of writeForm.pendingImages) {
                          const fileRef = ref(storage, `likes/${currentUser.uid}/${Date.now()}_${file.name}`);
                          await uploadBytes(fileRef, file);
                          const url = await getDownloadURL(fileRef);
                          uploadedUrls.push(url);
                        }
                      }

                      // likes 컬렉션에 저장
                      const likeData = {
                        title: writeForm.title.trim(),
                        content: writeForm.content.trim(),
                        images: uploadedUrls,
                        createdAt: serverTimestamp(),  // 서버 타임스탬프 사용
                        userId: currentUser.uid,
                        category: writeForm.category,  // 선택된 카테고리 사용
                        author: {
                          uid: currentUser.uid,
                          displayName: currentUser.displayName || currentUser.email?.split('@')[0],
                          email: currentUser.email,
                          photoURL: currentUser.photoURL
                        },
                        reactions: {
                          awesome: 0,
                          cheer: 0,
                          sad: 0,
                          same: 0
                        },
                        viewCount: 0
                      };

                      await addDoc(collection(db, 'likes'), likeData);
                      setShowWriteForm(false);
                      setWriteForm({
                        title: '',
                        content: '',
                        images: [],
                        pendingImages: [],
                        category: '일상'  // 기본값으로 리셋
                      });
                    } catch (error) {
                      console.error('저장 중 오류:', error);
                      alert('저장 중 오류가 발생했습니다.');
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                >
                  {isSaving ? '저장 중...' : '저장'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          

          {/* 카테고리 필터 */}
          {isMobile ? (
            <div className="mb-8">
              <CategoryCarousel
                categories={CATEGORIES}
                selectedCategory={selectedCategory}
                onSelect={setSelectedCategory}
              />
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 mb-8 justify-center">
              <button
                onClick={() => setSelectedCategory('전체')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedCategory === '전체'
                    ? 'bg-white/20 text-white'
                    : 'bg-black/50 text-white/70 hover:bg-white/10'
                }`}
              >
                전체
              </button>
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedCategory === category
                      ? 'bg-white/20 text-white'
                      : 'bg-black/50 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          )}

          {filteredLikes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">아직 공감한 조각이 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredLikes.map((like) => (
                <div 
                  key={like.id} 
                  className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700/80 transition-colors cursor-pointer"
                  onClick={() => handlePostClick(like)}
                >
                  {/* 이미지 섹션을 상단으로 이동 */}
                  {like.images && like.images.length > 0 && (
                    <div className="mb-4">
                      <div className="relative aspect-square group">
                        {/* 이미지 캐러셀 */}
                        <div className="relative w-full h-full rounded-lg overflow-hidden">
                          {like.images.map((imageUrl, index) => (
                            <div
                              key={index}
                              className={`absolute inset-0 transition-opacity duration-300
                                ${like.currentImageIndex === index ? 'opacity-100' : 'opacity-0'}`}
                            >
                              <img
                                src={imageUrl}
                                alt={`${like.title || ''} ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>

                        {/* 이미지가 2장 이상일 때만 네비게이션 표시 */}
                        {like.images.length > 1 && (
                          <>
                            {/* 좌우 버튼 */}
                            <button
                              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white p-1 rounded-full 
                                opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                                const newIndex = ((like.currentImageIndex || 0) - 1 + like.images.length) % like.images.length;
                                setLikes(prev => prev.map(p => 
                                  p.id === like.id ? { ...p, currentImageIndex: newIndex } : p
                                ));
                              }}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white p-1 rounded-full 
                                opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                const newIndex = ((like.currentImageIndex || 0) + 1) % like.images.length;
                                setLikes(prev => prev.map(p => 
                                  p.id === like.id ? { ...p, currentImageIndex: newIndex } : p
                                ));
                              }}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>

                            {/* 하단 인디케이터 */}
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1">
                              {like.images.map((_, index) => (
                                <button
                                  key={index}
                                  className={`w-1.5 h-1.5 rounded-full transition-colors
                                    ${like.currentImageIndex === index ? 'bg-white' : 'bg-white/50'}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLikes(prev => prev.map(p => 
                                      p.id === like.id ? { ...p, currentImageIndex: index } : p
                                    ));
                                  }}
                                />
                              ))}
                          </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mb-3 flex justify-between items-center">
                    <span className="text-sm text-gray-400">{like.category}</span>
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500">{like.viewCount || 0}</span>
                      <span className="text-xs text-gray-500">
                        {(() => {
                          try {
                            if (!like.createdAt) return '시간 정보 없음';
                            const date = like.createdAt.toDate ? like.createdAt.toDate() : new Date(like.createdAt);
                            return date.toLocaleString('ko-KR', {
                              year: '2-digit',
                              month: '2-digit',
                              day: '2-digit'
                            });
                          } catch (error) {
                            console.error('날짜 변환 오류:', error);
                            return '시간 정보 오류';
                          }
                        })()}
                      </span>
                    </div>
                  </div>
                  
                  {/* 글자 수 제한된 내용 */}
                  <p className="text-gray-300 text-sm whitespace-pre-wrap mb-4">
                    {(like.content || '').length > CONTENT_PREVIEW_LENGTH
                      ? `${(like.content || '').slice(0, CONTENT_PREVIEW_LENGTH)}...`
                      : like.content || ''}
                  </p>

                  {/* 하단 정보 (답글 수, 공감 수) */}
                  <div className="flex items-center gap-4 text-gray-400">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-sm">{comments[like.id]?.length || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {REACTIONS.map((reaction) => (
                        <div
                          key={reaction.id}
                          className={`px-2 py-1 rounded-full ${reaction.countBgColor} ${
                            userReactions[`${like.id}:${reaction.id}`] ? 'ring-2 ring-blue-500' : ''
                          }`}
                        >
                          <span className="text-sm">
                            {like.reactions[reaction.id] || 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 게시글 상세 모달 */}
          <Dialog open={isPostModalOpen} onOpenChange={(open) => {
            if (!open) {
              setIsPostModalOpen(false);
              setSelectedPost(null);
            }
          }}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto bg-gray-900 border-gray-800">
              {selectedPost && (
                <>
                  <DialogHeader className="border-b border-gray-800 pb-4">
                    <DialogTitle className="text-lg font-semibold text-white mb-4">
                      공감 한 조각
                    </DialogTitle>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">{selectedPost.category}</span>
                        <span className="text-xs text-gray-500">
                          {selectedPost.createdAt?.toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-400">
                          {selectedPost.viewCount || 0}
                        </span>
                        {canDelete(selectedPost) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLike(selectedPost);
                              setDeleteConfirmOpen(true);
                            }}
                            className="text-red-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="mt-4">
                    {/* 이미지 갤러리를 상단으로 이동 */}
                    {selectedPost.images && selectedPost.images.length > 0 && (
                      <div className="relative aspect-video group mb-6">
                        {/* 이미지 캐러셀 */}
                        <div className="relative w-full h-full rounded-lg overflow-hidden">
                        {selectedPost.images.map((imageUrl, index) => (
                            <div
                              key={index}
                              className={`absolute inset-0 transition-opacity duration-300
                                ${selectedPost.currentImageIndex === index ? 'opacity-100' : 'opacity-0'}`}
                            >
                            <img
                              src={imageUrl}
                                alt={`${selectedPost.title || ''} ${index + 1}`}
                                className="w-full h-full object-cover cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImage(imageUrl);
                                setCurrentImageSet(selectedPost.images.map(url => ({
                                  url,
                                  title: selectedPost.category,
                                  date: selectedPost.createdAt
                                })));
                                setShowImageViewer(true);
                              }}
                            />
                          </div>
                        ))}
                        </div>

                        {/* 이미지가 2장 이상일 때만 네비게이션 표시 */}
                        {selectedPost.images.length > 1 && (
                          <>
                            {/* 좌우 버튼 */}
                            <button
                              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 text-white p-2 rounded-full 
                                opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                const newIndex = ((selectedPost.currentImageIndex || 0) - 1 + selectedPost.images.length) % selectedPost.images.length;
                                setSelectedPost(prev => ({ ...prev, currentImageIndex: newIndex }));
                              }}
                            >
                              <ChevronLeft className="h-6 w-6" />
                            </button>
                            <button
                              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 text-white p-2 rounded-full 
                                opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                const newIndex = ((selectedPost.currentImageIndex || 0) + 1) % selectedPost.images.length;
                                setSelectedPost(prev => ({ ...prev, currentImageIndex: newIndex }));
                              }}
                            >
                              <ChevronRight className="h-6 w-6" />
                            </button>

                            {/* 하단 인디케이터 */}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                              {selectedPost.images.map((_, index) => (
                                <button
                                  key={index}
                                  className={`w-2 h-2 rounded-full transition-colors
                                    ${selectedPost.currentImageIndex === index ? 'bg-white' : 'bg-white/50'}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPost(prev => ({ ...prev, currentImageIndex: index }));
                                  }}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    <p className="text-gray-300 whitespace-pre-wrap mb-6">{selectedPost.content || ''}</p>

                    {/* AI 답변 표시 */}
                    {selectedPost.aiResponse && (
                      <div className="bg-violet-500/10 p-4 rounded-lg mb-6">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                              <span className="text-sm font-medium text-violet-200">AI</span>
                            </div>
                          </div>
                          <div className="flex-1">
                        <p className="text-violet-100 whitespace-pre-wrap break-words min-h-[50px] overflow-y-auto max-h-[500px]">
                          {selectedPost.aiResponse}
                        </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* AI 답변 생성 버튼 */}
                    {currentUser?.uid && !selectedPost.aiResponse && (
                      <div className="mb-6">
                        <Button
                          onClick={async () => {
                            try {
                              // AI 답변 생성 버튼 비활성화
                              const button = event.target;
                              button.disabled = true;
                              button.textContent = 'AI 답변 생성 중...';

                              // AI 답변 생성
                              const response = await fetch('/api/ai-response', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ content: selectedPost.content })
                              });

                              if (response.ok) {
                                const data = await response.json();
                                
                                // likes 컬렉션에 AI 답변 저장
                                await setDoc(doc(db, 'likes', selectedPost.id), {
                                  aiResponse: data.response
                                }, { merge: true });

                                // 현재 선택된 게시글의 상태 업데이트
                                setSelectedPost(prev => ({
                                  ...prev,
                                  aiResponse: data.response
                                }));

                                // likes 배열에서도 해당 게시글 업데이트
                                setLikes(prevLikes => 
                                  prevLikes.map(like => 
                                    like.id === selectedPost.id 
                                      ? { ...like, aiResponse: data.response }
                                      : like
                                  )
                                );
                              }
                            } catch (error) {
                              console.error('AI 답변 생성 중 오류:', error);
                              alert('AI 답변 생성에 실패했습니다.');
                            } finally {
                              // 버튼 상태 복원
                              const button = event.target;
                              button.disabled = false;
                              button.textContent = 'AI 답변 생성';
                            }
                          }}
                          className="w-full bg-violet-500 hover:bg-violet-600 text-white"
                        >
                          AI 답변 생성
                        </Button>
                      </div>
                    )}

                    {/* 반응 버튼 */}
                    <div className="grid grid-cols-2 gap-2 mb-6">
                    {REACTIONS.map((reaction) => (
                        <ReactionButton
                        key={reaction.id}
                          reaction={reaction}
                          postId={selectedPost.id}
                        />
                    ))}
                    </div>

                    {/* 답글 섹션 */}
                    <div className="border-t border-gray-800 pt-4">
                      <div className="space-y-3">
                        {comments[selectedPost.id]?.map(renderComment)}

                        {currentUser?.uid ? (
                          <div className="flex items-center gap-2 mt-4">
                            <input
                              type="text"
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="답글을 입력하세요"
                              className="flex-1 bg-gray-800 rounded px-3 py-1.5 text-sm placeholder-gray-400 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              className="h-8 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm flex items-center gap-1"
                              onClick={() => handleAddComment(selectedPost.id)}
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">답글을 작성하려면 로그인이 필요합니다.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
          )}
            </DialogContent>
          </Dialog>

        {/* 삭제 확인 다이얼로그 */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent 
            className="sm:max-w-[425px]"
            aria-describedby="delete-dialog-description"
          >
            <DialogHeader>
              <DialogTitle>공감 삭제</DialogTitle>
              <DialogDescription id="delete-dialog-description">
                이 공감을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
              >
                삭제
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 이미지 뷰어 모달 */}
        <Dialog open={showImageViewer} onOpenChange={setShowImageViewer}>
          <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-0 bg-black/90">
            <DialogHeader className="sr-only">
              <DialogTitle>이미지 상세보기</DialogTitle>
            </DialogHeader>
            <div className="relative w-full h-full flex items-center justify-center">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-white hover:bg-white/20 z-50"
                onClick={() => setShowImageViewer(false)}
              >
                <X className="w-6 h-6" />
              </Button>
              
              {/* 이전 버튼 */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-50"
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIndex = currentImageSet.findIndex(img => img.url === selectedImage);
                  if (currentIndex > 0) {
                    setSelectedImage(currentImageSet[currentIndex - 1].url);
                  }
                }}
              >
                <ChevronLeft className="w-8 h-8" />
              </Button>

              {/* 다음 버튼 */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-50"
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIndex = currentImageSet.findIndex(img => img.url === selectedImage);
                  if (currentIndex < currentImageSet.length - 1) {
                    setSelectedImage(currentImageSet[currentIndex + 1].url);
                  }
                }}
              >
                <ChevronRight className="w-8 h-8" />
              </Button>

              <div className="w-full h-full flex flex-col items-center justify-center p-4">
                <img
                  src={selectedImage}
                  alt="확대된 이미지"
                  className="max-w-full max-h-[80vh] object-contain"
                />
                {/* 이미지 정보 */}
                <div className="mt-4 text-white text-center">
                  {(() => {
                    const currentImage = currentImageSet.find(img => img.url === selectedImage);
                    if (currentImage) {
                      return (
                        <>
                          <div className="font-medium text-lg">{currentImage.title || '제목 없음'}</div>
                          <div className="text-sm text-gray-300">
                            {currentImage.date?.toLocaleDateString ? 
                              currentImage.date.toLocaleDateString() : 
                              new Date(currentImage.date).toLocaleDateString()}
                          </div>
                        </>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              {/* 이미지 인디케이터 */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1">
                {currentImageSet.map((image, index) => (
                  <button
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all ${
                      image.url === selectedImage 
                        ? 'bg-white w-4' 
                        : 'bg-white/50 hover:bg-white/80'
                    }`}
                    onClick={() => setSelectedImage(image.url)}
                  />
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>
      <CollapsibleFooter />
    </>
  );
}

// 구글 애드센스 컴포넌트
import CollapsibleFooter from '@/components/ui/CollapsibleFooter'; 