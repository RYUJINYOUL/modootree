'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { useSelector } from 'react-redux';
import { addDoc, collection, query, orderBy, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { PenSquare, Search, Trash2, Eye, X, Grid, List, ChevronDown, ChevronUp } from 'lucide-react';
import { auth } from '@/firebase';

interface AnalysisItem {
  id: string;
  content: string;
  createdAt: Date;
  summaryPoints?: string[];
  keywords?: string[];
  category?: string;
  learningPoints?: string[];
  actionItems?: string[];
  references?: string[];
  isAnalyzed: boolean;
}

export default function AnalysisPage() {
  const { currentUser } = useSelector((state: any) => state.user);
  const [content, setContent] = useState('');
  const [items, setItems] = useState<AnalysisItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null); // 분석 중인 항목의 id
  const [selectedItem, setSelectedItem] = useState<AnalysisItem | null>(null); // 상세 보기용
  const [viewMode, setViewMode] = useState<'simple' | 'detailed'>('simple'); // 뷰 모드
  const [isContentExpanded, setIsContentExpanded] = useState(false); // 원본 내용 펼치기 상태
  const [isInputSectionExpanded, setIsInputSectionExpanded] = useState(false); // AI 대화 저장 영역 펼치기 상태

  // 실시간 데이터 구독
  useEffect(() => {
    if (!currentUser?.uid) return;

    const q = query(
      collection(db, `users/${currentUser.uid}/analysis`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as AnalysisItem[];
      setItems(loadedItems);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // 새 글 저장
  const handleSave = async () => {
    if (!content.trim() || !currentUser?.uid) return;
    
    try {
      await addDoc(collection(db, `users/${currentUser.uid}/analysis`), {
        content: content,
        createdAt: new Date(),
        isAnalyzed: false
      });
      setContent('');
    } catch (error) {
      console.error('저장 실패:', error);
    }
  };

  // 분석 실행
  const handleAnalyze = async (itemId: string) => {
    if (!currentUser?.uid || isAnalyzing) return;
    
    setIsAnalyzing(itemId);
    try {
      // 분석할 아이템 찾기
      const item = items.find(item => item.id === itemId);
      if (!item) {
        throw new Error('분석할 항목을 찾을 수 없습니다.');
      }

      // Firebase Auth 토큰 가져오기
      const user = auth.currentUser;
      if (!user) {
        throw new Error('사용자 인증이 필요합니다.');
      }
      
      const token = await user.getIdToken();

      // API 호출
      const response = await fetch('/api/conversation-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: item.content,
          token: token
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '분석에 실패했습니다.');
      }

      // 분석 결과 저장
      const { analysis } = result;
      await updateDoc(doc(db, `users/${currentUser.uid}/analysis`, itemId), {
        summaryPoints: analysis.summaryPoints,
        keywords: analysis.keywords,
        category: analysis.category,
        learningPoints: analysis.learningPoints,
        actionItems: analysis.actionItems,
        references: analysis.references,
        isAnalyzed: true
      });

    } catch (error) {
      console.error('분석 실패:', error);
      alert('분석 중 오류가 발생했습니다: ' + (error as Error).message);
    } finally {
      setIsAnalyzing(null);
    }
  };

  // 삭제 실행
  const handleDelete = async (itemId: string) => {
    if (!currentUser?.uid) return;
    
    if (window.confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      try {
        await deleteDoc(doc(db, `users/${currentUser.uid}/analysis`, itemId));
      } catch (error) {
        console.error('삭제 실패:', error);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  return (
    <div className="flex-1 md:p-6 py-6 overflow-auto">
      <div className="px-2 md:px-0">
        {/* 입력 영역 */}
        <div className="bg-[#2A4D45]/60 backdrop-blur-sm border border-[#358f80]/30 rounded-xl mb-6">
          {/* 헤더 - 접기/펼치기 버튼 */}
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-xl font-bold text-white">챗gpt 제미나이 클로드 대화 입력</h2>
            <button
              onClick={() => setIsInputSectionExpanded(!isInputSectionExpanded)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              {isInputSectionExpanded ? (
                <>
                  접기 <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  펼치기 <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* 입력 폼 - 조건부 렌더링 */}
          {isInputSectionExpanded && (
            <div className="px-6 pb-6">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="사용하시는 AI에게 오늘 대화 내용 정리 요청 후 - 3000자 이내로 저장해 주세요"
                className="w-full h-[200px] bg-[#358f80]/30 rounded-lg p-4 mb-4 text-white placeholder-gray-400 resize-none whitespace-pre-wrap"
                style={{ whiteSpace: 'pre-wrap' }}
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={!content.trim()}
                  className="bg-[#56ab91]/60 hover:bg-[#56ab91]/80 px-6 py-2 rounded-lg text-white disabled:opacity-50"
                >
                  저장하기
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 뷰 모드 토글 */}
        {items.length > 0 && (
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-white">저장된 대화 ({items.length}개)</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('simple')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'simple' 
                    ? 'bg-[#56ab91]/60 text-white' 
                    : 'bg-[#2A4D45]/40 text-gray-400 hover:text-white'
                }`}
              >
                <Grid className="w-4 h-4" />
                간단보기
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'detailed' 
                    ? 'bg-[#56ab91]/60 text-white' 
                    : 'bg-[#2A4D45]/40 text-gray-400 hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
                상세보기
              </button>
            </div>
          </div>
        )}

        {/* 저장된 목록 */}
        <div className={viewMode === 'simple' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
          {items.map((item) => (
            <div key={item.id} className="bg-[#2A4D45]/60 backdrop-blur-sm border border-[#358f80]/30 rounded-xl p-6">
              
              {/* 간단 보기 - 요약문만 */}
              {viewMode === 'simple' ? (
                <div className="cursor-pointer hover:bg-[#2A4D45]/80 transition-colors rounded-lg p-2 -m-2" onClick={() => setSelectedItem(item)}>
                  {/* 헤더 */}
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs text-gray-400">
                      {format(item.createdAt, 'MM/dd', { locale: ko })}
                    </span>
                    <div className="flex gap-1">
                      {!item.isAnalyzed && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAnalyze(item.id);
                          }}
                          disabled={isAnalyzing === item.id}
                          className="text-xs bg-[#56ab91]/60 hover:bg-[#56ab91]/80 px-2 py-1 rounded text-white"
                        >
                          {isAnalyzing === item.id ? '분석중' : '분석'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 요약문만 표시 - 독립적인 카드들 */}
                  {item.isAnalyzed && item.summaryPoints && item.summaryPoints.length > 0 ? (
                    <div className="space-y-3">
                      {item.summaryPoints.map((point, idx) => (
                        <div key={idx} className="bg-[#358f80]/15 rounded-lg p-3 border-l-2 border-[#56ab91]/50">
                          <div className="text-gray-300 text-sm leading-relaxed flex items-start">
                
                            <span>{point}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* 분석되지 않은 경우 원본 내용 미리보기 */
                    <p className="text-gray-300 text-sm line-clamp-3 leading-relaxed">
                      {item.content}
                    </p>
                  )}

                  {/* 분석되지 않은 경우 안내 */}
                  {!item.isAnalyzed && (
                    <div className="mt-3 pt-3 border-t border-[#358f80]/20">
                      <p className="text-xs text-gray-400 text-center">분석하면 요약을 확인할 수 있습니다</p>
                    </div>
                  )}
                </div>
              ) : (
                /* 상세 보기 (기존 코드) */
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-sm text-gray-400">
                        {format(item.createdAt, 'PPP', { locale: ko })}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {!item.isAnalyzed && (
                        <button
                          onClick={() => handleAnalyze(item.id)}
                          disabled={isAnalyzing === item.id}
                          className="flex items-center gap-2 bg-[#56ab91]/60 hover:bg-[#56ab91]/80 px-4 py-2 rounded-lg text-white"
                        >
                          <Search className="w-4 h-4" />
                          {isAnalyzing === item.id ? '분석 중...' : '분석하기'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="flex items-center gap-2 bg-red-500/60 hover:bg-red-500/80 px-4 py-2 rounded-lg text-white"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                        삭제
                      </button>
                    </div>
                  </div>

                  {/* 원본 내용 */}
                  <div className="mb-4">
                    <p className="text-gray-300 line-clamp-3 cursor-pointer hover:text-white transition-colors whitespace-pre-wrap" 
                       onClick={() => setSelectedItem(item)}
                       title="클릭하여 전체 내용 보기">
                      {item.content}
                    </p>
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="mt-2 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      전체 내용 보기
                    </button>
                  </div>

                  {/* 분석 결과 */}
                  {item.isAnalyzed && (
                    <div className="mt-4 pt-4 border-t border-[#358f80]/30">
                      <h3 className="text-lg font-medium mb-3 text-white">분석 결과</h3>
                  
                  {/* 요약 */}
                  {item.summaryPoints && item.summaryPoints.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">요약</h4>
                      <ul className="space-y-2">
                        {item.summaryPoints.map((point, idx) => (
                          <li key={idx} className="text-gray-300 text-sm flex items-start leading-relaxed">
                            <span className="text-[#56ab91] mr-2 mt-1">•</span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 분야 */}
                  {item.category && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">분야</h4>
                      <span className="bg-[#469d89]/40 px-3 py-1 rounded-full text-sm text-white font-medium">
                        {item.category}
                      </span>
                    </div>
                  )}

                  {/* 키워드 */}
                  {item.keywords && item.keywords.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">키워드</h4>
                      <div className="flex flex-wrap gap-2">
                        {item.keywords.map((keyword, idx) => (
                          <span key={idx} className="bg-[#358f80]/30 px-3 py-1 rounded-full text-sm text-white">
                            #{keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 학습 포인트 */}
                  {item.learningPoints && item.learningPoints.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">학습 포인트</h4>
                      <ul className="space-y-1">
                        {item.learningPoints.map((point, idx) => (
                          <li key={idx} className="text-gray-300 text-sm flex items-start">
                            <span className="text-[#56ab91] mr-2">📚</span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 실행 계획 */}
                  {item.actionItems && item.actionItems.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">실행 계획</h4>
                      <ul className="space-y-1">
                        {item.actionItems.map((action, idx) => (
                          <li key={idx} className="text-gray-300 text-sm flex items-start">
                            <span className="text-[#56ab91] mr-2">✅</span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 상세 보기 다이얼로그 */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2A4D45]/95 backdrop-blur-sm border border-[#358f80]/30 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-6 border-b border-[#358f80]/30">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">AI 대화 분석</h2>
                <span className="text-sm text-gray-400">
                  {format(selectedItem.createdAt, 'PPP', { locale: ko })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleDelete(selectedItem.id);
                    setSelectedItem(null);
                    setIsContentExpanded(false);
                  }}
                  className="flex items-center gap-2 bg-red-500/60 hover:bg-red-500/80 px-3 py-2 rounded-lg text-white text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  삭제
                </button>
                <button
                  onClick={() => {
                    setSelectedItem(null);
                    setIsContentExpanded(false); // 다이얼로그 닫을 때 상태 초기화
                  }}
                  className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-[#358f80]/30"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* 내용 */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* 원본 대화 내용 */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-white">원본 대화 내용</h3>
                  <button
                    onClick={() => setIsContentExpanded(!isContentExpanded)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {isContentExpanded ? (
                      <>
                        접기 <ChevronUp className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        더보기 <ChevronDown className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-[#358f80]/20 rounded-lg p-4">
                  <p className={`text-gray-300 whitespace-pre-wrap leading-relaxed ${
                    isContentExpanded ? '' : 'line-clamp-3'
                  }`}>
                    {selectedItem.content}
                  </p>
                </div>
              </div>

              {/* 분석 결과 */}
              {selectedItem.isAnalyzed ? (
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">분석 결과</h3>
                  <div className="bg-[#56ab91]/20 rounded-lg p-6 space-y-6">
                    
                    {/* 요약 */}
                    {selectedItem.summaryPoints && selectedItem.summaryPoints.length > 0 && (
                      <div>
                        <h4 className="text-base font-medium text-white mb-3">요약</h4>
                        <div className="space-y-3">
                          {selectedItem.summaryPoints.map((point, idx) => (
                            <div key={idx} className="bg-[#358f80]/15 rounded-lg p-4">
                              <p className="text-gray-300 leading-relaxed">
                                {point}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 분야 */}
                    {selectedItem.category && (
                      <div>
                        <h4 className="text-base font-medium text-white mb-3">분야</h4>
                        <span className="bg-[#469d89]/40 px-4 py-2 rounded-full text-base text-white font-medium">
                          {selectedItem.category}
                        </span>
                      </div>
                    )}

                    {/* 키워드 */}
                    {selectedItem.keywords && selectedItem.keywords.length > 0 && (
                      <div>
                        <h4 className="text-base font-medium text-white mb-3">키워드</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedItem.keywords.map((keyword, idx) => (
                            <span key={idx} className="bg-[#358f80]/40 px-4 py-2 rounded-full text-sm text-white font-medium">
                              #{keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 학습 포인트 */}
                    {selectedItem.learningPoints && selectedItem.learningPoints.length > 0 && (
                      <div>
                        <h4 className="text-base font-medium text-white mb-3">학습 포인트</h4>
                        <div className="space-y-3">
                          {selectedItem.learningPoints.map((point, idx) => (
                            <div key={idx} className="bg-[#56ab91]/20 rounded-lg p-4">
                              <p className="text-gray-300">
                                {point}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 실행 계획 */}
                    {selectedItem.actionItems && selectedItem.actionItems.length > 0 && (
                      <div>
                        <h4 className="text-base font-medium text-white mb-3">실행 계획</h4>
                        <div className="space-y-3">
                          {selectedItem.actionItems.map((action, idx) => (
                            <div key={idx} className="bg-[#358f80]/20 rounded-lg p-4">
                              <p className="text-gray-300">
                                {action}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 참고 자료 */}
                    {selectedItem.references && selectedItem.references.length > 0 && (
                      <div>
                        <h4 className="text-base font-medium text-white mb-3">참고 자료</h4>
                        <div className="space-y-2">
                          {selectedItem.references.map((reference, idx) => (
                            <div key={idx} className="bg-[#469d89]/20 rounded-lg p-3">
                              <p className="text-gray-300">
                                {reference}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">아직 분석되지 않은 대화입니다.</p>
                  <button
                    onClick={() => {
                      handleAnalyze(selectedItem.id);
                      setSelectedItem(null);
                    }}
                    disabled={isAnalyzing === selectedItem.id}
                    className="flex items-center gap-2 bg-[#56ab91]/60 hover:bg-[#56ab91]/80 px-6 py-3 rounded-lg text-white mx-auto"
                  >
                    <Search className="w-4 h-4" />
                    지금 분석하기
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}