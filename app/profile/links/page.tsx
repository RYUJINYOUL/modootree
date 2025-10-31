'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BookOpen, 
  Briefcase, 
  Gamepad2, 
  FileText, 
  Lightbulb, 
  Heart, 
  Star,
  LayoutGrid,
  Plus,
  ExternalLink,
  Trash2,
  Edit,
  Globe,
  Calendar,
  Sparkles
} from 'lucide-react';
import { db } from '@/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

// 링크 데이터 인터페이스
interface LinkItem {
  id: string;
  title: string;
  url: string;
  description?: string;
  category: string;
  favicon?: string;
  thumbnail?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 링크 추가 폼 인터페이스
interface LinkForm {
  title: string;
  url: string;
  description: string;
  category: string;
}

// 링크 카테고리 정의
const linkCategories = [
  { id: 'all', name: '전체', icon: LayoutGrid, description: '모든 링크 보기' },
  { id: 'learning', name: '배움', icon: BookOpen, description: '강의, 튜토리얼 등 지식 습득 관련 링크 분류' },
  { id: 'work', name: '비즈', icon: Briefcase, description: '업무, 경제, 마케팅, 협업 등 수익 및 생산성 관련 링크 분류' },
  { id: 'entertainment', name: '재미', icon: Gamepad2, description: '오락, 게임, 웹툰 등 단순 소비 콘텐츠 분류' },
  { id: 'reference', name: '자료', icon: FileText, description: '매뉴얼, 보고서, 긴 문서 등 정보 저장 링크 분류' },
  { id: 'inspiration', name: '영감', icon: Lightbulb, description: '디자인, 아이디어, 창작 등 창의적 동기 링크 분류' },
  { id: 'lifestyle', name: '생활', icon: Heart, description: '요리, 건강, 여행, 취미 등 일상 활동 관련 링크 분류' },
  { id: 'favorites', name: '필수', icon: Star, description: '사용자가 지정한 최중요 링크 관리 (AI 분류 예외)' },
];

// 카테고리 필터링 (전체 제외)
const selectableCategories = linkCategories.filter(cat => cat.id !== 'all');

export default function LinksPage() {
  const { currentUser } = useSelector((state: any) => state.user);
  const [activeCategory, setActiveCategory] = useState('all');
  const [windowWidth, setWindowWidth] = useState(0);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [linkForm, setLinkForm] = useState<LinkForm>({
    title: '',
    url: '',
    description: '',
    category: 'learning'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoCategorizingEnabled, setIsAutoCategorizingEnabled] = useState(true);
  const [aiCategoryFeedback, setAiCategoryFeedback] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // 디버깅: 화면 크기 실시간 확인
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    // 초기 화면 크기 설정
    handleResize();
    
    // 리사이즈 이벤트 리스너 추가
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 링크 실시간 구독
  useEffect(() => {
    if (!currentUser?.uid) return;
    
    const q = query(
      collection(db, `users/${currentUser.uid}/linkpage`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedLinks = snapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title || '',
        url: doc.data().url || '',
        description: doc.data().description || '',
        category: doc.data().category || 'learning',
        favicon: doc.data().favicon || '',
        thumbnail: doc.data().thumbnail || '',
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      }));
      setLinks(loadedLinks);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // URL 유효성 검사
  const isValidUrl = (url: string) => {
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  // URL 메타데이터 추출 (서버 API 사용)
  const extractUrlMetadata = async (url: string) => {
    try {
      const response = await fetch('/api/link-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });

      const data = await response.json();
      
      if (data.success) {
        return {
          title: data.metadata.title,
          description: data.metadata.description,
          favicon: data.metadata.favicon,
          thumbnail: data.metadata.image
        };
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('메타데이터 추출 실패:', error);
      
      // 실패 시 기본값 반환
      try {
        const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
        const urlObj = new URL(normalizedUrl);
        const domain = urlObj.hostname.replace('www.', '');
        const defaultTitle = domain.charAt(0).toUpperCase() + domain.slice(1);
        
        return {
          title: defaultTitle,
          description: '',
          favicon: `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`,
          thumbnail: ''
        };
      } catch {
        return { title: '', description: '', favicon: '', thumbnail: '' };
      }
    }
  };

  // 수동 링크 추가 (필요시 사용)
  const handleManualAddLink = async () => {
    if (!currentUser?.uid || !linkForm.url.trim()) {
      alert('URL을 입력해주세요.');
      return;
    }

    if (!isValidUrl(linkForm.url)) {
      alert('올바른 URL을 입력해주세요.');
      return;
    }

    // URL 변경 핸들러를 통해 자동 저장 실행
    await handleUrlChange(linkForm.url);
  };

  // 링크 삭제
  const handleDeleteLink = async (linkId: string) => {
    if (!currentUser?.uid) return;
    
    if (confirm('이 링크를 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, `users/${currentUser.uid}/linkpage`, linkId));
      } catch (error) {
        console.error('링크 삭제 실패:', error);
        alert('링크 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  // 링크 수정 시작
  const handleEditLink = (link: LinkItem) => {
    setEditingLink(link);
    setLinkForm({
      title: link.title,
      url: link.url,
      description: link.description || '',
      category: link.category
    });
    setIsEditModalOpen(true);
  };

  // 링크 수정 저장
  const handleUpdateLink = async () => {
    if (!currentUser?.uid || !editingLink || !linkForm.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const linkData = {
        title: linkForm.title,
        description: linkForm.description,
        category: linkForm.category,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, `users/${currentUser.uid}/linkpage`, editingLink.id), linkData);
      
      // 폼 초기화 및 모달 닫기
      setLinkForm({
        title: '',
        url: '',
        description: '',
        category: 'learning'
      });
      setEditingLink(null);
      setIsEditModalOpen(false);
      
      setAiCategoryFeedback('링크가 성공적으로 수정되었습니다!');
      setTimeout(() => setAiCategoryFeedback(null), 3000);
    } catch (error) {
      console.error('링크 수정 실패:', error);
      alert('링크 수정 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // AI 카테고리 자동 분류
  const autoCategorizeLinkContent = async (title: string, description: string, url: string) => {
    if (!isAutoCategorizingEnabled) return null;
    
    try {
      const response = await fetch('/api/categorize-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, description, url })
      });

      const data = await response.json();
      
      if (data.success) {
        return data.category;
      }
    } catch (error) {
      console.error('AI 카테고리 분류 실패:', error);
    }
    
    return null;
  };

  // URL 입력 시 자동 메타데이터 추출, AI 분류 및 저장
  const handleUrlChange = async (url: string) => {
    setLinkForm(prev => ({ ...prev, url }));
    
    if (url && isValidUrl(url) && currentUser?.uid) {
      setIsSubmitting(true);
      
      try {
        // 1. 메타데이터 추출
        const metadata = await extractUrlMetadata(url);
        
        if (metadata.title) {
          // 2. AI 카테고리 분류
          const suggestedCategory = await autoCategorizeLinkContent(
            metadata.title, 
            metadata.description, 
            url
          );
          
          // 3. 자동 저장
          const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
          const linkData = {
            title: metadata.title,
            url: normalizedUrl,
            description: metadata.description,
            category: suggestedCategory || 'learning',
            favicon: metadata.favicon,
            thumbnail: metadata.thumbnail,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };

          await addDoc(collection(db, `users/${currentUser.uid}/linkpage`), linkData);
          
          // 4. 성공 피드백
          const categoryName = selectableCategories.find(cat => cat.id === (suggestedCategory || 'learning'))?.name;
          setAiCategoryFeedback(`링크가 "${categoryName}" 카테고리로 자동 저장되었습니다!`);
          setTimeout(() => setAiCategoryFeedback(null), 3000);
          
          // 5. 폼 초기화 및 모달 닫기
          setLinkForm({
            title: '',
            url: '',
            description: '',
            category: 'learning'
          });
          setIsAddModalOpen(false);
        }
      } catch (error) {
        console.error('자동 저장 실패:', error);
        setAiCategoryFeedback('링크 저장 중 오류가 발생했습니다.');
        setTimeout(() => setAiCategoryFeedback(null), 3000);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // 로그인하지 않은 경우 바로 안내 메시지 표시
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">로그인이 필요한 서비스입니다</h2>
          <p className="text-gray-400">링크 기능을 사용하려면 회원가입 후 로그인해주세요.</p>
          <div className="space-x-4">
            <Button 
              onClick={() => window.location.href = '/login'}
              className="bg-blue-600 hover:bg-blue-700"
            >
              로그인
            </Button>
            <Button 
              onClick={() => window.location.href = '/signup'}
              className="bg-green-600 hover:bg-green-700"
            >
              회원가입
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const activeCategoryData = linkCategories.find(cat => cat.id === activeCategory);
  
  // 카테고리별 링크 필터링
  const filteredLinks = activeCategory === 'all' 
    ? links 
    : links.filter(link => link.category === activeCategory);

  return (
    <div className="flex-1 py-6 overflow-auto">
      <div className="px-1 md:px-6 space-y-6">

        {/* 상단 헤더 - 링크 추가 버튼 */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">링크 관리</h1>
          <Button 
            className="bg-[#56ab91]/60 hover:bg-[#56ab91]/80 text-white border border-[#56ab91]/30 flex items-center gap-2"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">링크 추가</span>
          </Button>
        </div>

        {/* 카테고리 탭 - 플렉스 줄바꿈 */}
        <div className="bg-[#2A4D45]/40 backdrop-blur-sm border border-[#358f80]/20 rounded-xl p-2 md:p-4">
          <div className="flex flex-wrap gap-1 md:gap-2">
            {linkCategories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 rounded-lg transition-all ${
                    activeCategory === category.id
                      ? 'bg-[#56ab91]/60 text-white border border-[#56ab91]/30'
                      : 'bg-[#2A4D45]/60 text-gray-300 hover:text-white hover:bg-[#2A4D45]/80 border border-[#358f80]/20'
                  }`}
                  title={category.description}
                >
                  <Icon className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="text-xs md:text-sm font-medium">{category.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 링크 목록 또는 빈 상태 */}
        {loading ? (
          <div className="bg-[#2A4D45]/40 backdrop-blur-sm border border-[#358f80]/20 rounded-xl p-12 text-center">
            <div className="text-white">링크를 불러오는 중...</div>
          </div>
        ) : filteredLinks.length > 0 ? (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            {filteredLinks.map((link) => {
              const categoryData = linkCategories.find(cat => cat.id === link.category);
              const CategoryIcon = categoryData?.icon || Globe;
              
              return (
                <div key={link.id} className="bg-[#2A4D45]/40 backdrop-blur-sm border border-[#358f80]/20 rounded-xl overflow-hidden hover:bg-[#2A4D45]/60 transition-all group">
                  {/* 썸네일 이미지 */}
                  {link.thumbnail && (
                    <div className="aspect-video w-full overflow-hidden">
                      <img 
                        src={link.thumbnail} 
                        alt={link.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.parentElement?.remove();
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {link.favicon ? (
                          <img src={link.favicon} alt="" className="w-5 h-5 rounded" onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }} />
                        ) : (
                          <CategoryIcon className="w-5 h-5 text-[#56ab91]" />
                        )}
                        <span className="text-xs text-gray-400 bg-[#358f80]/20 px-2 py-1 rounded">
                          {categoryData?.name}
                        </span>
                      </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditLink(link)}
                        className="text-gray-400 hover:text-blue-400 p-1 rounded transition-colors"
                        title="수정"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        className="text-gray-400 hover:text-red-400 p-1 rounded transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    </div>
                    
                    <h3 className="text-white font-medium mb-2 line-clamp-2">{link.title}</h3>
                    
                    {link.description && (
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">{link.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {format(link.createdAt, 'yyyy.MM.dd', { locale: ko })}
                      </span>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[#56ab91] hover:text-[#469d89] text-sm transition-colors"
                      >
                        <span>열기</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
        <div className="bg-[#2A4D45]/40 backdrop-blur-sm border border-[#358f80]/20 rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">
            {activeCategoryData && <activeCategoryData.icon className="w-16 h-16 mx-auto text-[#56ab91]" />}
          </div>
          <h3 className="text-xl font-semibold mb-2 text-white">
            저장된 {activeCategoryData?.name} 링크가 없습니다
          </h3>
          <p className="text-gray-400 mb-6">
            {activeCategoryData?.description}
          </p>
          <Button 
            className="bg-[#56ab91]/60 hover:bg-[#56ab91]/80 text-white border border-[#56ab91]/30"
              onClick={() => setIsAddModalOpen(true)}
          >
            첫 번째 {activeCategoryData?.name} 링크 추가하기
          </Button>
        </div>
        )}

      </div>
      
      {/* 링크 추가 모달 - 간소화된 버전 */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-[#2A4D45]/95 backdrop-blur-sm border border-[#358f80]/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">새 링크 추가</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url" className="text-gray-300">URL 입력</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com (URL을 입력하면 자동으로 저장됩니다)"
                value={linkForm.url}
                onChange={(e) => handleUrlChange(e.target.value)}
                disabled={isSubmitting}
                className="bg-[#358f80]/20 border-[#358f80]/30 text-white placeholder-gray-400"
              />
              {isSubmitting && (
                <div className="flex items-center gap-2 text-xs text-[#56ab91]">
                  <div className="animate-spin w-3 h-3 border border-[#56ab91] border-t-transparent rounded-full"></div>
                  <span>링크 정보를 가져오고 있습니다...</span>
                </div>
              )}
            </div>
            
            {/* AI 분류 피드백 메시지 */}
            {aiCategoryFeedback && (
              <div className="flex items-center gap-2 text-sm text-[#56ab91] bg-[#56ab91]/10 px-3 py-2 rounded-lg border border-[#56ab91]/20">
                <Sparkles className="w-4 h-4" />
                <span>{aiCategoryFeedback}</span>
              </div>
            )}
            
            <div className="text-sm text-gray-400 bg-[#358f80]/10 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[#56ab91]" />
                <span className="font-medium">자동 처리 과정</span>
              </div>
              <ul className="text-xs space-y-1 ml-6">
                <li>• URL에서 제목과 설명 자동 추출</li>
                <li>• AI가 내용을 분석하여 카테고리 자동 분류</li>
                <li>• 링크가 자동으로 저장됩니다</li>
              </ul>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 border-[#358f80]/30 text-gray-300 hover:bg-[#358f80]/20"
                disabled={isSubmitting}
              >
                닫기
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 링크 수정 모달 */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-[#2A4D45]/95 backdrop-blur-sm border border-[#358f80]/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">링크 수정</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title" className="text-gray-300">제목 *</Label>
              <Input
                id="edit-title"
                placeholder="링크 제목"
                value={linkForm.title}
                onChange={(e) => setLinkForm(prev => ({ ...prev, title: e.target.value }))}
                className="bg-[#358f80]/20 border-[#358f80]/30 text-white placeholder-gray-400"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-category" className="text-gray-300">카테고리 *</Label>
              <Select value={linkForm.category} onValueChange={(value) => setLinkForm(prev => ({ ...prev, category: value }))}>
                <SelectTrigger className="bg-[#358f80]/20 border-[#358f80]/30 text-white">
                  <SelectValue>
                    {(() => {
                      const selectedCategory = selectableCategories.find(cat => cat.id === linkForm.category);
                      if (selectedCategory) {
                        const Icon = selectedCategory.icon;
                        return (
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            <span>{selectedCategory.name}</span>
                          </div>
                        );
                      }
                      return "카테고리 선택";
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-[#2A4D45] border-[#358f80]/30">
                  {selectableCategories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <SelectItem key={category.id} value={category.id} className="text-white hover:bg-[#358f80]/30">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span>{category.name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-gray-300">설명 (선택사항)</Label>
              <Textarea
                id="edit-description"
                placeholder="링크에 대한 간단한 설명"
                value={linkForm.description}
                onChange={(e) => setLinkForm(prev => ({ ...prev, description: e.target.value }))}
                className="bg-[#358f80]/20 border-[#358f80]/30 text-white placeholder-gray-400 resize-none"
                rows={3}
              />
            </div>
            
            {/* AI 분류 피드백 메시지 */}
            {aiCategoryFeedback && (
              <div className="flex items-center gap-2 text-sm text-[#56ab91] bg-[#56ab91]/10 px-3 py-2 rounded-lg border border-[#56ab91]/20">
                <Sparkles className="w-4 h-4" />
                <span>{aiCategoryFeedback}</span>
              </div>
            )}
            
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 border-[#358f80]/30 text-gray-300 hover:bg-[#358f80]/20"
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button
                onClick={handleUpdateLink}
                disabled={isSubmitting || !linkForm.title.trim()}
                className="flex-1 bg-[#56ab91]/60 hover:bg-[#56ab91]/80 text-white"
              >
                {isSubmitting ? '저장 중...' : '수정 완료'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

