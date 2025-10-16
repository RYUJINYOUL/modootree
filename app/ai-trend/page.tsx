'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { Sparkles, Search, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function AiTrendPage() {
  const router = useRouter();
  const { currentUser } = useSelector((state: any) => state.user);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [trends, setTrends] = useState<{
    trends: Array<{
      title: string;
      summary: string;
      source: string;
      url: string;
      category: string;
    }>;
  } | null>(null);

  // 페이지 로드 시 기본 트렌드 리포트 가져오기
  useEffect(() => {
    fetchTrendReport();
  }, []);

  const fetchTrendReport = async (topic?: string) => {
    if (!currentUser?.token) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai-trend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          token: currentUser.token,
        }),
      });

      const data = await response.json();
      if (data.success && data.data) {
        setTrends(data.data);
      } else {
        console.error('트렌드 리포트 가져오기 실패:', data.error);
      }
    } catch (error) {
      console.error('트렌드 리포트 요청 중 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      fetchTrendReport(searchTerm);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white/90">
      {/* 헤더 */}
      <header className="fixed top-0 left-0 right-0 bg-black/90 backdrop-blur-lg border-b border-white/10 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <span className="font-medium">AI 트렌드 리포트</span>
          </div>
          <div className="w-9"></div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="container mx-auto px-4 pt-24 pb-16">
        {/* 검색 폼 */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="관심있는 주제나 키워드를 입력하세요"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 pr-12 focus:outline-none focus:border-blue-500/50 placeholder-white/30"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </form>

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-white/50">AI가 최신 트렌드를 분석하고 있습니다...</p>
          </div>
        )}

        {/* 트렌드 표시 */}
        {!isLoading && trends && (
          <div className="space-y-8">
            {/* 카테고리별 트렌드 */}
            {['테크', '뉴스', '유튜브', 'SNS'].map(category => {
              const categoryTrends = trends.trends.filter(trend => trend.category === category);
              if (categoryTrends.length === 0) return null;

              return (
                <div key={category} className="border-t border-white/10 pt-8 first:border-t-0 first:pt-0">
                  <h2 className="text-2xl font-medium mb-6">{category}</h2>
                  <div className="space-y-6">
                    {categoryTrends.map((trend, index) => (
                      <article key={index} className="space-y-3">
                        <h3 className="text-xl font-medium text-white/90">{trend.title}</h3>
                        <p className="text-white/70">{trend.summary}</p>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-white/50">{trend.source}</span>
                          <a
                            href={trend.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline"
                          >
                            자세히 보기
                          </a>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
