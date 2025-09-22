'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Test {
  title: string;
  description: string;
  thumbnail: string;
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
  stats: {
    participantCount: number;
    likeCount: number;
  };
}

export default function TestPage({ params }: { params: { testId: string } }) {
  const router = useRouter();
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);

  // 투표 여부 확인
  const checkVoteStatus = () => {
    if (typeof window === 'undefined' || !test) return false;
    
    // 첫 번째 질문에 대한 투표 여부 확인
    const votedKey = `voted_${params.testId}_0`;
    return localStorage.getItem(votedKey) === 'true';
  };

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const testDoc = await getDoc(doc(db, 'modoo-ai-tests', params.testId));
        if (testDoc.exists()) {
          setTest(testDoc.data() as Test);
        }
      } catch (error) {
        console.error('테스트 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
  }, [params.testId]);

  // 투표 상태 체크
  useEffect(() => {
    if (test) {
      const voted = checkVoteStatus();
      setHasVoted(voted);
    }
  }, [test, params.testId]);

  if (loading) {
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

  if (!test) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-gray-900 text-white/90">
        <div className="container mx-auto px-4 py-10">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">테스트를 찾을 수 없습니다</h1>
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
            <h1 className="text-2xl md:text-2xl font-bold text-white text-center">{test.title}</h1>
          </div>

          {/* 이미지 섹션 */}
          {test.thumbnail && (
            <div>
              <img 
                src={test.thumbnail} 
                alt={test.title} 
                className="w-full rounded-lg shadow-lg"
              />
            </div>
          )}

          {/* 설명 섹션 */}
          <div className="bg-gray-800/50 rounded-lg p-4 md:p-6">
            <p className="text-base md:text-lg text-gray-300 whitespace-pre-wrap">{test.description}</p>
          </div>

          {/* 통계 섹션 */}
          <div className="flex flex-wrap gap-2 justify-center items-center mb-8">
            <div className="bg-gray-700/50 rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm">
              <div className="text-gray-400">참여</div>
              <div className="font-semibold">{test.stats.participantCount.toLocaleString()}</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm">
              <div className="text-gray-400">좋아요</div>
              <div className="font-semibold">{test.stats.likeCount.toLocaleString()}</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm">
              <div className="text-gray-400">질문</div>
              <div className="font-semibold">{test.questions.length}</div>
            </div>
            <Button
              variant="outline"
              className="bg-gray-700/50 hover:bg-gray-700 text-white h-[32px] w-[32px] p-0 flex items-center justify-center"
              onClick={() => router.push('/modoo-ai')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </Button>
          </div>

          {/* 버튼 섹션 */}
          <div className="flex flex-col gap-4 px-3 md:px-5">
            <Button
              onClick={() => router.push(`/modoo-ai/tests/${params.testId}/questions/1`)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white text-base md:text-lg py-4 rounded-lg"
            >
              공감 시작하기
            </Button>

            {hasVoted && (
              <Button
                onClick={() => router.push(`/modoo-ai/tests/${params.testId}/results/1`)}
                className="w-full bg-gray-700/50 hover:bg-gray-700 text-white text-base md:text-lg py-4 rounded-lg"
              >
                결과 페이지 보기
              </Button>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="bg-gray-700/50 hover:bg-gray-700 text-white text-sm py-2.5 rounded-lg flex items-center justify-center gap-2"
                onClick={() => {
                  // TODO: 카카오톡 공유
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                  <polyline points="16 6 12 2 8 6"></polyline>
                  <line x1="12" y1="2" x2="12" y2="15"></line>
                </svg>
                카카오톡
              </Button>
              <Button 
                variant="outline" 
                className="bg-gray-700/50 hover:bg-gray-700 text-white text-sm py-2.5 rounded-lg flex items-center justify-center gap-2"
                onClick={() => {
                  // TODO: 링크 복사
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                링크 복사
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}