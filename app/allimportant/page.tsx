'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://allimpom-run-service-1027717723153.asia-northeast3.run.app/stream';

export default function AllImportantPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // 컴포넌트가 언마운트될 때 진행 중인 요청을 취소
    return () => {
      setIsLoading(false);
    };
  }, []);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    setSearchResults([]);
    setError(null);
    setProgress(0);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchTerm.trim(),
          include_sources: true,
        }),
      });

      if (!response.ok) {
        throw new Error('검색 요청이 실패했습니다.');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('응답을 읽을 수 없습니다.');
      }

      let receivedLength = 0;
      const contentLength = parseInt(response.headers.get('Content-Length') || '0');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        receivedLength += value.length;
        if (contentLength) {
          setProgress((receivedLength / contentLength) * 100);
        }

        const text = new TextDecoder().decode(value);
        const lines = text.split('\n').filter(line => line.trim());

        lines.forEach(line => {
          try {
            const data = JSON.parse(line);
            if (data.content) {
              setSearchResults(prev => [...prev, data.content]);
            }
          } catch (e) {
            console.error('Failed to parse line:', line);
          }
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
      setProgress(100);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      {/* 검색 헤더 */}
      <div className="sticky top-0 bg-[#1a1a1a] border-b border-[#333] z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Input
              type="text"
              placeholder="검색어를 입력하세요..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 bg-[#2a2a2a] border-[#444] text-white placeholder-gray-400"
            />
            <Button
              onClick={handleSearch}
              disabled={isLoading || !searchTerm.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                '검색'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 검색 결과 */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {isLoading && progress < 100 && (
          <div className="mb-6">
            <div className="h-1 bg-[#333] rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-400 mt-2">검색 중... {Math.round(progress)}%</p>
          </div>
        )}

        <div className="space-y-6">
          {searchResults.map((result, index) => (
            <div
              key={index}
              className="p-6 bg-[#2a2a2a] rounded-lg border border-[#444] hover:border-[#666] transition-colors"
            >
              <p className="text-gray-200 whitespace-pre-wrap">{result}</p>
            </div>
          ))}
        </div>

        {!isLoading && searchResults.length === 0 && searchTerm && (
          <div className="text-center text-gray-400 py-12">
            검색 결과가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}