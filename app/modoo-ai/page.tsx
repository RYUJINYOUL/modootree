'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useSelector } from 'react-redux';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Test {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  stats: {
    participantCount: number;
    likeCount: number;
  };
}

export default function ModooAIPage() {
  const router = useRouter();
  const currentUser = useSelector((state: any) => state.user.currentUser);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const q = query(
          collection(db, 'modoo-ai-tests'),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const testList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Test[];

        setTests(testList);
      } catch (error) {
        console.error('공감투표 목록 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, []);

  const renderTestList = () => {
    if (loading) {
      return (
        <div className="text-center py-10">
          공감투표 목록을 불러오는 중...
        </div>
      );
    }

    if (tests.length === 0) {
      return (
        <div className="text-center py-10 text-gray-400">
          아직 생성된 테스트가 없습니다.
          {currentUser?.uid && (
            <div className="mt-4">
              <Button
                onClick={() => router.push('/modoo-ai/create')}
                className="bg-blue-500 hover:bg-blue-600"
              >
                첫 번째 테스트 만들기
              </Button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4 mt-8">
        <h2 className="text-lg font-medium text-white/80 mb-4">인기 공감투표</h2>
        <div className="space-y-3">
          {tests.slice(0, 5).map((test) => (
            <div
              key={test.id}
              onClick={() => router.push(`/modoo-ai/tests/${test.id}`)}
              className="bg-white/10 rounded-lg p-4 hover:bg-white/20 transition-colors cursor-pointer flex gap-4 items-center"
            >
              {test.thumbnail ? (
                <div className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-md">
                  <img
                    src={test.thumbnail}
                    alt={test.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 flex-shrink-0 bg-gray-800 rounded-md flex items-center justify-center">
                  <span className="text-3xl">🎯</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium mb-1 line-clamp-1">{test.title}</h3>
                <p className="text-sm text-gray-400 mb-2 line-clamp-2">{test.description}</p>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span>참여 {test.stats.participantCount.toLocaleString()}</span>
                  <span>좋아요 {test.stats.likeCount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-gray-900 text-white/90">
      <div className="container mx-auto px-4 py-10">
        <div className="mb-10">
          <div className="flex justify-between items-center mb-8">
            <div className="text-center flex-grow">
              <h1 className="text-2xl font-bold text-white mb-2">
                모두트리 공감투표
              </h1>
              <p className="text-sm text-gray-400">
                사연 작성 하면 투표 AI 자동 생성, AI 답글 공감을 받아보세요
              </p>
            </div>
            {currentUser?.uid && (
              <div className="flex-shrink-0 ml-4">
                <Button
                  onClick={() => router.push('/modoo-ai/create')}
                  variant="default"
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  만들기
                </Button>
              </div>
            )}
          </div>

          {!currentUser && (
            <p className="text-sm text-gray-400 text-center mt-4">
              * 제작은 로그인이 필요합니다
            </p>
          )}

          {renderTestList()}
        </div>
      </div>
    </main>
  );
}