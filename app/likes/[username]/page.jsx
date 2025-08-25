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
  setDoc
} from 'firebase/firestore';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import Link from 'next/link';
import CategoryCarousel from '../../components/CategoryCarousel';
import { Button } from '@/components/ui/button';
import { useSelector } from 'react-redux';
import { Trash2, MessageCircle, Edit, Send, Eye } from 'lucide-react';
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
  const { currentUser } = useSelector((state) => state.user);
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
    const fetchLikes = async () => {
      try {
        const likesRef = collection(db, 'likes');
        const q = query(likesRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const likesData = [];
        for (const doc of querySnapshot.docs) {
          const data = doc.data();
          likesData.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt),
            reactions: data.reactions || {
              awesome: 0,
              cheer: 0,
              sad: 0,
              same: 0
            }
          });
        }
        
        setLikes(likesData);
      } catch (error) {
        console.error('공감 목록 가져오기 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLikes();
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
        createdAt: new Date(),
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
              {comment.createdAt?.toDate().toLocaleString()}
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
        
          {/* 제목 추가 */}
          <h1 className="text-2xl font-bold text-center text-white mb-6">
            공감 한조각
          </h1>
          

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
                      <img
                        src={like.images[0]}
                        alt="첫 번째 이미지"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      {like.images.length > 1 && (
                        <div className="mt-2 text-sm text-gray-400 text-center">
                          +{like.images.length - 1}장의 사진 더보기
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mb-3 flex justify-between items-center">
                    <span className="text-sm text-gray-400">{like.category}</span>
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500">{like.viewCount || 0}</span>
                      <span className="text-xs text-gray-500">
                        {like.createdAt?.toLocaleDateString()}
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
                      <div className="mb-6 grid grid-cols-2 gap-2">
                        {selectedPost.images.map((imageUrl, index) => (
                        <img
                          key={index}
                          src={imageUrl}
                          alt={`공감 이미지 ${index + 1}`}
                            className="w-full h-48 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  )}

                    <p className="text-gray-300 whitespace-pre-wrap mb-6">{selectedPost.content || ''}</p>

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
        </div>
      </div>
    </>
  );
} 