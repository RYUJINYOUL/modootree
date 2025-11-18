'use client';

import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { doc, setDoc, updateDoc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, Calendar, Save, Sparkles, Camera, Upload, X, Image, Edit3, Check, XCircle, CalendarIcon, RefreshCw, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface MemoItem {
  id: string;
  text: string;
  saved: boolean;
}

interface LinkItem {
  id: string;
  url: string;
  saved: boolean;
}

interface AnalysisResult {
  todos: MemoItem[];
  schedules: MemoItem[];
  info: MemoItem[];
  links: LinkItem[];
  general: MemoItem[];
}

export default function MemoPage() {
  const { currentUser } = useSelector((state: any) => state.user);
  
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">로그인이 필요한 서비스입니다</h2>
          <p className="text-gray-400">메모 기능을 사용하려면 회원가입 후 로그인해주세요.</p>
          <div className="space-x-4">
            <Button onClick={() => window.location.href = '/login'} className="bg-blue-600 hover:bg-blue-700">
              로그인
            </Button>
            <Button onClick={() => window.location.href = '/signup'} className="bg-green-600 hover:bg-green-700">
              회원가입
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 새로운 상태들
  const [freeText, setFreeText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'pc' | 'mobile'>('pc'); // New state for active tab
  
  // 로컬 스토리지 키
  const STORAGE_KEY_PREFIX = `freememo_draft_${currentUser?.uid}`; // Prefix for storage key
  const getStorageKey = (tab: 'pc' | 'mobile') => `${STORAGE_KEY_PREFIX}_${tab}`; // Function to get storage key
  
  // 이미지 관련 상태
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 수정 관련 상태
  const [editingItems, setEditingItems] = useState<{[key: string]: boolean}>({});
  const [editTexts, setEditTexts] = useState<{[key: string]: string}>({});
  
  // 메모 저장 관련 상태
  const [savingItem, setSavingItem] = useState<{id: string, type: string, text: string} | null>(null);
  const [saveDate, setSaveDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  // 기존 calendarOpen 외에 추가
const [mobileCalendarOpen, setMobileCalendarOpen] = useState(false);
  
  // 링크 저장 로딩 상태
  const [savingLinkIds, setSavingLinkIds] = useState<Set<string>>(new Set());

  // Firestore 구조: freememo+uid 컬렉션, 날짜별 문서
  const getCollectionName = () => `freememo+${currentUser.uid}`;
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 컴포넌트 마운트 시 로컬 스토리지에서 내용 불러오기
  useEffect(() => {
    if (currentUser?.uid) {
      const savedContent = localStorage.getItem(getStorageKey(activeTab)); // Use getStorageKey
      if (savedContent) {
        setFreeText(savedContent);
      } else {
        setFreeText(''); // Clear text if no saved content for the active tab
      }
    }
  }, [currentUser?.uid, activeTab]); // Add activeTab to dependencies

  // 텍스트 업데이트 헬퍼 함수 (로컬 스토리지 자동 저장 포함)
  const updateFreeText = (newText: string) => {
    setFreeText(newText);
    if (currentUser?.uid) {
      localStorage.setItem(getStorageKey(activeTab), newText); // Use getStorageKey
    }
  };

  // 텍스트 변경 핸들러 (로컬 스토리지 자동 저장)
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    updateFreeText(newText);
  };

  // 새로고침 (삭제) 기능
  const handleRefresh = () => {
    if (freeText.trim() && !window.confirm('작성 중인 내용이 모두 삭제됩니다. 계속하시겠습니까?')) {
      return;
    }
    
    updateFreeText('');
    setAnalysisResult(null);
    localStorage.removeItem(getStorageKey(activeTab)); // Remove item from local storage for active tab
  };

  // 이미지 업로드 처리
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setUploadedImages(prev => [...prev, result]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  // 이미지 제거
  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // OCR 처리 (Gemini Flash)
  const handleOCR = async () => {
    if (uploadedImages.length === 0) {
      alert('OCR을 실행할 이미지를 먼저 업로드해주세요.');
      return;
    }

    setIsOCRProcessing(true);
    
    try {
      // Gemini Flash OCR API 호출
      const response = await fetch('/api/gemini-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          images: uploadedImages 
        })
      });

      if (response.ok) {
        const result = await response.json();
        const extractedText = result.text || '';
        
        // OCR 결과를 기존 텍스트에 추가 (로컬 스토리지 자동 저장)
        const separator = freeText.trim() ? '\n\n' : '';
        const newText = freeText + separator + `📷 이미지에서 추출된 텍스트:\n${extractedText}`;
        updateFreeText(newText);
        
        // 상세 결과 표시
        const successCount = result.extractedCount || 0;
        const failedCount = result.failedCount || 0;
        const totalCount = result.imageCount || 0;
        
        if (failedCount > 0) {
          alert(`OCR 완료! ${totalCount}개 중 ${successCount}개 성공, ${failedCount}개 실패\n\n실패 원인을 확인하려면 개발자 도구 콘솔을 확인하세요.`);
        } else {
          alert(`OCR 완료! ${totalCount}개 이미지 모두 성공적으로 처리되었습니다.`);
        }
      } else {
        // API 호출 실패 - 상세 오류 정보 표시
        const errorText = await response.text();
        console.error('OCR API 호출 실패:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        });
        
        alert(`OCR API 호출 실패!\n상태: ${response.status} ${response.statusText}\n\n개발자 도구 콘솔에서 상세 오류를 확인하세요.`);
      }
    } catch (error) {
      console.error('OCR 오류:', error);
      alert('OCR 처리 중 오류가 발생했습니다.');
    } finally {
      setIsOCRProcessing(false);
    }
  };

  // AI 분석 함수 (실제 AI API 사용)
  const handleAnalyze = async () => {
    if (!freeText.trim()) {
      alert('분석할 내용을 입력해주세요.');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // AI 분석 서비스 호출
      const { analyzeMemoWithAI, convertAnalysisToUIFormat } = await import('@/lib/services/ai-analysis');
      
      const analysis = await analyzeMemoWithAI(freeText);
      const uiResult = convertAnalysisToUIFormat(analysis);
      
      setAnalysisResult(uiResult);
      
      // 분석 결과 피드백
      const totalItems = analysis.todos.length + analysis.schedules.length + 
                        analysis.info.length + analysis.general.length + analysis.links.length;
      
      if (totalItems === 0) {
        alert('분석할 수 있는 내용이 발견되지 않았습니다. 더 구체적인 내용을 작성해보세요.');
      } else {
        console.log(`✅ AI 분석 완료: 총 ${totalItems}개 항목 추출`);
      }
      
    } catch (error) {
      console.error('AI 분석 오류:', error);
      
      // AI 분석 실패 시 기본 링크 추출만 수행
      const linkUrls = freeText.match(/https?:\/\/[^\s]+/g) || [];
      const fallbackResult: AnalysisResult = {
        todos: [],
        schedules: [],
        info: [],
        links: linkUrls.map((url, index) => ({
          id: `link-${Date.now()}-${index}`,
          url,
          saved: false
        })),
        general: []
      };
      
      setAnalysisResult(fallbackResult);
      alert('AI 분석 중 오류가 발생했습니다. 링크만 추출되었습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 개별 아이템 저장 함수
  const handleSaveItem = async (itemId: string, type: 'todo' | 'schedule' | 'info' | 'link' | 'general') => {
    if (!analysisResult || !currentUser?.uid) {
      alert('분석 결과가 없거나 로그인이 필요합니다.');
      return;
    }

    // 링크인 경우 즉시 links 컬렉션에 자동 저장
    if (type === 'link') {
      return await handleSaveLinkToCollection(itemId);
    }

    // 나머지는 기존 방식 (날짜 선택 다이얼로그)
    let item: MemoItem | LinkItem | null = null;
    let itemText = '';

    // 아이템 찾기
    switch (type) {
      case 'todo':
        item = analysisResult.todos.find(t => t.id === itemId) || null;
        itemText = (item as MemoItem)?.text || '';
        break;
      case 'schedule':
        item = analysisResult.schedules.find(s => s.id === itemId) || null;
        itemText = (item as MemoItem)?.text || '';
        break;
      case 'info':
        item = analysisResult.info.find(i => i.id === itemId) || null;
        itemText = (item as MemoItem)?.text || '';
        break;
      case 'general':
        item = analysisResult.general.find(g => g.id === itemId) || null;
        itemText = (item as MemoItem)?.text || '';
        break;
    }

    if (!item) {
      alert('아이템을 찾을 수 없습니다.');
      return;
    }

    // 날짜 선택 다이얼로그 열기
    setSavingItem({ id: itemId, type, text: itemText });
    setSaveDate(new Date());
  };

  // 링크 전용 자동 저장 함수
  const handleSaveLinkToCollection = async (itemId: string) => {
    if (!analysisResult || !currentUser?.uid) return;

    // 이미 저장 중인 경우 중복 실행 방지
    if (savingLinkIds.has(itemId)) return;

    try {
      // 저장 시작 - 로딩 상태 추가
      setSavingLinkIds(prev => new Set(prev).add(itemId));

      const linkItem = analysisResult.links.find(l => l.id === itemId);
      if (!linkItem) {
        alert('링크를 찾을 수 없습니다.');
        return;
      }

      const url = linkItem.url;

      // 1. 메타데이터 추출
      let metadata = {
        title: url,
        description: '',
        favicon: '',
        thumbnail: ''
      };

      try {
        const metadataResponse = await fetch('/api/link-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        
        if (metadataResponse.ok) {
          const metadataResult = await metadataResponse.json();
          if (metadataResult.success && metadataResult.metadata) {
            metadata = {
              title: metadataResult.metadata.title || url,
              description: metadataResult.metadata.description || '',
              favicon: metadataResult.metadata.favicon || '',
              thumbnail: metadataResult.metadata.image || ''
            };
          }
        }
      } catch (metadataError) {
        console.warn('메타데이터 추출 실패, 기본값 사용:', metadataError);
        // 기본값 그대로 사용
      }

      // 2. AI 카테고리 분류
      let categoryData = { category: 'learning' }; // 기본 카테고리

      try {
        const categoryResponse = await fetch('/api/categorize-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            title: metadata.title || '', 
            description: metadata.description || '', 
            url 
          })
        });
        
        if (categoryResponse.ok) {
          const categoryResult = await categoryResponse.json();
          if (categoryResult.success && categoryResult.category) {
            categoryData = { category: categoryResult.category };
          }
        }
      } catch (categoryError) {
        console.warn('AI 카테고리 분류 실패, 기본 카테고리 사용:', categoryError);
        // 기본 카테고리 그대로 사용
      }

      // 3. links 컬렉션에 저장
      const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
      const linkData = {
        title: metadata.title || url,
        url: normalizedUrl,
        description: metadata.description || '',
        category: categoryData.category || 'learning',
        favicon: metadata.favicon || '',
        thumbnail: metadata.thumbnail || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, `users/${currentUser.uid}/linkpage`), linkData);

      // 4. UI 상태 업데이트
      const updatedResult = { ...analysisResult };
      updatedResult.links = updatedResult.links.map(link => 
        link.id === itemId ? { ...link, saved: true } : link
      );
      setAnalysisResult(updatedResult);

      // 5. 성공 피드백
      const linkCategories = [
        { id: 'learning', name: '배움' },
        { id: 'work', name: '비즈' },
        { id: 'entertainment', name: '재미' },
        { id: 'reference', name: '자료' },
        { id: 'inspiration', name: '영감' },
        { id: 'lifestyle', name: '생활' }
      ];
      
      const categoryName = linkCategories.find(cat => cat.id === (categoryData.category || 'learning'))?.name || '기본';
      const hasMetadata = metadata.title !== url || metadata.description;
      
      if (hasMetadata) {
        alert(`링크가 "${categoryName}" 카테고리로 자동 저장되었습니다!\n제목: ${metadata.title}`);
      } else {
        alert(`링크가 "${categoryName}" 카테고리로 저장되었습니다!\n(메타데이터를 가져올 수 없어 기본 정보로 저장됨)`);
      }

    } catch (error) {
      console.error('링크 저장 오류:', error);
      alert('링크 저장 중 오류가 발생했습니다.');
    } finally {
      // 저장 완료 - 로딩 상태 제거
      setSavingLinkIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  // 메모 컬렉션에 실제 저장
  const handleSaveToMemoCollection = async () => {
    if (!savingItem || !currentUser?.uid) return;

    try {
      // 날짜에 따른 status 결정 (memo 컬렉션 로직과 동일)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const memoDate = new Date(saveDate);
      memoDate.setHours(0, 0, 0, 0);
      
      const status = memoDate.getTime() === today.getTime() ? 'today' : 'todo';

      // 메모 데이터 구성
      const memoData = {
        content: savingItem.text,
        date: saveDate,
        status,
        images: [],
        important: savingItem.type === 'info', // 중요 정보는 important로 설정
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // 메모 컬렉션에 저장
      await addDoc(collection(db, `users/${currentUser.uid}/private_memos`), memoData);

      // UI 상태 업데이트 (저장됨 표시)
      if (analysisResult) {
        const updatedResult = { ...analysisResult };
        
        switch (savingItem.type) {
          case 'todo':
            updatedResult.todos = updatedResult.todos.map(t => 
              t.id === savingItem.id ? { ...t, saved: true } : t
            );
            break;
          case 'schedule':
            updatedResult.schedules = updatedResult.schedules.map(s => 
              s.id === savingItem.id ? { ...s, saved: true } : s
            );
            break;
          case 'info':
            updatedResult.info = updatedResult.info.map(i => 
              i.id === savingItem.id ? { ...i, saved: true } : i
            );
            break;
          case 'general':
            updatedResult.general = updatedResult.general.map(g => 
              g.id === savingItem.id ? { ...g, saved: true } : g
            );
            break;
        }
        
        setAnalysisResult(updatedResult);
      }

      setSavingItem(null);
      alert(`메모가 저장되었습니다! (${format(saveDate, 'M월 d일', { locale: ko })})`);
    } catch (error) {
      console.error('메모 저장 오류:', error);
      alert('메모 저장 중 오류가 발생했습니다.');
    }
  };

  // 수정 관련 함수들
  const startEdit = (itemId: string, currentText: string) => {
    setEditingItems(prev => ({...prev, [itemId]: true}));
    setEditTexts(prev => ({...prev, [itemId]: currentText}));
  };

  const cancelEdit = (itemId: string) => {
    setEditingItems(prev => ({...prev, [itemId]: false}));
    setEditTexts(prev => {
      const newTexts = {...prev};
      delete newTexts[itemId];
      return newTexts;
    });
  };

  const saveEdit = async (itemId: string, type: 'todo' | 'schedule' | 'info') => {
    if (!analysisResult || !currentUser?.uid) return;

    const newText = editTexts[itemId]?.trim();
    if (!newText) {
      alert('내용을 입력해주세요.');
      return;
    }

    try {
      const updatedResult = { ...analysisResult };
      
      if (type === 'todo') {
        updatedResult.todos = updatedResult.todos.map(item => 
          item.id === itemId ? { ...item, text: newText } : item
        );
      } else if (type === 'schedule') {
        updatedResult.schedules = updatedResult.schedules.map(item => 
          item.id === itemId ? { ...item, text: newText } : item
        );
      } else if (type === 'info') {
        updatedResult.info = updatedResult.info.map(item => 
          item.id === itemId ? { ...item, text: newText } : item
        );
      }

      setAnalysisResult(updatedResult);
      setEditingItems(prev => ({...prev, [itemId]: false}));
      setEditTexts(prev => {
        const newTexts = {...prev};
        delete newTexts[itemId];
        return newTexts;
      });

      alert('수정되었습니다!');
    } catch (error) {
      console.error('수정 오류:', error);
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="flex-1 md:p-6 py-6 overflow-auto w-full">
      <div className="px-2 md:px-0 space-y-6 mt-1">

        {/* 자유 입력 영역 */}
        <div className="bg-[#2A4D45]/50 backdrop-blur-sm border border-[#358f80]/30 rounded-xl p-4 sm:p-6 space-y-4">
          <div className="relative">
            <textarea
              value={freeText}
              onChange={handleTextChange}
              placeholder="오늘 있었던 일, 해야 할 일, 링크, 생각 등을 자유롭게 작성해보세요"
              className="w-full min-h-[250px] sm:min-h-[300px] bg-[#358f80]/10 border border-[#358f80]/40 rounded-lg px-3 sm:px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#56ab91] resize-y text-sm sm:text-base"
              style={{ fontFamily: 'inherit' }}
            />
          </div>
        

          {/* Tab buttons for PC/Mobile */}
          <div className="flex justify-center mb-4">
            <Button
              onClick={() => setActiveTab('pc')}
              className={`px-4 py-2 rounded-l-lg text-sm font-medium transition-colors duration-200 ${
                activeTab === 'pc'
                  ? 'bg-[#56ab91] text-white'
                  : 'bg-[#2A4D45]/60 text-gray-300 hover:bg-[#2A4D45]/80'
              }`}
            >
              PC
            </Button>
            <Button
              onClick={() => setActiveTab('mobile')}
              className={`px-4 py-2 rounded-r-lg text-sm font-medium transition-colors duration-200 ${
                activeTab === 'mobile'
                  ? 'bg-[#56ab91] text-white'
                  : 'bg-[#2A4D45]/60 text-gray-300 hover:bg-[#2A4D45]/80'
              }`}
            >
              모바일
            </Button>
          </div>

          {/* 이미지 업로드 섹션 */}
          <div className="border-t border-[#358f80]/30 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
              <h4 className="text-white font-medium flex items-center gap-2">
                <Image className="w-5 h-5 text-[#56ab91]" />
                이미지 업로드 & OCR
              </h4>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-[#358f80]/60 hover:bg-[#358f80]/80 text-white px-4 py-2 text-sm flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <Upload className="w-4 h-4" />
                  이미지 선택
                </Button>
                {uploadedImages.length > 0 && (
                  <Button
                    onClick={handleOCR}
                    disabled={isOCRProcessing}
                    className="bg-[#56ab91]/60 hover:bg-[#56ab91]/80 text-white px-4 py-2 text-sm flex items-center justify-center gap-2 w-full sm:w-auto"
                  >
                    {isOCRProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        OCR 처리 중...
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        텍스트 추출
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* 업로드된 이미지 미리보기 */}
            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                {uploadedImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image}
                      alt={`업로드된 이미지 ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border border-[#358f80]/40"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* 버튼 그룹 */}
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            
            {/* AI 분석 버튼 */}
            <Button
              onClick={handleAnalyze}
              disabled={!freeText.trim() || isAnalyzing}
              className="bg-[#56ab91] hover:bg-[#56ab91]/80 text-white px-8 py-3 flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  분석 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  {analysisResult ? '다시 분석하기' : '메모 링크 분석'}
                </>
              )}
            </Button>
            {/* 새로고침 (삭제) 버튼 */}
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="bg-[#2A4D45]/40 border-[#358f80]/20 text-white hover:bg-red-500/20 hover:border-red-500/40 px-6 py-3 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              새로고침
            </Button>
            
          </div>
        </div>

        {/* 분석 결과 */}
        {analysisResult && (
          <>
            {/* 데스크톱 버전 */}
            <div className="hidden sm:block bg-[#2A4D45]/50 backdrop-blur-sm border border-[#358f80]/30 rounded-xl p-4 sm:p-6 space-y-4">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-[#56ab91]" />
                분석 결과
              </h3>
            
            <div className="space-y-4">
              {/* 할 일 섹션 */}
              {analysisResult.todos.length > 0 && (
                <div className="bg-[#56ab91]/20 p-4 rounded-lg border-l-4 border-[#56ab91]">
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="font-semibold text-white">할일</h4>
                  </div>
                  <div className="space-y-2">
                    {analysisResult.todos.map((todo) => (
                      <div key={todo.id} className="bg-[#56ab91]/10 p-3 rounded border-l-2 border-[#56ab91]/50">
                        {editingItems[todo.id] ? (
                          // 수정 모드
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editTexts[todo.id] || ''}
                              onChange={(e) => setEditTexts(prev => ({...prev, [todo.id]: e.target.value}))}
                              className="w-full bg-[#56ab91]/20 border border-[#56ab91]/40 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#56ab91]"
                              placeholder="할 일을 입력하세요..."
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={() => saveEdit(todo.id, 'todo')}
                                className="bg-[#56ab91] hover:bg-[#56ab91]/80 text-white px-3 py-1 text-xs flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                완료
                              </Button>
                              <Button
                                onClick={() => cancelEdit(todo.id)}
                                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 text-xs flex items-center gap-1"
                              >
                                <XCircle className="w-3 h-3" />
                                취소
                              </Button>
                            </div>
                          </div>
                        ) : (
                          // 일반 모드
                          <div className="flex items-center justify-between">
                            <span className={`text-white ${todo.saved ? 'opacity-50 line-through' : ''}`}>
                              • {todo.text}
                            </span>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => startEdit(todo.id, todo.text)}
                                disabled={todo.saved}
                                className={`px-3 py-1 text-xs ${
                                  todo.saved 
                                    ? 'bg-gray-500 cursor-not-allowed' 
                                    : 'bg-[#358f80] hover:bg-[#358f80]/80'
                                } text-white flex items-center gap-1`}
                              >
                                <Edit3 className="w-3 h-3" />
                                수정
                              </Button>
                              <Button
                                onClick={() => handleSaveItem(todo.id, 'todo')}
                                disabled={todo.saved}
                                className={`px-3 py-1 text-xs ${
                                  todo.saved 
                                    ? 'bg-gray-500 cursor-not-allowed' 
                                    : 'bg-[#56ab91] hover:bg-[#56ab91]/80'
                                } text-white`}
                              >
                                {todo.saved ? '저장됨' : '💾 저장'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 일정 섹션 */}
              {analysisResult.schedules.length > 0 && (
                <div className="bg-[#f59e0b]/20 p-4 rounded-lg border-l-4 border-[#f59e0b]">
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="font-semibold text-white">일정</h4>
                  </div>
                  <div className="space-y-2">
                    {analysisResult.schedules.map((schedule) => (
                      <div key={schedule.id} className="bg-[#f59e0b]/10 p-3 rounded border-l-2 border-[#f59e0b]/50">
                        {editingItems[schedule.id] ? (
                          // 수정 모드
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editTexts[schedule.id] || ''}
                              onChange={(e) => setEditTexts(prev => ({...prev, [schedule.id]: e.target.value}))}
                              className="w-full bg-[#f59e0b]/20 border border-[#f59e0b]/40 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#f59e0b]"
                              placeholder="일정을 입력하세요..."
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={() => saveEdit(schedule.id, 'schedule')}
                                className="bg-[#f59e0b] hover:bg-[#f59e0b]/80 text-white px-3 py-1 text-xs flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                완료
                              </Button>
                              <Button
                                onClick={() => cancelEdit(schedule.id)}
                                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 text-xs flex items-center gap-1"
                              >
                                <XCircle className="w-3 h-3" />
                                취소
                              </Button>
                            </div>
                          </div>
                        ) : (
                          // 일반 모드
                          <div className="flex items-center justify-between">
                            <span className={`text-white ${schedule.saved ? 'opacity-50 line-through' : ''}`}>
                              • {schedule.text}
                            </span>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => startEdit(schedule.id, schedule.text)}
                                disabled={schedule.saved}
                                className={`px-3 py-1 text-xs ${
                                  schedule.saved 
                                    ? 'bg-gray-500 cursor-not-allowed' 
                                    : 'bg-[#d97706] hover:bg-[#d97706]/80'
                                } text-white flex items-center gap-1`}
                              >
                                <Edit3 className="w-3 h-3" />
                                수정
                              </Button>
                              <Button
                                onClick={() => handleSaveItem(schedule.id, 'schedule')}
                                disabled={schedule.saved}
                                className={`px-3 py-1 text-xs ${
                                  schedule.saved 
                                    ? 'bg-gray-500 cursor-not-allowed' 
                                    : 'bg-[#f59e0b] hover:bg-[#f59e0b]/80'
                                } text-white`}
                              >
                                {schedule.saved ? '저장됨' : '💾 저장'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 중요 정보 섹션 */}
              {analysisResult.info.length > 0 && (
                <div className="bg-[#8b5cf6]/20 p-4 rounded-lg border-l-4 border-[#8b5cf6]">
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="font-semibold text-white">중요</h4>
                  </div>
                  <div className="space-y-2">
                    {analysisResult.info.map((info) => (
                      <div key={info.id} className="bg-[#8b5cf6]/10 p-3 rounded border-l-2 border-[#8b5cf6]/50">
                        {editingItems[info.id] ? (
                          // 수정 모드
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editTexts[info.id] || ''}
                              onChange={(e) => setEditTexts(prev => ({...prev, [info.id]: e.target.value}))}
                              className="w-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
                              placeholder="중요 정보를 입력하세요..."
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={() => saveEdit(info.id, 'info')}
                                className="bg-[#8b5cf6] hover:bg-[#8b5cf6]/80 text-white px-3 py-1 text-xs flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                완료
                              </Button>
                              <Button
                                onClick={() => cancelEdit(info.id)}
                                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 text-xs flex items-center gap-1"
                              >
                                <XCircle className="w-3 h-3" />
                                취소
                              </Button>
                            </div>
                          </div>
                        ) : (
                          // 일반 모드
                          <div className="flex items-center justify-between">
                            <span className={`text-white ${info.saved ? 'opacity-50 line-through' : ''}`}>
                              • {info.text}
                            </span>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => startEdit(info.id, info.text)}
                                disabled={info.saved}
                                className={`px-3 py-1 text-xs ${
                                  info.saved 
                                    ? 'bg-gray-500 cursor-not-allowed' 
                                    : 'bg-[#7c3aed] hover:bg-[#7c3aed]/80'
                                } text-white flex items-center gap-1`}
                              >
                                <Edit3 className="w-3 h-3" />
                                수정
                              </Button>
                              <Button
                                onClick={() => handleSaveItem(info.id, 'info')}
                                disabled={info.saved}
                                className={`px-3 py-1 text-xs ${
                                  info.saved 
                                    ? 'bg-gray-500 cursor-not-allowed' 
                                    : 'bg-[#8b5cf6] hover:bg-[#8b5cf6]/80'
                                } text-white`}
                              >
                                {info.saved ? '저장됨' : '💾 저장'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 링크 섹션 */}
              {analysisResult.links.length > 0 && (
                <div className="bg-[#358f80]/20 p-4 rounded-lg border-l-4 border-[#358f80]">
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="font-semibold text-white">링크</h4>
                  </div>
                  <div className="space-y-2">
                    {analysisResult.links.map((link) => {
                      const isSaving = savingLinkIds.has(link.id);
                      return (
                        <div key={link.id} className="flex items-center justify-between bg-[#358f80]/10 p-3 rounded border-l-2 border-[#358f80]/50">
                          <span className={`text-white break-all ${link.saved ? 'opacity-50 line-through' : ''}`}>
                            🔗 {link.url}
                          </span>
                          <Button
                            onClick={() => handleSaveItem(link.id, 'link')}
                            disabled={link.saved || isSaving}
                            className={`ml-3 px-3 py-1 text-xs flex items-center gap-1 ${
                              link.saved 
                                ? 'bg-gray-500 cursor-not-allowed' 
                                : isSaving
                                ? 'bg-[#358f80]/60 cursor-not-allowed'
                                : 'bg-[#358f80] hover:bg-[#358f80]/80'
                            } text-white`}
                          >
                            {link.saved ? (
                              '저장됨'
                            ) : isSaving ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                저장 중...
                              </>
                            ) : (
                              '💾 저장'
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 일반 메모 섹션 */}
              {analysisResult.general.length > 0 && (
                <div className="bg-gray-500/20 p-4 rounded-lg border-l-4 border-gray-500">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">📝</span>
                    <h4 className="font-semibold text-white">메모</h4>
                  </div>
                  <div className="space-y-2">
                    {analysisResult.general.map((memo) => (
                      <div key={memo.id} className="flex items-center justify-between bg-gray-500/10 p-3 rounded border-l-2 border-gray-500/50">
                        <span className={`text-white ${memo.saved ? 'opacity-50 line-through' : ''}`}>
                          • {memo.text}
                        </span>
                        <Button
                          onClick={() => handleSaveItem(memo.id, 'general')}
                          disabled={memo.saved}
                          className={`ml-3 px-3 py-1 text-xs ${
                            memo.saved 
                              ? 'bg-gray-500 cursor-not-allowed' 
                              : 'bg-gray-600 hover:bg-gray-600/80'
                          } text-white`}
                        >
                          {memo.saved ? '저장됨' : '💾 저장'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 빈 결과 */}
              {analysisResult.todos.length === 0 && 
               analysisResult.schedules.length === 0 && 
               analysisResult.info.length === 0 && 
               analysisResult.links.length === 0 && 
               analysisResult.general.length === 0 && (
                <div className="bg-gray-500/20 p-4 rounded-lg border-l-4 border-gray-500">
                  <p className="text-gray-300 text-center">
                    분석할 수 있는 메모나 링크가 발견되지 않았습니다.
                  </p>
                </div>
              )}
            </div>
          </div>
            
            {/* 모바일 바텀 시트 */}
            <div className="sm:hidden fixed inset-x-0 bottom-0 z-50 bg-[#1a3a34] border-t border-[#358f80]/30 rounded-t-2xl shadow-2xl max-h-[70vh] flex flex-col">
              {/* 핸들 바 */}
              <div className="flex justify-center py-3">
                <div className="w-12 h-1 bg-gray-400 rounded-full"></div>
              </div>
              
              {/* 헤더 */}
              <div className="px-4 pb-3 border-b border-[#358f80]/20">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#56ab91]" />
                  분석 결과
                </h3>
              </div>
              
              {/* 스크롤 가능한 내용 */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {/* 할 일 섹션 */}
                {analysisResult.todos.length > 0 && (
                  <div className="bg-[#56ab91]/20 p-3 rounded-lg border-l-4 border-[#56ab91]">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">✅</span>
                      <h4 className="font-semibold text-white">할 일</h4>
                    </div>
                    <div className="space-y-2">
                      {analysisResult.todos.map((todo) => (
                        <div key={todo.id} className="bg-[#56ab91]/10 p-3 rounded border-l-2 border-[#56ab91]/50">
                          {editingItems[todo.id] ? (
                            // 수정 모드
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editTexts[todo.id] || ''}
                                onChange={(e) => setEditTexts(prev => ({...prev, [todo.id]: e.target.value}))}
                                className="w-full bg-[#56ab91]/20 border border-[#56ab91]/40 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#56ab91] text-sm"
                                placeholder="할 일을 입력하세요..."
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => saveEdit(todo.id, 'todo')}
                                  className="bg-[#56ab91] hover:bg-[#56ab91]/80 text-white px-3 py-1 text-xs flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  완료
                                </Button>
                                <Button
                                  onClick={() => cancelEdit(todo.id)}
                                  className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 text-xs flex items-center gap-1"
                                >
                                  <XCircle className="w-3 h-3" />
                                  취소
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // 일반 모드
                            <div className="flex items-center justify-between">
                              <span className={`text-white text-sm ${todo.saved ? 'opacity-50 line-through' : ''}`}>
                                • {todo.text}
                              </span>
                              <div className="flex gap-1">
                                <Button
                                  onClick={() => startEdit(todo.id, todo.text)}
                                  disabled={todo.saved}
                                  className={`px-2 py-1 text-xs ${
                                    todo.saved 
                                      ? 'bg-gray-500 cursor-not-allowed' 
                                      : 'bg-[#358f80] hover:bg-[#358f80]/80'
                                  } text-white flex items-center gap-1`}
                                >
                                  <Edit3 className="w-3 h-3" />
                                </Button>
                                <Button
                                  onClick={() => handleSaveItem(todo.id, 'todo')}
                                  disabled={todo.saved}
                                  className={`px-2 py-1 text-xs ${
                                    todo.saved 
                                      ? 'bg-gray-500 cursor-not-allowed' 
                                      : 'bg-[#56ab91] hover:bg-[#56ab91]/80'
                                  } text-white`}
                                >
                                  💾
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 일정 섹션 */}
                {analysisResult.schedules.length > 0 && (
                  <div className="bg-[#f59e0b]/20 p-3 rounded-lg border-l-4 border-[#f59e0b]">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">⏰</span>
                      <h4 className="font-semibold text-white">일정</h4>
                    </div>
                    <div className="space-y-2">
                      {analysisResult.schedules.map((schedule) => (
                        <div key={schedule.id} className="bg-[#f59e0b]/10 p-3 rounded border-l-2 border-[#f59e0b]/50">
                          {editingItems[schedule.id] ? (
                            // 수정 모드
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editTexts[schedule.id] || ''}
                                onChange={(e) => setEditTexts(prev => ({...prev, [schedule.id]: e.target.value}))}
                                className="w-full bg-[#f59e0b]/20 border border-[#f59e0b]/40 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#f59e0b] text-sm"
                                placeholder="일정을 입력하세요..."
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => saveEdit(schedule.id, 'schedule')}
                                  className="bg-[#f59e0b] hover:bg-[#f59e0b]/80 text-white px-3 py-1 text-xs flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  완료
                                </Button>
                                <Button
                                  onClick={() => cancelEdit(schedule.id)}
                                  className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 text-xs flex items-center gap-1"
                                >
                                  <XCircle className="w-3 h-3" />
                                  취소
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // 일반 모드
                            <div className="flex items-center justify-between">
                              <span className={`text-white text-sm ${schedule.saved ? 'opacity-50 line-through' : ''}`}>
                                • {schedule.text}
                              </span>
                              <div className="flex gap-1">
                                <Button
                                  onClick={() => startEdit(schedule.id, schedule.text)}
                                  disabled={schedule.saved}
                                  className={`px-2 py-1 text-xs ${
                                    schedule.saved 
                                      ? 'bg-gray-500 cursor-not-allowed' 
                                      : 'bg-[#d97706] hover:bg-[#d97706]/80'
                                  } text-white flex items-center gap-1`}
                                >
                                  <Edit3 className="w-3 h-3" />
                                </Button>
                                <Button
                                  onClick={() => handleSaveItem(schedule.id, 'schedule')}
                                  disabled={schedule.saved}
                                  className={`px-2 py-1 text-xs ${
                                    schedule.saved 
                                      ? 'bg-gray-500 cursor-not-allowed' 
                                      : 'bg-[#f59e0b] hover:bg-[#f59e0b]/80'
                                  } text-white`}
                                >
                                  💾
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 중요 정보 섹션 */}
                {analysisResult.info.length > 0 && (
                  <div className="bg-[#8b5cf6]/20 p-3 rounded-lg border-l-4 border-[#8b5cf6]">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">📋</span>
                      <h4 className="font-semibold text-white">중요 정보</h4>
                    </div>
                    <div className="space-y-2">
                      {analysisResult.info.map((info) => (
                        <div key={info.id} className="bg-[#8b5cf6]/10 p-3 rounded border-l-2 border-[#8b5cf6]/50">
                          {editingItems[info.id] ? (
                            // 수정 모드
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editTexts[info.id] || ''}
                                onChange={(e) => setEditTexts(prev => ({...prev, [info.id]: e.target.value}))}
                                className="w-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] text-sm"
                                placeholder="중요 정보를 입력하세요..."
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => saveEdit(info.id, 'info')}
                                  className="bg-[#8b5cf6] hover:bg-[#8b5cf6]/80 text-white px-3 py-1 text-xs flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  완료
                                </Button>
                                <Button
                                  onClick={() => cancelEdit(info.id)}
                                  className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 text-xs flex items-center gap-1"
                                >
                                  <XCircle className="w-3 h-3" />
                                  취소
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // 일반 모드
                            <div className="flex items-center justify-between">
                              <span className={`text-white text-sm ${info.saved ? 'opacity-50 line-through' : ''}`}>
                                • {info.text}
                              </span>
                              <div className="flex gap-1">
                                <Button
                                  onClick={() => startEdit(info.id, info.text)}
                                  disabled={info.saved}
                                  className={`px-2 py-1 text-xs ${
                                    info.saved 
                                      ? 'bg-gray-500 cursor-not-allowed' 
                                      : 'bg-[#7c3aed] hover:bg-[#7c3aed]/80'
                                  } text-white flex items-center gap-1`}
                                >
                                  <Edit3 className="w-3 h-3" />
                                </Button>
                                <Button
                                  onClick={() => handleSaveItem(info.id, 'info')}
                                  disabled={info.saved}
                                  className={`px-2 py-1 text-xs ${
                                    info.saved 
                                      ? 'bg-gray-500 cursor-not-allowed' 
                                      : 'bg-[#8b5cf6] hover:bg-[#8b5cf6]/80'
                                  } text-white`}
                                >
                                  💾
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 링크 섹션 */}
                {analysisResult.links.length > 0 && (
                  <div className="bg-[#358f80]/20 p-3 rounded-lg border-l-4 border-[#358f80]">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">🔗</span>
                      <h4 className="font-semibold text-white">발견된 링크</h4>
                    </div>
                    <div className="space-y-2">
                      {analysisResult.links.map((link) => {
                        const isSaving = savingLinkIds.has(link.id);
                        return (
                          <div key={link.id} className="bg-[#358f80]/10 p-3 rounded border-l-2 border-[#358f80]/50">
                            <div className="flex items-center justify-between">
                              <span className={`text-white break-all text-sm ${link.saved ? 'opacity-50 line-through' : ''}`}>
                                🔗 {link.url}
                              </span>
                              <Button
                                onClick={() => handleSaveItem(link.id, 'link')}
                                disabled={link.saved || isSaving}
                                className={`ml-2 px-2 py-1 text-xs flex items-center gap-1 ${
                                  link.saved 
                                    ? 'bg-gray-500 cursor-not-allowed' 
                                    : isSaving
                                    ? 'bg-[#358f80]/60 cursor-not-allowed'
                                    : 'bg-[#358f80] hover:bg-[#358f80]/80'
                                } text-white`}
                              >
                                {link.saved ? (
                                  '저장됨'
                                ) : isSaving ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    저장 중...
                                  </>
                                ) : (
                                  '💾'
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 일반 메모 섹션 */}
                {analysisResult.general.length > 0 && (
                  <div className="bg-gray-500/20 p-3 rounded-lg border-l-4 border-gray-500">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">📝</span>
                      <h4 className="font-semibold text-white">일반 메모</h4>
                    </div>
                    <div className="space-y-2">
                      {analysisResult.general.map((memo) => (
                        <div key={memo.id} className="bg-gray-500/10 p-3 rounded border-l-2 border-gray-500/50">
                          <div className="flex items-center justify-between">
                            <span className={`text-white text-sm ${memo.saved ? 'opacity-50 line-through' : ''}`}>
                              • {memo.text}
                            </span>
                            <Button
                              onClick={() => handleSaveItem(memo.id, 'general')}
                              disabled={memo.saved}
                              className={`ml-2 px-2 py-1 text-xs ${
                                memo.saved 
                                  ? 'bg-gray-500 cursor-not-allowed' 
                                  : 'bg-gray-600 hover:bg-gray-700'
                              } text-white`}
                            >
                              {memo.saved ? '저장됨' : '💾'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 하단 여백 */}
                <div className="h-4"></div>
              </div>
            </div>
          </>
        )}

         {/* 메모 저장 날짜 선택 다이얼로그 */}
         <Dialog 
           open={savingItem !== null} 
           onOpenChange={(open) => {
             if (!open && !calendarOpen) {
               setSavingItem(null);
             }
           }}
         >
          <DialogContent className="sm:max-w-md bg-[#2A4D45]/90 backdrop-blur-sm border border-[#358f80]/30">
            <DialogHeader>
              <DialogTitle className="text-white">메모 저장</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {savingItem && (
                <div className="bg-[#358f80]/10 p-3 rounded-lg border border-[#358f80]/20">
                  <p className="text-sm text-gray-300 mb-2">저장할 내용:</p>
                  <p className="text-white font-medium">{savingItem.text}</p>
                </div>
              )}
              
              <div className="space-y-2">
  <label className="text-sm font-medium text-white">저장 날짜 선택</label>
  
  <Button
    variant="outline"
    onClick={() => setCalendarOpen(!calendarOpen)}
    className="w-full justify-start text-left font-normal bg-[#358f80]/20 border-[#358f80]/40 text-white hover:bg-[#358f80]/30"
  >
    <CalendarIcon className="mr-2 h-4 w-4" />
    {format(saveDate, 'PPP', { locale: ko })}
  </Button>
  
  {calendarOpen && (
    <div className="mt-2 p-3 bg-[#2A4D45]/60 rounded-lg border border-[#358f80]/30">
      <CalendarComponent
        mode="single"
        selected={saveDate}
        onSelect={(date) => {
          if (date) {
            setSaveDate(date);
            setCalendarOpen(false);
          }
        }}
        locale={ko}
        className="rounded-md"
      />
    </div>
  )}
</div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setSavingItem(null)}
                  className="bg-[#2A4D45]/40 border-[#358f80]/20 text-white hover:bg-[#2A4D45]/60"
                >
                  취소
                </Button>
                <Button
                  onClick={handleSaveToMemoCollection}
                  className="bg-[#56ab91] hover:bg-[#56ab91]/80 text-white"
                >
                  메모로 저장
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}