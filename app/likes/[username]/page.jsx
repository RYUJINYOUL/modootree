'use client';

import { useEffect, useState } from 'react';
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
  onSnapshot
} from 'firebase/firestore';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import Link from 'next/link';
import CategoryCarousel from '../../components/CategoryCarousel';
import { Button } from '@/components/ui/button';
import { useSelector } from 'react-redux';
import { Trash2, MessageCircle, Edit, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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
            createdAt: data.createdAt?.toDate(),
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

  const handleReaction = async (postId, reactionId) => {
    const reactionKey = `${postId}:${reactionId}`;
    if (reacting === reactionKey) return;

    setReacting(reactionKey);
    try {
      const postRef = doc(db, 'likes', postId);
      
      await updateDoc(postRef, {
        [`reactions.${reactionId}`]: increment(1)
      });

      const updatedDoc = await getDoc(postRef);
      const updatedData = updatedDoc.data();

      setLikes(prevLikes => 
        prevLikes.map(like => {
          if (like.id === postId) {
            return {
              ...like,
              reactions: updatedData.reactions || like.reactions
            };
          }
          return like;
        })
      );
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
    console.log('Auth current user:', auth.currentUser);
    console.log('Redux current user:', currentUser);
    
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
    console.log('Full user info:', userInfo);

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

      console.log('Comment user info:', commentUserInfo);

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
    console.log('Getting display name for comment:', comment);
    
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
    console.log('Rendering comment with data:', comment);
    
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

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">공감 한 조각</h1>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            홈으로
          </Link>
        </div>

        {/* 카테고리 필터 */}
        {isMobile ? (
          <div className="mb-8">
            <CategoryCarousel
              categories={['전체', ...CATEGORIES]}
              selectedCategory={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 mb-8">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLikes.map((like) => (
              <div key={like.id} className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700/80 transition-colors">
                <div className="mb-3 flex justify-between items-center">
                  <span className="text-sm text-gray-400">{like.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {like.createdAt?.toLocaleDateString()}
                    </span>
                    {canDelete(like) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLike(like);
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-gray-300 text-sm whitespace-pre-wrap mb-4">{like.content}</p>
                
                {/* 이미지 갤러리 */}
                {like.images && like.images.length > 0 && (
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    {like.images.map((imageUrl, index) => (
                      <img
                        key={index}
                        src={imageUrl}
                        alt={`공감 이미지 ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {REACTIONS.map((reaction) => (
                    <Button
                      key={reaction.id}
                      onClick={() => handleReaction(like.id, reaction.id)}
                      disabled={reacting === `${like.id}:${reaction.id}`}
                      variant="ghost"
                      className={`flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg text-sm transition-colors
                        ${reacting === `${like.id}:${reaction.id}`
                          ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                          : `${reaction.bgColor} ${reaction.textColor}`
                        }`}
                    >
                      <span>{reaction.text}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${reaction.countBgColor}`}>
                        {like.reactions[reaction.id] || 0}
                      </span>
                    </Button>
                  ))}
                </div>

                {/* 답글 섹션 추가 */}
                <div className="mt-4 border-t border-gray-700 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="w-4 h-4 text-gray-400" />
                    <button 
                      onClick={() => setShowComments(prev => ({ ...prev, [like.id]: !prev[like.id] }))}
                      className="text-sm text-gray-400 hover:text-gray-300"
                    >
                      답글 {comments[like.id]?.length || 0}개
                    </button>
                  </div>

                  {showComments[like.id] && (
                    <div className="space-y-3">
                      {/* 답글 목록 */}
                      {comments[like.id]?.map(renderComment)}

                      {/* 답글 입력 폼 */}
                      {currentUser?.uid ? (
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="답글을 입력하세요"
                            className="flex-1 bg-gray-700 rounded px-3 py-1.5 text-sm placeholder-gray-400"
                          />
                          <button
                            className="h-8 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm flex items-center gap-1"
                            onClick={() => handleAddComment(like.id)}
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">답글을 작성하려면 로그인이 필요합니다.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
  );
} 