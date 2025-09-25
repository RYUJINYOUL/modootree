'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Test {
  title: string;
  questions: Array<{
    text: string;
    options: Array<{
      text: string;
      score: number;
    }>;
  }>;
  recommendations?: {
    movie?: string;
    movieReason?: string;
    music?: string;
    musicArtist?: string;
    musicReason?: string;
    book?: string;
    bookAuthor?: string;
    bookReason?: string;
    message?: string;
  };
}

export default function QuestionResultPage({ 
  params 
}: { 
  params: Promise<{ testId: string; questionId: string }> 
}) {
  const router = useRouter();
  const currentUser = useSelector((state: any) => state.user.currentUser);
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [voteResults, setVoteResults] = useState<number[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [comment, setComment] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  const resolvedParams = use(params);
  const questionIndex = parseInt(resolvedParams.questionId) - 1;
  const testId = resolvedParams.testId;

  // 답글 목록 가져오기
  const fetchComments = async () => {
    try {
      const q = query(
        collection(db, 'modoo-ai-comments'),
        where('testId', '==', testId),
        where('questionIndex', '==', Number(questionIndex))
      );
      
      const querySnapshot = await getDocs(q);
      const commentList = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        }))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10);
      
      setComments(commentList);
    } catch (error) {
      console.error('답글 목록 로드 실패:', error);
    }
  };

  // 투표 결과 가져오기
  const fetchVoteResults = async () => {
    try {
      const voteDoc = await getDoc(doc(db, 'modoo-ai-votes', `${testId}_${questionIndex}`));
      if (voteDoc.exists()) {
        const data = voteDoc.data();
        setVoteResults(data.results || []);
      } else {
        setVoteResults([]);
      }
    } catch (error) {
      console.error('투표 결과 로드 실패:', error);
    }
  };

  // 답글 작성
  const handleSubmitComment = async () => {
    if (!comment.trim()) return;
    
    if (!currentUser?.uid) {
      alert('답글을 작성하려면 로그인이 필요합니다.');
      router.push('/login');
      return;
    }
    
    try {
      const commentsRef = collection(db, 'modoo-ai-comments');
      const commentData = {
        testId: testId,
        questionIndex: Number(questionIndex),
        comment: comment.trim(),
        userId: currentUser.uid,
        userName: currentUser.displayName || '익명',
        userPhoto: currentUser.photoURL || null,
        createdAt: serverTimestamp()
      };

      await addDoc(commentsRef, commentData);
      setComment('');
      setShowCommentInput(false);
      await fetchComments();
    } catch (error) {
      console.error('답글 작성 실패:', error);
      alert('답글 작성에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        // 테스트 정보 로드
        const testDoc = await getDoc(doc(db, 'modoo-ai-tests', testId));
        if (testDoc.exists()) {
          setTest(testDoc.data() as Test);
          await Promise.all([
            fetchVoteResults(),
            fetchComments()
          ]);
        }
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [testId, questionIndex]);

  if (loading || !test) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-gray-900 text-white/90">
        <div className="container mx-auto px-4 py-10">
          <div className="text-center">
            결과를 불러오는 중...
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = test.questions[questionIndex];
  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-gray-900 text-white/90">
        <div className="container mx-auto px-4 py-10">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">질문을 찾을 수 없습니다</h1>
            <Button onClick={() => router.push('/modoo-ai')}>
              테스트 목록으로 돌아가기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-gray-900 text-white/90">
      <div className="container mx-auto px-4 py-6 md:py-10">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* 제목 섹션 */}
          <div className="bg-gray-800/50 rounded-lg p-4 md:p-6">
            <h1 className="text-2xl md:text-2xl font-bold text-white text-center">{currentQuestion.text}</h1>
          </div>

          {/* 투표 결과 */}
          <div className="bg-gray-800/50 rounded-lg p-4 md:p-6">
            <h3 className="text-lg font-semibold text-white mb-4">투표 결과</h3>
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                const totalVotes = voteResults.reduce((sum, count) => sum + count, 0);
                const count = voteResults[index] || 0;
                const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">{option.text}</span>
                      <span className="text-gray-400">{percentage}% ({count}명)</span>
                    </div>
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 추천 컨텐츠 */}
          {test.recommendations && (
            <div className="bg-gray-800/50 rounded-lg p-4 md:p-6">
              <h3 className="text-lg font-semibold text-white mb-4">추천 컨텐츠</h3>
              <Tabs defaultValue="movie" className="w-full">
                <TabsList className="w-full grid grid-cols-4 mb-4">
                  <TabsTrigger value="movie">🎬 영화</TabsTrigger>
                  <TabsTrigger value="music">🎵 음악</TabsTrigger>
                  <TabsTrigger value="book">📚 도서</TabsTrigger>
                  <TabsTrigger value="quote">💌 한마디</TabsTrigger>
                </TabsList>
                <TabsContent value="movie" className="bg-gray-700/50 p-4 rounded-lg">
                  {test.recommendations.movie ? (
                    <div className="space-y-2">
                      <div className="font-medium text-white">{test.recommendations.movie}</div>
                      {test.recommendations.movieReason && (
                        <p className="text-sm text-gray-400">{test.recommendations.movieReason}</p>
                      )}
                    </div>
                  ) : '추천 영화가 없습니다.'}
                </TabsContent>
                <TabsContent value="music" className="bg-gray-700/50 p-4 rounded-lg">
                  {test.recommendations.music ? (
                    <div className="space-y-2">
                      <div className="font-medium text-white">
                        {test.recommendations.music}
                        {test.recommendations.musicArtist && ` - ${test.recommendations.musicArtist}`}
                      </div>
                      {test.recommendations.musicReason && (
                        <p className="text-sm text-gray-400">{test.recommendations.musicReason}</p>
                      )}
                    </div>
                  ) : '추천 음악이 없습니다.'}
                </TabsContent>
                <TabsContent value="book" className="bg-gray-700/50 p-4 rounded-lg">
                  {test.recommendations.book ? (
                    <div className="space-y-2">
                      <div className="font-medium text-white">
                        {test.recommendations.book}
                        {test.recommendations.bookAuthor && ` - ${test.recommendations.bookAuthor}`}
                      </div>
                      {test.recommendations.bookReason && (
                        <p className="text-sm text-gray-400">{test.recommendations.bookReason}</p>
                      )}
                    </div>
                  ) : '추천 도서가 없습니다.'}
                </TabsContent>
                <TabsContent value="quote" className="bg-gray-700/50 p-4 rounded-lg">
                  {test.recommendations.message || '위로의 한마디가 없습니다.'}
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* 참여자 답글 목록 */}
          <div className="bg-gray-800/50 rounded-lg p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">참여자들의 답글</h3>
              <div className="text-sm text-gray-400">{comments.length}개의 답글</div>
            </div>
            {comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-700/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
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
                            {comment.createdAt ? 
                              new Date(comment.createdAt).toLocaleString('ko-KR', {
                                year: '2-digit',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              }).replace(/\s/g, '') 
                              : '방금 전'}
                          </div>
                        </div>
                      </div>
                      {currentUser?.uid === comment.userId && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setEditingCommentText(comment.comment);
                            }}
                            className="text-gray-400 hover:text-white transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                              <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" />
                            </svg>
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('정말로 이 답글을 삭제하시겠습니까?')) {
                                try {
                                  await deleteDoc(doc(db, 'modoo-ai-comments', comment.id));
                                  await fetchComments();
                                } catch (error) {
                                  console.error('답글 삭제 실패:', error);
                                  alert('답글 삭제에 실패했습니다. 다시 시도해주세요.');
                                }
                              }
                            }}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                              <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                    {editingCommentId === comment.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                          className="w-full h-20 bg-gray-600/50 rounded-lg p-2 text-white text-sm resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditingCommentText('');
                            }}
                            variant="outline"
                            className="bg-gray-700/50 hover:bg-gray-700 text-white text-sm py-1 h-8"
                          >
                            취소
                          </Button>
                          <Button
                            onClick={async () => {
                              if (!editingCommentText.trim()) return;
                              try {
                                const commentRef = doc(db, 'modoo-ai-comments', comment.id);
                                await updateDoc(commentRef, {
                                  comment: editingCommentText.trim(),
                                  updatedAt: serverTimestamp()
                                });
                                setEditingCommentId(null);
                                setEditingCommentText('');
                                await fetchComments();
                              } catch (error) {
                                console.error('답글 수정 실패:', error);
                                alert('답글 수정에 실패했습니다. 다시 시도해주세요.');
                              }
                            }}
                            className="bg-blue-500 hover:bg-blue-600 text-white text-sm py-1 h-8"
                          >
                            수정 완료
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-300">{comment.comment}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>아직 답글이 없습니다.</p>
                <p className="text-sm mt-2">첫 번째 답글을 작성해보세요!</p>
              </div>
            )}
          </div>

          {/* 답글 작성 */}
          <div className="bg-gray-800/50 rounded-lg p-4 md:p-6">
            <h3 className="text-lg font-semibold text-white mb-4">답글 작성</h3>
            <div className="space-y-4">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="다른 참여자들에게 하고 싶은 말을 남겨주세요..."
                className="w-full h-24 bg-gray-700/50 rounded-lg p-3 text-white text-sm resize-none"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleSubmitComment}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  disabled={!comment.trim()}
                >
                  작성하기
                </Button>
              </div>
            </div>
          </div>

          {/* 하단 버튼 */}
          <div className="flex gap-2 px-3 md:px-5">
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="flex-1 bg-gray-700/50 hover:bg-gray-700 text-white"
            >
              이전으로
            </Button>
            <Button
              onClick={() => router.push(`/modoo-ai/tests/${testId}`)}
              variant="outline"
              className="flex-1 bg-gray-700/50 hover:bg-gray-700 text-white"
            >
              테스트 홈으로
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}