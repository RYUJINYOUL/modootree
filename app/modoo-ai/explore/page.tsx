'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';

interface Test {
  id: string;
  title: string;
  description: string;
  authorId: string;
  authorName: string;
  stats: {
    participantCount: number;
    likeCount: number;
  };
  createdAt: any;
}

export default function ExploreTestsPage() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      const q = query(
        collection(db, 'modoo-ai-tests'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      
      const snapshot = await getDocs(q);
      const testData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Test[];
      
      setTests(testData);
    } catch (error) {
      console.error('테스트 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-gray-900 text-white/90">
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold">AI 심리테스트 목록</h1>
            <Button
              onClick={() => router.push('/modoo-ai/create')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              테스트 만들기
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">테스트 목록을 불러오는 중...</p>
            </div>
          ) : tests.length === 0 ? (
            <div className="text-center py-20 bg-gray-800/50 rounded-lg">
              <p className="text-gray-400 mb-4">아직 등록된 테스트가 없습니다</p>
              <Button
                onClick={() => router.push('/modoo-ai/create')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                첫 번째 테스트 만들기
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {tests.map(test => (
                <div
                  key={test.id}
                  className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800/70 transition-colors cursor-pointer"
                  onClick={() => router.push(`/modoo-ai/${test.id}`)}
                >
                  <h2 className="text-lg font-semibold mb-2">{test.title}</h2>
                  <p className="text-gray-400 text-sm mb-3">{test.description}</p>
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="mr-4">👤 {test.authorName}</span>
                    <span className="mr-4">❤️ {test.stats.likeCount}</span>
                    <span>👥 {test.stats.participantCount}명 참여</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}




