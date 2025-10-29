'use client';

import React, { useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

interface SourceItem {
  title: string;
  link: string;
  snippet: string;
  source: string;
}

interface RecommendationItem {
  // 공통 필드
  category: string;
  name?: string;  // 장소/상품명
  title?: string;  // 문서/뉴스 제목
  imageUrl?: string | null;
  summary: string;
  sourceURL: string;
  source: string | null;
  
  // 새로 추가된 필드
  description?: string;  // 상세 설명
  location?: string;     // 정확한 위치 정보
  video?: string | null; // 비디오 링크
  
  // 맛집/카페 전용
  address?: string | null;
  rating?: string | null;
  menu?: string | null;
  price_range?: string | null;
  
  // 뉴스 전용
  published_date?: string | null;
  author?: string | null;
  // 출처 정보 추가
  sources?: SourceItem[]; // 출처 정보 추가
}

interface ProcessingStatus {
  stage: string;
  message: string;
  progress: number;
}

export default function AllimpormentPage() {
  const [activeTab, setActiveTab] = useState<'answer' | 'sources'>('answer');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<ProcessingStatus>({
    stage: 'idle',
    message: '검색 대기 중',
    progress: 0,
  });
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [summaryAnswer, setSummaryAnswer] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const API_URL = 'https://allimpom-run-service-1027717723153.asia-northeast3.run.app/stream';

  const updateStatus = (stage: string, message: string, progress: number) => {
    setStatus({ stage, message, progress });
  };

// 데이터 처리 로직 수정
  const handleSearch = async () => {
    if (!query.trim()) {
      alert('유튜브에서 모두트리 검색');
      return;
    }

    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setLoading(true);
    setError('');
    setRecommendations([]);
    setSummaryAnswer('');
    setSources([]);
    updateStatus('started', '검색 시작...', 10);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            query: query.trim(), 
            include_sources: true  // 출처 정보 요청
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('응답 본문이 없습니다.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          console.log('✅ 스트림 종료');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 마지막 불완전한 줄 보관

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data:')) continue;

          const jsonStr = line.substring(5).trim(); // 'data:' 제거
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);
            console.log('📦 받은 데이터:', data);

            // 분류
            if (data.stage === 'classify') {
              if (data.status === 'finished') {
                updateStatus('classify', data.message || `카테고리: ${data.category}`, data.progress || 10);
              }
            }

            // 검색
            else if (data.stage === 'search') {
              if (data.status === 'started') {
                updateStatus('search', data.message || '🔍 검색 중...', data.progress || 10);
              } else if (data.status === 'finished') {
                updateStatus('search', data.message || '✅ 검색 완료', data.progress || 25);
              }
            }

            // 필터링
            else if (data.stage === 'filter') {
              if (data.status === 'finished') {
                updateStatus('filter', data.message || `${data.count}개 결과 발견`, data.progress || 30);
              }
            }

            // 스크래핑
            else if (data.stage === 'scrape') {
              if (data.status === 'started') {
                updateStatus('scrape', data.message || '📄 페이지 분석 중...', data.progress || 35);
              } else if (data.status === 'finished') {
                updateStatus('scrape', data.message || `✅ ${data.count}개 페이지 분석 완료`, data.progress || 60);
              }
            }

            // 합성 (LLM) - 스트리밍 지원
            else if (data.stage === 'synthesis') {
              if (data.status === 'started') {
                updateStatus('synthesis', data.message || '✨ 답변 생성 중...', data.progress || 65);
              } else if (data.status === 'streaming') {
                // 🔥 실시간 답변 업데이트
                if (data.partial_answer) {
                  setSummaryAnswer(data.partial_answer);
                  setActiveTab('answer');
                }
                updateStatus('synthesis', data.message || '✨ 답변 생성 중...', data.progress || 70);
              } else if (data.status === 'finished') {
                updateStatus('synthesis', data.message || '✅ 답변 생성 완료', data.progress || 95);
              }
            }

            // 캐시 히트
            else if (data.stage === 'cache' && data.status === 'hit') {
              updateStatus('cache', '💾 캐시된 결과 불러오는 중...', 20);
            }

            // 완료
            else if (data.stage === 'complete') {
              if (data.status === 'finished' || data.status === 'success') {
                const cacheLabel = data.from_cache ? ' (캐시)' : '';
                updateStatus('complete', data.message || `✅ 완료 (${data.duration_sec}초)${cacheLabel}`, 100);

                if (data.answer_summary || data.summary) {
                  setSummaryAnswer(data.answer_summary || data.summary);
                  setActiveTab('answer');
                }

                if (data.sources || data.results) {
                  setSources(data.sources || data.results);
                }

                setLoading(false);
              }
            }

            // 에러
            else if (data.stage === 'error' || data.error) {
              console.error('서버 에러:', data.error);
              setError(data.error || '알 수 없는 오류');
              updateStatus('error', '오류 발생', 0);
              setLoading(false);
            }

          } catch (parseError) {
            console.warn('JSON 파싱 오류:', parseError);
          }
        }
      }

    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        console.log('요청 취소됨');
        return;
      }

      const errorMsg = err instanceof Error ? err.message : '알 수 없는 오류';
      setError(`연결 오류: ${errorMsg}`);
      updateStatus('error', '오류 발생', 0);

    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
      updateStatus('idle', '검색 취소됨', 0);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 py-8 px-4 md:py-20 md:px-10">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 md:mb-10 text-center">
          <div className="flex justify-center mb-2">
            <Image
              src="/logos/logohole.png"
              alt="모두트리 로고"
              width={120}
              height={90}
              className="opacity-90"
            />
          </div>
          <h1 className="text-2xl font-bold text-white">모두트리</h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          <input
            type="text"
            placeholder="검색어를 입력하세요"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 border border-gray-600 bg-gray-800 text-white p-3 md:p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 text-sm md:text-base"
            disabled={loading}
          />

          {loading ? (
            <button
              onClick={handleCancel}
              className="bg-red-600 text-white px-4 py-3 md:px-6 rounded-lg hover:bg-red-700 transition w-full sm:w-auto text-sm md:text-base"
            >
              취소
            </button>
          ) : (
            <button
              onClick={handleSearch}
              className="bg-blue-600 text-white px-4 py-3 md:px-6 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 w-full sm:w-auto text-sm md:text-base"
              disabled={!query.trim()}
            >
              검색
            </button>
          )}
        </div>

         {/* 로딩 상태 표시 */}
                {loading && (
                  <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Loader2 className="animate-spin h-5 w-5 text-blue-400" />
                      <span className="font-semibold text-white">{status.message}</span>
                    </div>
                    
                    {/* 프로그레스 바 */}
                    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full transition-all duration-300 ease-out"
                        style={{ width: `${status.progress}%` }}
                      />
                    </div>
                  </div>
                )}

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-200 font-semibold">오류: {error}</p>
            <button
              onClick={() => setError('')}
              className="text-red-400 text-sm mt-2 hover:underline"
            >
              닫기
            </button>
          </div>
        )}

        {(recommendations.length > 0 || summaryAnswer) && (
          <div className="flex gap-2 md:gap-4 mb-6 border-b border-gray-600 overflow-x-auto">
            <button
              onClick={() => setActiveTab('answer')}
              className={`px-3 md:px-4 py-2 font-semibold transition text-sm md:text-base whitespace-nowrap ${
                activeTab === 'answer'
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              통합 답변
            </button>
            <button
              onClick={() => setActiveTab('sources')}
              className={`px-3 md:px-4 py-2 font-semibold transition text-sm md:text-base whitespace-nowrap ${
                activeTab === 'sources'
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              참고 출처 ({sources.length})
            </button>
          </div>
        )}

        {activeTab === 'answer' && summaryAnswer && (
          <div className="bg-gray-800 border border-gray-600 rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4 text-white">
              통합 답변
            </h2>

            <div className="prose prose-sm max-w-none mb-6">
              <p className="text-gray-200 text-base leading-relaxed whitespace-pre-wrap">
                {summaryAnswer}
              </p>
            </div>

            {sources.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-600">
                <h3 className="text-lg font-semibold mb-4 text-gray-200">
                  참고 출처
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sources.map((source, index) => (
                    <a
                      key={index}
                      href={source.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg border border-gray-600 transition"
                    >
                      <p className="font-medium text-gray-100 text-sm line-clamp-2 mb-1">
                        {source.title}
                      </p>
                      <p className="text-xs text-gray-300 line-clamp-2 mb-2">
                        {source.snippet}
                      </p>
                      <span className="text-xs font-semibold text-blue-400">
                        {source.source}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {/* 출처 탭 */}
        {activeTab === 'sources' && sources.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4 text-white">
              참고 출처
            </h2>
            {sources.map((source, index) => (
              <a
                key={index}
                href={source.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 transition"
              >
                <p className="font-semibold text-gray-100 mb-2">
                  {source.title}
                </p>
                <p className="text-sm text-gray-300 line-clamp-2 mb-2">
                  {source.snippet}
                </p>
                <span className="text-xs font-medium text-blue-400">
                  {source.source}
                </span>
              </a>
            ))}
          </div>
        )}

        {/* 기존 recommendations 렌더링은 제거 */}
        {false && activeTab === 'sources' && recommendations.length > 0 && (
          <div className="grid gap-4">
            {recommendations.map((item, index) => (
              <div
                key={`${item.name || item.title}-${index}`}
                className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow"
              >
                <div className={`flex ${item.imageUrl ? 'gap-4' : ''}`}>
                  {item.imageUrl && (
                    <div className="w-32 h-32 flex-shrink-0">
                      <img
                        src={item.imageUrl}
                        alt={item.name || item.title}
                        className="w-full h-full object-cover rounded-lg bg-gray-200"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.dataset.fallback) {
                            target.dataset.fallback = 'true';
                            target.src = `https://placehold.co/128x128/e0e0e0/999999?text=${(item.name || item.title || 'No')
                              .substring(0, 2)
                              .toUpperCase()}`;
                          }
                        }}
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold truncate pr-2">
                        {item.name || item.title}
                      </h3>
                      {item.rating && (
                        <span className="text-yellow-500 font-semibold whitespace-nowrap text-sm">
                          {item.rating}
                        </span>
                      )}
                    </div>

                    {item.address && (
                      <p className="text-gray-600 text-sm mb-2">{item.address}</p>
                    )}

                    <p className="text-gray-700 text-sm mb-3 line-clamp-2">
                      {item.summary}
                    </p>

                    {item.location && (
                      <div className="text-sm text-gray-600 mb-2">
                        📍 {item.location}
                      </div>
                    )}

                    {item.video && (
                      <a
                        href={item.video}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 text-sm mb-2 inline-block hover:underline"
                      >
                        🎥 비디오 보기
                      </a>
                    )}

                    <div className="flex flex-wrap gap-2 mb-3 text-xs">
                      {item.menu && (
                        <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded">
                          {item.menu}
                        </span>
                      )}
                      {item.price_range && (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                          {item.price_range}
                        </span>
                      )}
                      {item.published_date && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {item.published_date}
                        </span>
                      )}
                    </div>

                    {item.sourceURL && (
                      <a
                        href={item.sourceURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 text-sm inline-block hover:underline font-medium"
                      >
                        {item.source || '상세정보'} →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!summaryAnswer && !loading && !error && (
          <div className="text-center py-4">
            
            <p className="text-gray-400 text-lg">
              모두트리 통합 검색 페이지입니다. 
            </p>
          </div>
        )}
      </div>
      
      {/* 하단 여백 */}
      <div className="pb-12"></div>
    </main>
  );
}