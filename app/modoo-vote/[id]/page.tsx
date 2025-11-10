'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs, Timestamp, serverTimestamp, addDoc, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import LoginOutButton from '@/components/ui/LoginOutButton';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

const MODOO_CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'happy', label: '행복' },
  { id: 'sad', label: '슬픔' },
  { id: 'angry', label: '화남' },
  { id: 'anxious', label: '불안' },
  { id: 'comfort', label: '편안' },
  { id: 'worry', label: '고민' },
];

interface VoteOption {
  text: string;
  votes: number;
}

interface VoteQuestion {
  text: string;
  options: VoteOption[];
}

interface Comment {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl?: string;
  createdAt: { 
    seconds: number;
    nanoseconds: number;
    toDate: () => Date;
  };
}

interface ModooVoteArticle {
  id: string;
  title: string;
  story: string;
  category: string;
  questions: VoteQuestion[];
  createdBy: string;
  createdAt: Timestamp;
  totalVotes: number;
  viewCount: number;
  status: 'pending' | 'approved' | 'rejected';
}

export default function ModooVoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const articleId = params.id as string;
  const currentUser = useSelector((state: any) => state.user.currentUser);

  const [article, setArticle] = useState<ModooVoteArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userVoted, setUserVoted] = useState<boolean>(false);
  const [userVoteOptionId, setUserVoteOptionId] = useState<string | null>(null);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    if (!articleId) {
      setError('유효하지 않은 투표 ID입니다.');
      setLoading(false);
      return;
    }

    const fetchArticle = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, 'modoo-vote-articles', articleId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setArticle({ ...data, id: docSnap.id } as ModooVoteArticle);

          // 조회수 증가
          await updateDoc(docRef, {
            viewCount: (data.viewCount || 0) + 1,
          });

          // 사용자의 투표 여부 확인
          if (currentUser?.uid) {
            const userVoteQuery = query(
              collection(db, 'modoo-vote-records'),
              where('articleId', '==', articleId),
              where('userId', '==', currentUser.uid)
            );
            const userVoteSnapshot = await getDocs(userVoteQuery);
            if (!userVoteSnapshot.empty) {
              setUserVoted(true);
              setUserVoteOptionId(userVoteSnapshot.docs[0].data().optionId);
            }
          }

        } else {
          setError('해당 투표를 찾을 수 없습니다.');
        }
      } catch (err) {
        console.error('투표 불러오기 실패:', err);
        setError('투표를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();

    // 댓글 실시간 불러오기
    const commentsRef = collection(db, 'modoo-vote-articles', articleId, 'comments');
    const commentsQuery = query(commentsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const fetchedComments: Comment[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text,
          authorId: data.authorId,
          authorName: data.authorName,
          authorPhotoUrl: data.authorPhotoUrl,
          createdAt: data.createdAt
        } as Comment;
      });
      setComments(fetchedComments);
    }, (err) => {
      console.error("댓글 실시간 업데이트 실패:", err);
    });

    return () => unsubscribe(); // 클린업 함수에서 구독 해제
  }, [articleId, currentUser?.uid]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert('댓글을 작성하려면 로그인해야 합니다.');
      return;
    }
    if (!newCommentText.trim()) {
      alert('댓글 내용을 입력해주세요.');
      return;
    }
    setCommentLoading(true);

    try {
      await addDoc(collection(db, 'modoo-vote-articles', articleId, 'comments'), {
        text: newCommentText,
        authorId: currentUser.uid,
        authorName: currentUser.displayName || currentUser.email?.split('@')[0],
        authorPhotoUrl: currentUser.photoURL,
        createdAt: serverTimestamp(),
      });

      setNewCommentText(''); // 댓글 입력 필드 초기화
    } catch (err) {
      console.error('댓글 제출 실패:', err);
      alert('댓글 제출 중 오류가 발생했습니다.');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleVote = async (questionIndex: number, optionIndex: number, optionText: string) => {
    // 비로그인 사용자도 투표 가능하도록 로그인 체크 제거
    if (userVoted) {
      alert('이미 이 투표에 참여하셨습니다.');
      return;
    }

    setSubmittingVote(true);
    try {
      const articleRef = doc(db, 'modoo-vote-articles', articleId);

      // 해당 질문의 선택지 중 선택된 선택지의 votes를 1 증가
      // Firestore에서 배열 내 중첩 객체 업데이트는 다소 복잡
      // 간단한 방법은 전체 questions 배열을 업데이트
      if (article) {
        const newQuestions = [...article.questions];
        if (newQuestions[questionIndex] && newQuestions[questionIndex].options[optionIndex]) {
          newQuestions[questionIndex].options[optionIndex].votes += 1;
        }

        await updateDoc(articleRef, {
          questions: newQuestions,
          totalVotes: (article.totalVotes || 0) + 1,
        });

        // 투표 기록 (중복 투표 방지용) - 로그인 사용자만
        if (currentUser?.uid) {
          await addDoc(collection(db, 'modoo-vote-records'), {
            articleId: articleId,
            userId: currentUser.uid,
            questionIndex: questionIndex,
            optionIndex: optionIndex,
            optionText: optionText,
            createdAt: serverTimestamp(),
          });
        }

        setArticle(prev => prev ? { ...prev, questions: newQuestions, totalVotes: (prev.totalVotes || 0) + 1 } : null);
        setUserVoted(true);
        setUserVoteOptionId(`${questionIndex}-${optionIndex}`);
        alert('투표가 완료되었습니다!');
      }

    } catch (err) {
      console.error('투표 처리 실패:', err);
      alert('투표 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSubmittingVote(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <p>투표를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <p className="text-red-500">{error}</p>
        <Button onClick={() => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            router.push('/modoo-vote');
          }
        }} className="ml-4">목록으로 돌아가기</Button>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <p>투표 정보를 찾을 수 없습니다.</p>
        <Button onClick={() => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            router.push('/modoo-vote');
          }
        }} className="ml-4">목록으로 돌아가기</Button>
      </div>
    );
  }
  
  const totalParticipants = article.totalVotes || 0; // totalVotes를 참여자로 사용

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="fixed top-0 left-0 right-0 z-20 w-full">
        <LoginOutButton />
      </div>
      <div className="max-w-3xl mx-auto bg-gray-800 rounded-lg shadow-lg p-6 mt-[80px]">
        <h1 className="text-3xl font-bold text-center mb-6">{article.title}</h1>
        <p className="text-sm text-gray-400 text-center mb-4">
          카테고리: {MODOO_CATEGORIES.find(cat => cat.id === article.category)?.label || article.category} | 총 {totalParticipants}명 참여
        </p>
        <Separator className="my-6 bg-gray-700" />

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">사연 내용</h2>
          <p className="text-gray-300 whitespace-pre-wrap">{article.story}</p>
        </div>

        {article.questions.map((question, qIndex) => (
          <Card key={qIndex} className="bg-gray-700 border-gray-600 text-white mb-6">
            <CardHeader>
              <CardTitle className="text-lg">{qIndex + 1}. {question.text}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {question.options.map((option, oIndex) => {
                const optionId = `${qIndex}-${oIndex}`;
                const isSelected = userVoteOptionId === optionId;
                const percentage = totalParticipants > 0 ? (option.votes / totalParticipants) * 100 : 0;

                return (
                  <button
                    key={oIndex}
                    onClick={() => handleVote(qIndex, oIndex, option.text)}
                    disabled={userVoted || submittingVote}
                    className={`w-full min-h-[60px] text-left p-4 rounded-lg relative overflow-hidden transition-all duration-300
                      ${userVoted
                        ? (isSelected ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300 cursor-not-allowed')
                        : 'bg-gray-600 hover:bg-gray-500'
                      }`}
                  >
                    {userVoted && (
                      <div
                        className="absolute inset-0 bg-blue-500/30 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    )}
                    <div className="flex justify-between items-start gap-4">
                      <div className="text-base relative z-10 flex-1 break-words">{option.text}</div>
                      {userVoted && (
                        <div className="text-sm text-blue-400 relative z-10 whitespace-nowrap">
                          {option.votes} 표 ({percentage.toFixed(1)}%)
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        ))}

        {userVoted && (
          <p className="text-center text-sm text-gray-400 mt-6">
            이미 이 투표에 참여하셨습니다.
          </p>
        )}

        {/* 버튼 영역 */}
        <div className="mt-8 flex justify-center gap-3">
          <Button onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              router.push('/modoo-vote');
            }
          }} className="bg-blue-600 hover:bg-blue-700">
            목록으로 돌아가기
          </Button>
          <Button
            onClick={() => {
              const shareUrl = window.location.href;
              navigator.clipboard.writeText(shareUrl)
                .then(() => alert('링크가 클립보드에 복사되었습니다!'))
                .catch(err => {
                  console.error('링크 복사 실패:', err);
                  alert('링크 복사에 실패했습니다.');
                });
            }}
            className="bg-green-600 hover:bg-green-700"
          >
            공유 링크 복사
          </Button>
        </div>

        {/* 댓글 섹션 */}
        <div className="mt-10 p-6 bg-gray-700 rounded-lg">
          <h3 className="text-xl font-bold mb-4">댓글 ({comments.length})</h3>

          {/* 댓글 입력 폼 */}
          {currentUser ? (
            <form onSubmit={handleCommentSubmit} className="mb-6 space-y-3">
              <Textarea
                placeholder="댓글을 입력해주세요."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                disabled={commentLoading}
                className="bg-gray-800/50 border-blue-500/30 text-white focus:ring-blue-500 focus:border-blue-500"
              />
              <Button
                type="submit"
                disabled={commentLoading || !newCommentText.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-colors"
              >
                {commentLoading ? '등록 중...' : '댓글 등록'}
              </Button>
            </form>
          ) : (
            <div className="text-center text-gray-400 mb-6">
              <Link href="/login" className="text-blue-400 hover:underline">
                댓글을 작성하려면 로그인해주세요.
              </Link>
            </div>
          )}

          {/* 댓글 목록 */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-gray-400 text-center">아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</p>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={comment.authorPhotoUrl || undefined} alt={comment.authorName} />
                    <AvatarFallback>{comment.authorName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{comment.authorName}</span>
                      <span className="text-xs text-gray-400">
                        {comment.createdAt?.toDate
                          ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true, locale: ko })
                          : '방금 전'
                        }
                      </span>
                    </div>
                    <p className="text-sm text-gray-200 mt-1">{comment.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        

        <div className="mt-8 flex justify-center gap-3">
          <Button onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              router.push('/modoo-vote');
            }
          }} className="bg-blue-600 hover:bg-blue-700">
            목록으로 돌아가기
          </Button>
          <Button
            onClick={() => {
              const shareUrl = window.location.href;
              navigator.clipboard.writeText(shareUrl)
                .then(() => alert('링크가 클립보드에 복사되었습니다!'))
                .catch(err => {
                  console.error('링크 복사 실패:', err);
                  alert('링크 복사에 실패했습니다.');
                });
            }}
            className="bg-green-600 hover:bg-green-700"
          >
            공유 링크 복사
          </Button>
        </div>
      </div>
      {/* 하단 여백 */}
      <div className="h-20 md:h-32"></div>
    </div>
    
  );
}
