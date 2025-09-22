'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { doc, getDoc, runTransaction, collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
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
  resultTypes: Array<{
    title: string;
    description: string;
    minScore: number;
    maxScore: number;
  }>;
}

export default function QuestionPage({ 
  params 
}: { 
  params: Promise<{ testId: string; questionId: string }> 
}) {
  const router = useRouter();
  const currentUser = useSelector((state: any) => state.user.currentUser);
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [voteResults, setVoteResults] = useState<number[]>([]);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);

  const resolvedParams = use(params);
  const questionIndex = parseInt(resolvedParams.questionId) - 1;
  const testId = resolvedParams.testId;

  // 답글 목록 가져오기
  const fetchComments = async () => {
    try {
      console.log('Fetching comments for testId:', testId, 'questionIndex:', questionIndex);
      
      // 전체 데이터 확인을 위해 필터 없이 먼저 조회
      const allCommentsQuery = query(collection(db, 'modoo-ai-comments'));
      const allComments = await getDocs(allCommentsQuery);
      console.log('Total comments in collection:', allComments.size);
      console.log('Current testId:', testId);
      console.log('Current questionIndex:', questionIndex);
      allComments.forEach(doc => {
        const data = doc.data();
        console.log('Comment data:', { 
          id: doc.id, 
          ...data,
          matchesTest: data.testId === testId,
          matchesQuestion: data.questionIndex === Number(questionIndex),
          testId: data.testId,
          questionIndex: data.questionIndex
        });
      });

      // 기본 쿼리로 실행
      const q = query(
        collection(db, 'modoo-ai-comments'),
        where('testId', '==', testId)
      );
      
      const querySnapshot = await getDocs(q);
      console.log('Filtered comments count:', querySnapshot.size);
      
      const commentList = querySnapshot.docs
        .map(doc => {
          const data = doc.data();
          console.log('Processing comment:', { 
            id: doc.id, 
            ...data,
            testId: data.testId,
            questionIndex: data.questionIndex,
            currentTestId: testId,
            currentQuestionIndex: questionIndex
          });
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date()
          };
        })
        .filter((comment: any) => {
          const isMatch = comment.questionIndex === Number(questionIndex);
          console.log('Filtering comment:', {
            commentId: comment.id,
            commentIndex: comment.questionIndex,
            expectedIndex: Number(questionIndex),
            commentTestId: comment.testId,
            expectedTestId: testId,
            isMatch: isMatch,
            comment: comment
          });
          return isMatch;
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()) // 최신순 정렬
        .slice(0, 10); // 최대 10개만 표시
      
      console.log('Final comment list:', commentList);
      setComments(commentList);
    } catch (error) {
      console.error('답글 목록 로드 실패:', error);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // 테스트 정보 로드
        const testDoc = await getDoc(doc(db, 'modoo-ai-tests', testId));
        if (testDoc.exists()) {
          setTest(testDoc.data() as Test);
          await fetchVoteResults();
        }

        // 이전 투표 여부 확인
        const votedKey = `voted_${testId}_${questionIndex}`;
        const hasVoted = localStorage.getItem(votedKey);
        
        // 로컬 스토리지에서 답변 불러오기
        const savedAnswers = localStorage.getItem(`test_${testId}_answers`);
        if (savedAnswers) {
          const parsedAnswers = JSON.parse(savedAnswers);
          setAnswers(parsedAnswers);
          // 이전에 선택한 답변이 있으면 선택 상태로 설정
          if (parsedAnswers[questionIndex] !== undefined) {
            setSelectedOption(parsedAnswers[questionIndex]);
          }
        }
        
        // 이전에 투표했다면 결과 보여주기
        if (hasVoted) {
          await fetchVoteResults();
          await fetchComments();
        }
        
        // 답글 목록 로드
        await fetchComments();
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
            테스트를 불러오는 중...
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = test.questions[questionIndex];
  const progress = ((questionIndex + 1) / test.questions.length) * 100;
  
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

  // 투표 결과 가져오기
  const fetchVoteResults = async () => {
    try {
      const voteDoc = await getDoc(doc(db, 'modoo-ai-votes', `${testId}_${questionIndex}`));
      if (voteDoc.exists()) {
        const data = voteDoc.data();
        setVoteResults(data.results || Array(test?.questions[questionIndex].options.length).fill(0));
      } else {
        setVoteResults(Array(test?.questions[questionIndex].options.length).fill(0));
      }
    } catch (error) {
      console.error('투표 결과 로드 실패:', error);
    }
  };

  // 투표하기
  const handleAnswer = async (index: number) => {
    try {
      // 이미 투표한 경우 처리
      const votedKey = `voted_${testId}_${questionIndex}`;
      if (localStorage.getItem(votedKey)) {
        alert('이미 투표하셨습니다.');
        return;
      }

      setSelectedOption(index);
      
      // Firestore에 투표 결과 업데이트
      const voteRef = doc(db, 'modoo-ai-votes', `${testId}_${questionIndex}`);
      await runTransaction(db, async (transaction) => {
        const voteDoc = await transaction.get(voteRef);
        const currentResults = voteDoc.exists() ? voteDoc.data().results || [] : Array(test?.questions[questionIndex].options.length).fill(0);
        
        // 선택한 옵션의 카운트 증가
        currentResults[index] = (currentResults[index] || 0) + 1;
        
        transaction.set(voteRef, { 
          testId: testId,
          questionIndex,
          results: currentResults,
          updatedAt: serverTimestamp()
        }, { merge: true });
      });

      // 결과와 답글 다시 가져오기
      await Promise.all([
        fetchVoteResults(),
        fetchComments()
      ]);
      
      // 로컬 스토리지에 답변과 투표 여부 저장
      const newAnswers = [...answers];
      newAnswers[questionIndex] = index;
      setAnswers(newAnswers);
      localStorage.setItem(`test_${testId}_answers`, JSON.stringify(newAnswers));
      localStorage.setItem(`voted_${testId}_${questionIndex}`, 'true');
      
      // 답글 목록 로드 및 입력 폼 표시
      await fetchComments();
      setShowCommentInput(true);
    } catch (error) {
      console.error('투표 실패:', error);
      alert('투표에 실패했습니다. 다시 시도해주세요.');
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
        selectedOption: Number(selectedOption),
        comment: comment.trim(),
        userId: currentUser.uid,
        userName: currentUser.displayName || '익명',
        userPhoto: currentUser.photoURL || null,
        createdAt: serverTimestamp()
      };
      console.log('Saving comment:', commentData);
      await addDoc(commentsRef, commentData);

      setComment('');
      setShowCommentInput(false);
      // 답글 목록 새로고침
      await fetchComments();
    } catch (error) {
      console.error('답글 작성 실패:', error);
      alert('답글 작성에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-gray-900 text-white/90">
      <div className="container mx-auto px-4 py-6 md:py-10">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* 제목 섹션 */}
          <div className="bg-gray-800/50 rounded-lg p-4 md:p-6">
            <h1 className="text-2xl md:text-2xl font-bold text-white text-center">{currentQuestion.text}</h1>
          </div>

          {/* 선택지 */}
          <div className="bg-gray-800/50 rounded-lg p-4 md:p-6">
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <Button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  className={`w-full text-white text-base py-4 rounded-lg text-left px-4 ${
                    selectedOption === index 
                      ? 'bg-blue-600 hover:bg-blue-500' 
                      : 'bg-gray-700/50 hover:bg-gray-700'
                  }`}
                >
                  {option.text}
                </Button>
              ))}
            </div>
          </div>

          {/* 투표 결과 */}
          {selectedOption !== null && (
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
          )}

          {/* 답글 입력 */}
          {showCommentInput && (
            <div className="bg-gray-800/50 rounded-lg p-4 md:p-6">
              <h3 className="text-lg font-semibold text-white mb-4">답글 작성</h3>
              <div className="space-y-4">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="다른 참여자들에게 하고 싶은 말을 남겨주세요..."
                  className="w-full h-24 bg-gray-700/50 rounded-lg p-3 text-white text-sm resize-none"
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
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                    disabled={!comment.trim()}
                  >
                    작성하기
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 참여자 답글 목록 */}
          <div className="bg-gray-800/50 rounded-lg p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">참여자들의 답글</h3>
              {selectedOption !== null && <div className="text-sm text-gray-400">{comments.length}개의 답글</div>}
            </div>
            {selectedOption !== null ? (
              comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-gray-700/50 rounded-lg p-3">
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
                            {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : '방금 전'}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-300">{comment.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p>아직 답글이 없습니다.</p>
                  <p className="text-sm mt-2">첫 번째 답글을 작성해보세요!</p>
                </div>
              )
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>투표를 하시면 참여자들의 답글을 볼 수 있습니다.</p>
              </div>
            )}
          </div>

          {/* 하단 버튼 */}
          <div className="px-3 md:px-5">
            <Button
              onClick={() => router.push(`/modoo-ai/tests/${testId}`)}
              variant="outline"
              className="w-full bg-gray-700/50 hover:bg-gray-700 text-white py-3 rounded-lg"
            >
              나중에 공감하기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}