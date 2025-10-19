// app/news-vote/submit/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import useAuth from '@/hooks/useAuth'; // 사용자 인증 훅 수정 (default import)
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AIGenerationProgress } from '@/components/AIGenerationProgress'; // AIGenerationProgress 컴포넌트 임포트 방식 수정
import { User } from 'firebase/auth'; // Firebase User 타입 임포트

// NEWS_CATEGORIES는 공통으로 사용되므로, 별도의 파일로 분리하거나 여기에 다시 정의합니다.
// 여기서는 임시로 다시 정의합니다.
const NEWS_CATEGORIES = [
  { id: 'current_affairs', label: '시사' },
  { id: 'economy_it', label: '경제' },
  { id: 'entertainment', label: '연예' },
];

export default function SubmitNewsPage() {
  const { user, loading: authLoading } = useAuth(); // useAuth 훅 사용
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [category, setCategory] = useState(NEWS_CATEGORIES[0]?.id || '');
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 인증 로딩 중이거나 사용자가 로그인하지 않았다면 로그인 페이지로 리다이렉트
  if (authLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-cyan-900 text-white/90 flex items-center justify-center">
        <div className="text-center text-gray-400">인증 확인 중...</div>
      </main>
    );
  }

  if (!user) {
    router.replace('/login'); // 로그인 페이지로 이동
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmissionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/news/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 인증 토큰을 헤더에 포함 (useAuth 훅에서 가져와야 함)
          Authorization: `Bearer ${await (user as User).getIdToken()}`, // user를 User 타입으로 단언
        },
        body: JSON.stringify({ title, original_url: originalUrl, category }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '뉴스 제출에 실패했습니다.');
      }

      alert('뉴스가 성공적으로 제출되었습니다. AI 분석 후 투표에 반영됩니다!');
      router.push('/news-vote'); // 제출 후 뉴스 목록 페이지로 이동
    } catch (err) {
      console.error('뉴스 제출 오류:', err);
      setError(err instanceof Error ? err.message : '뉴스 제출 중 알 수 없는 오류가 발생했습니다.');
    } finally {
      setSubmissionLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-cyan-900 text-white/90 relative overflow-hidden">
      <div className="container mx-auto px-4 py-10 relative z-10 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">새 뉴스 투표 제안하기</h1>
          <p className="text-sm text-gray-400">다른 사람들과 함께 이야기하고 싶은 뉴스를 제안해 주세요.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20 shadow-lg space-y-6">
          {error && <div className="text-red-400 text-center">{error}</div>}

          <div>
            <Label htmlFor="title" className="text-white">뉴스 제목</Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="뉴스 기사 제목을 입력해 주세요."
              required
              className="mt-2 bg-gray-800/50 border-blue-500/30 text-white focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <Label htmlFor="originalUrl" className="text-white">원문 링크</Label>
            <Input
              id="originalUrl"
              type="url"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              placeholder="뉴스 기사 원문 URL을 입력해 주세요."
              required
              className="mt-2 bg-gray-800/50 border-blue-500/30 text-white focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <Label htmlFor="category" className="text-white">카테고리</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category" className="mt-2 bg-gray-800/50 border-blue-500/30 text-white focus:ring-blue-500 focus:border-blue-500">
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-blue-500/30 text-white">
                {NEWS_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="hover:bg-blue-600/30">
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {submissionLoading ? (
            <AIGenerationProgress />
          ) : (
            <Button type="submit" disabled={submissionLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-colors">
              뉴스 투표 제안하기
            </Button>
          )}
        </form>
      </div>
    </main>
  );
}
