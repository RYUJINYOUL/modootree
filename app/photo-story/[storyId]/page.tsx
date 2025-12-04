'use client';

import { useEffect, useState, use, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, increment, collection, addDoc, query, where, getDocs, orderBy, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { useSelector } from 'react-redux';
import LoginOutButton from '@/components/ui/LoginOutButton';
import { ChevronLeft } from 'lucide-react';

interface PhotoStory {
  id: string;
  photo: string;
  aiStories: string[];
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
  createdAt: Date;
  votes?: { [key: string]: number };
}

import { Toaster } from 'react-hot-toast';

// 데이터 처리 함수들을 컴포넌트 외부로 분리
const processAiStories = (aiStories: any): string[] => {
  if (!aiStories) return [];
  
  if (Array.isArray(aiStories)) {
    return aiStories.map((story: any) => 
      typeof story === 'string' ? story : story.content || ''
    );
  }
  
  if (typeof aiStories === 'object') {
    return Object.values(aiStories).map((story: any) => 
      typeof story === 'string' ? story : story.content || ''
    );
  }
  
  return [];
};

export default function StoryPage({ params }: { params: Promise<{ storyId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const currentUser = useSelector((state: any) => state.user.currentUser);
  const [story, setStory] = useState<PhotoStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteResults, setVoteResults] = useState<{ [key: string]: number }>({});
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  // 총 투표수 계산 (useMemo로 최적화)
  const totalVotes = useMemo(() => 
    Object.values(voteResults).reduce((sum, count) => sum + count, 0),
    [voteResults]
  );

  // 답글 목록 가져오기 (Firebase에서 정렬하도록 최적화)
  const fetchComments = async () => {
    try {
      const q = query(
        collection(db, 'photo-story-comments'),
        where('storyId', '==', resolvedParams.storyId),
        orderBy('createdAt', 'desc') // Firebase에서 정렬
      );
      
      const querySnapshot = await getDocs(q);
      const commentList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      // JavaScript 정렬 제거로 성능 향상
      setComments(commentList);
    } catch (error) {
      console.error('답글 목록 로드 실패:', error);
    }
  };

  // 좋아요 상태 확인
  const checkLikeStatus = async () => {
    if (!currentUser) return;
    try {
      const likeDoc = await getDoc(doc(db, 'photo-story-likes', `${resolvedParams.storyId}_${currentUser.uid}`));
      setLiked(likeDoc.exists());
    } catch (error) {
      console.error('좋아요 상태 확인 실패:', error);
    }
  };

  // 좋아요 토글
  const toggleLike = async () => {
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      const likeRef = doc(db, 'photo-story-likes', `${resolvedParams.storyId}_${currentUser.uid}`);
      const storyRef = doc(db, 'photo-stories', resolvedParams.storyId);

      if (liked) {
        // 좋아요 취소
        await deleteDoc(likeRef);
        await updateDoc(storyRef, {
          likeCount: increment(-1)
        });
        setLikeCount(prev => prev - 1);
      } else {
        // 좋아요 추가
        await setDoc(likeRef, {
          userId: currentUser.uid,
          storyId: resolvedParams.storyId,
          createdAt: serverTimestamp()
        });
        await updateDoc(storyRef, {
          likeCount: increment(1)
        });
        setLikeCount(prev => prev + 1);
      }
      setLiked(!liked);
    } catch (error) {
      console.error('좋아요 처리 실패:', error);
      alert('좋아요 처리에 실패했습니다.');
    }
  };

  // 답글 작성
  const handleSubmitComment = async () => {
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (!comment.trim()) return;

    try {
      await addDoc(collection(db, 'photo-story-comments'), {
        storyId: resolvedParams.storyId,
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email?.split('@')[0],
        userPhoto: currentUser.photoURL,
        comment: comment.trim(),
        createdAt: serverTimestamp()
      });

      setComment('');
      setShowCommentInput(false);
      fetchComments();
    } catch (error) {
      console.error('답글 작성 실패:', error);
      alert('답글 작성에 실패했습니다.');
    }
  };

  useEffect(() => {
    const fetchStory = async () => {
      try {
        // 1. 메인 스토리 데이터 먼저 가져오기
        const storyDoc = await getDoc(doc(db, 'photo-stories', resolvedParams.storyId));
        if (!storyDoc.exists()) {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            router.push('/photo-story');
          }
          return;
        }

        const data = storyDoc.data();
        console.log('Fetched story data:', data);

        // 2. 스토리 상태 즉시 설정 (빠른 UI 표시)
        const storyData = {
          id: storyDoc.id,
          photo: data.photo || '',
          aiStories: processAiStories(data.aiStories), // 분리된 함수 사용
          selectedStoryId: data.selectedStoryId || '0',
          author: {
            uid: data.author?.uid || '',
            displayName: data.author?.displayName || '',
            email: data.author?.email || '',
            photoURL: data.author?.photoURL || ''
          },
          stats: {
            participantCount: data.stats?.participantCount || 0,
            viewCount: data.stats?.viewCount || 0
          },
          createdAt: data.createdAt?.toDate() || new Date(),
          votes: data.votes || {}
        };

        // 즉시 상태 업데이트로 빠른 렌더링
        setStory(storyData);
        setLikeCount(data.likeCount || 0);
        setVoteResults(data.votes || {});
        setLoading(false); // 여기서 먼저 로딩 완료

        // 3. 나머지 작업들을 병렬로 실행
        const backgroundTasks = [
          // 조회수 증가
          updateDoc(doc(db, 'photo-stories', resolvedParams.storyId), {
            'stats.viewCount': increment(1)
          }),
          // 답글 목록 가져오기
          fetchComments()
        ];

        // 로그인 사용자만 필요한 작업들
        if (currentUser) {
          // 투표 여부 확인
          const votesQuery = query(
            collection(db, 'photo-story-votes'),
            where('storyId', '==', resolvedParams.storyId),
            where('userId', '==', currentUser.uid)
          );
          
          backgroundTasks.push(
            getDocs(votesQuery).then(votesSnapshot => {
              setHasVoted(!votesSnapshot.empty);
            }),
            checkLikeStatus()
          );
        }

        // 모든 백그라운드 작업을 병렬로 실행 (UI 블로킹 없음)
        await Promise.allSettled(backgroundTasks);
        
      } catch (error) {
        console.error('스토리 로드 실패:', error);
        setLoading(false);
      }
    };

    fetchStory();
  }, [resolvedParams.storyId, router, currentUser]);

  const handleVote = async (storyId: string) => {
    // 비로그인 사용자도 투표 가능하도록 로그인 체크 제거

    if (voting || hasVoted) return;

    setVoting(true);
    try {
      // 투표 기록 저장 (로그인 사용자만)
      if (currentUser?.uid) {
        await addDoc(collection(db, 'photo-story-votes'), {
          storyId: story!.id,
          userId: currentUser.uid,
          votedStoryId: storyId,
          createdAt: new Date()
        });
      }

      // 투표수 증가
      const storyRef = doc(db, 'photo-stories', story!.id);
      const currentVotes = story!.votes || {};
      const updatedVotes = {
        ...currentVotes,
        [storyId]: (currentVotes[storyId] || 0) + 1
      };

      await updateDoc(storyRef, {
        'stats.participantCount': increment(1),
        votes: updatedVotes
      });

      // 상태 업데이트
      setStory(prev => {
        if (!prev) return null;
        return {
          ...prev,
          stats: {
            ...prev.stats,
            participantCount: prev.stats.participantCount + 1
          },
          votes: updatedVotes
        };
      });
      setVoteResults(updatedVotes);
      setHasVoted(true);
    } catch (error) {
      console.error('투표 실패:', error);
      alert('투표에 실패했습니다.');
    } finally {
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!story) {
    return null;
  }

  return (
    <>
      <Toaster position="top-center" />
      <LoginOutButton />
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-cyan-900 text-white/90">
        <div className="container mx-auto px-4 py-20 pb-20 md:pb-40 max-w-3xl">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => {
                // 뒤로 가기 (브라우저 히스토리 사용)
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  // 히스토리가 없으면 직접 이동
                  router.push('/photo-story');
                }
              }}
              className="text-white/70 hover:text-white"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              목록으로
            </Button>
          </div>

          <div className="space-y-6">
            {/* 이미지 */}
            <div className="bg-white/10 rounded-lg overflow-hidden backdrop-blur-sm">
                <div className="relative h-[450px]">
                  <div className="absolute top-4 left-4 z-10">
                    <div className="bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium text-white/90">
                      투표
                    </div>
                  </div>
                  <img 
                  src={story.photo} 
                  alt="Story" 
                  className="w-full h-full object-cover"
                  loading="eager"
                  decoding="async"
                />
              </div>
            </div>

            {/* 스토리 목록 */}
            <div className="bg-white/10 rounded-lg overflow-hidden backdrop-blur-sm">
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-end text-sm text-gray-400">
                <div className="flex items-center gap-4">
                  <button
                    onClick={toggleLike}
                    className={`flex items-center gap-1 transition-colors ${
                      liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    <span>{likeCount}</span>
                  </button>
                  <span>조회 {story.stats.viewCount}</span>
                  <span>참여 {story.stats.participantCount}</span>
                  <button
                    onClick={() => {
                      const url = window.location.href;
                      if (typeof window !== 'undefined') {
                        navigator.clipboard.writeText(url)
                          .then(() => toast.success('링크가 복사되었습니다'))
                          .catch(() => toast.error('링크 복사에 실패했습니다'));
                      }
                    }}
                    className="flex items-center gap-1 text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </svg>
                    <span>공유</span>
                  </button>
                </div>
              </div>

                <div className="space-y-4">
                  {story.aiStories.map((content, index) => {
                    const storyId = index.toString();
                    const voteCount = voteResults[storyId] || 0;
                    const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

                    return (
                      <button
                        key={storyId}
                        onClick={() => handleVote(storyId)}
                        disabled={hasVoted}
                        className={`w-full p-4 rounded-lg text-left transition-colors ${
                          storyId === story.selectedStoryId
                            ? 'bg-green-500/20 border-green-500'
                            : hasVoted
                            ? 'bg-gray-800/30 cursor-not-allowed'
                            : 'bg-gray-800/50 hover:bg-gray-800/70'
                        }`}
                      >
                        <div className="space-y-2">
                          <p className="flex-1">{content}</p>
                          {hasVoted && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-400">{percentage}% ({voteCount}명)</span>
                              </div>
                              <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {hasVoted && (
                  <p className="text-sm text-center text-gray-400">
                    * 이미 투표하셨습니다
                  </p>
                )}

                {/* 답글 작성 */}
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">답글</h3>
                    {!showCommentInput && currentUser && (
                      <Button
                        onClick={() => setShowCommentInput(true)}
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        답글 작성
                      </Button>
                    )}
                  </div>

                  {showCommentInput && (
                    <div className="space-y-4 bg-gray-800/50 rounded-lg p-4">
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="답글을 작성해주세요..."
                        className="w-full h-24 bg-gray-700/50 rounded-lg p-3 text-white resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => setShowCommentInput(false)}
                          variant="outline"
                          className="bg-gray-700/50 hover:bg-gray-700 text-white"
                        >
                          취소
                        </Button>
                        <Button
                          onClick={handleSubmitComment}
                          className="bg-blue-500 hover:bg-blue-600"
                          disabled={!comment.trim()}
                        >
                          작성하기
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* 답글 목록 */}
                  <div className="space-y-4 mt-4 mb-8 md:mb-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="bg-gray-800/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          {comment.userPhoto ? (
                            <img 
                              src={comment.userPhoto} 
                              alt={comment.userName} 
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm">
                              {comment.userName?.[0] || '?'}
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium">{comment.userName}</div>
                            <div className="text-xs text-gray-400">
                              {new Date(comment.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-300">{comment.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}