'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, where, startAfter, QueryDocumentSnapshot, DocumentData, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import CategoryCarousel from '@/components/CategoryCarousel';
import Link from 'next/link';
import useAuth from '@/hooks/useAuth';
import LoginOutButton from '@/components/ui/LoginOutButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from 'next/navigation';
import PhotoStoryPage from '../photo-story/page';

const MODOO_CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'happy', label: '행복' },
  { id: 'sad', label: '슬픔' },
  { id: 'angry', label: '화남' },
  { id: 'anxious', label: '불안' },
  { id: 'comfort', label: '편안' },
  { id: 'worry', label: '고민' },
];

export default function ModooVotePage() {
  const [modooList, setModooList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('created_at_desc');
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedTab, setSelectedTab] = useState('modoo-vote');
  const [isActive] = useState(true);
  const [isFromFeed] = useState(false);
  const [prevCategory, setPrevCategory] = useState(selectedCategory); // 이전 카테고리 상태 추가
  const [prevSortBy, setPrevSortBy] = useState(sortBy); // 이전 정렬 상태 추가

  const { user } = useAuth();
  const router = useRouter();

  // 관리자 UID 확인
  const isAdmin = user?.uid === 'vW1OuC6qMweyOqu73N0558pv4b03';

  // 삭제 함수
  const handleDelete = async (modooId: string, title: string) => {
    if (!isAdmin) return;
    
    const confirmed = window.confirm(`"${title}" 게시물을 정말 삭제하시겠습니까?`);
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'modoo-vote-articles', modooId));
      
      // 로컬 상태에서도 제거
      setModooList(prevList => prevList.filter(item => item.id !== modooId));
      
      alert('게시물이 성공적으로 삭제되었습니다.');
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // 페이지 로드 시 저장된 상태 복원
  useEffect(() => {
    const savedState = sessionStorage.getItem('modooVoteState');
    const savedScrollPosition = sessionStorage.getItem('modooVoteScrollPosition');
    
    if (savedState) {
      try {
        const { modooList: savedModooList, selectedCategory: savedCategory, sortBy: savedSortBy, hasMore: savedHasMore } = JSON.parse(savedState);
        if (savedModooList && savedModooList.length > 0) {
          setModooList(savedModooList);
          setSelectedCategory(savedCategory);
          setSortBy(savedSortBy);
          setPrevCategory(savedCategory);
          setPrevSortBy(savedSortBy);
          setHasMore(savedHasMore);
          setLoading(false);
          
          // 스크롤 위치 복원
          if (savedScrollPosition) {
            setTimeout(() => {
              window.scrollTo(0, parseInt(savedScrollPosition));
            }, 100);
          }
          return;
        }
      } catch (error) {
        console.error('저장된 상태 복원 실패:', error);
      }
    }
  }, []);

  // 뒤로 가기 감지 및 스크롤 위치 저장
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (modooList.length > 0) {
        sessionStorage.setItem('modooVoteScrollPosition', window.scrollY.toString());
      }
    };

    const handlePopState = () => {
      const savedScrollPosition = sessionStorage.getItem('modooVoteScrollPosition');
      if (savedScrollPosition) {
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedScrollPosition));
        }, 100);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [modooList]);

  useEffect(() => {
    if (isActive && selectedTab === 'modoo-vote') {
      const categoryChanged = prevCategory !== selectedCategory;
      const sortChanged = prevSortBy !== sortBy;
      
      if (categoryChanged || sortChanged) {
        // 실제로 카테고리나 정렬이 변경된 경우에만 초기화
        setModooList([]);
        setLastVisible(null);
        setHasMore(true);
        fetchModooVotes(true);
        setPrevCategory(selectedCategory);
        setPrevSortBy(sortBy);
        // 변경 시에는 저장된 상태 클리어
        sessionStorage.removeItem('modooVoteState');
        sessionStorage.removeItem('modooVoteScrollPosition');
      } else if (modooList.length === 0) {
        // 처음 로드시에만 데이터 가져오기
        fetchModooVotes(true);
      }
    } else if (!isActive) {
      setLoading(false);
    }
  }, [selectedCategory, sortBy, selectedTab, isActive]);

  // 상태 변경 시 sessionStorage에 저장
  useEffect(() => {
    if (modooList.length > 0 && !loading) {
      const stateToSave = {
        modooList,
        selectedCategory,
        sortBy,
        hasMore
      };
      sessionStorage.setItem('modooVoteState', JSON.stringify(stateToSave));
    }
  }, [modooList, selectedCategory, sortBy, hasMore, loading]);

  const fetchModooVotes = async (reset: boolean) => {
    setLoading(true);
    try {
      let q = query(collection(db, 'modoo-vote-articles'));

      if (selectedCategory !== 'all') {
        q = query(q, where('category', '==', selectedCategory));
      }
      
      if (selectedCategory !== 'all') {
        switch (sortBy) {
          case 'total_votes_desc':
            q = query(q, orderBy('category'), orderBy('totalVotes', 'desc'), orderBy('createdAt', 'desc'));
            break;
          case 'view_count_desc':
            q = query(q, orderBy('category'), orderBy('viewCount', 'desc'), orderBy('createdAt', 'desc'));
            break;
          case 'created_at_desc':
          default:
            q = query(q, orderBy('category'), orderBy('createdAt', 'desc'));
            break;
        }
      } else {
        switch (sortBy) {
          case 'total_votes_desc':
            q = query(q, orderBy('totalVotes', 'desc'), orderBy('createdAt', 'desc'));
            break;
          case 'view_count_desc':
            q = query(q, orderBy('view_count', 'desc'), orderBy('createdAt', 'desc'));
            break;
          case 'created_at_desc':
          default:
            q = query(q, orderBy('createdAt', 'desc'));
            break;
        }
      }

      if (!reset && lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      q = query(q, limit(10));
      
      const snapshot = await getDocs(q);
      const newModoos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setModooList(prevModoos => (reset ? newModoos : [...prevModoos, ...newModoos]));
      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(newModoos.length === 10);

    } catch (error) {
      console.error('공감 투표 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white relative pt-[80px]">
      {!isActive ? (
        <div className="container mx-auto px-4 py-6">
            <div className="mb-6 flex justify-center">
              <CategoryCarousel
                categories={MODOO_CATEGORIES}
                selectedCategory={selectedCategory}
                onSelect={setSelectedCategory}
              />
            </div>

            <div className="flex justify-between items-center mb-6">
              {user && (
                <Link href="/modoo-vote/submit" className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded-lg shadow-md transition-colors text-xs">
                  공감 등록
                </Link>
              )}
              <div className="flex gap-2 ml-auto">
                <button 
                  onClick={() => setSortBy('created_at_desc')}
                  className={`px-3 py-1 rounded-lg transition-colors text-xs ${sortBy === 'created_at_desc' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  최신순
                </button>
                <button
                  onClick={() => setSortBy('total_votes_desc')}
                  className={`px-3 py-1 rounded-lg transition-colors text-xs ${sortBy === 'total_votes_desc' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  인기순
                </button>
                <button
                  onClick={() => setSortBy('view_count_desc')}
                  className={`px-3 py-1 rounded-lg transition-colors text-xs ${sortBy === 'view_count_desc' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  조회수순
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {loading && modooList.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  공감 투표를 불러오는 중...
                </div>
              ) : modooList.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  선택한 카테고리의 공감 투표가 없습니다.
                </div>
              ) : (
                modooList.map(modooItem => (
                  <div key={modooItem.id} className="relative">
                    <Link href={`/modoo-vote/${modooItem.id}`} className="block">
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20 shadow-lg cursor-pointer hover:bg-white/20 transition-all">
                        <h2 className="text-xl font-bold mb-2">{
                          modooItem.category && MODOO_CATEGORIES.find(cat => cat.id === modooItem.category)?.label ? 
                          `[${MODOO_CATEGORIES.find(cat => cat.id === modooItem.category)?.label}] ${modooItem.title}` : 
                          modooItem.title
                        }</h2>
                        <p className="text-gray-300 text-sm mb-4">{modooItem.story}</p>
                        <div className="mt-6 flex justify-between items-center text-xs text-gray-500">
                          <span>총 {modooItem.totalVotes}명 참여</span>
                          <span>조회수 {modooItem.viewCount}</span>
                        </div>
                      </div>
                    </Link>
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(modooItem.id, modooItem.title);
                        }}
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded-md transition-colors z-10"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                ))
              )}

              {loading && modooList.length > 0 && (
                <div className="text-center py-4 text-gray-400">더보기 로딩 중...</div>
              )}
              {!loading && hasMore && (
                <div className="text-center mt-6">
                  <button
                    onClick={() => fetchModooVotes(false)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-colors"
                  >
                    더보기
                  </button>
                </div>
              )}
            </div>
        </div>
      ) : (
        <>
          <div className="fixed top-0 left-0 right-0 z-20 w-full">
            <LoginOutButton />
          </div>
          <div className="container mx-auto px-4 py-2">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full flex flex-col items-center">
              <TabsList className="grid w-full max-w-lg grid-cols-3 bg-gray-700/50 mb-6 p-1 rounded-lg shadow-md">
                <TabsTrigger 
                  value="news-vote" 
                  className={`py-2 px-4 rounded-md transition-colors ${selectedTab === 'news-vote' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
                  onClick={() => router.push('/news-vote')}
                >
                  뉴스투표
                </TabsTrigger>
                <TabsTrigger 
                  value="modoo-vote" 
                  className={`py-2 px-4 rounded-md transition-colors ${selectedTab === 'modoo-vote' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
                  onClick={() => router.push('/modoo-vote')}
                >
                  공감투표
                </TabsTrigger>
                <TabsTrigger 
                  value="/photo-story" 
                  className={`py-2 px-4 rounded-md transition-colors ${selectedTab === '/photo-story' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
                  onClick={() => router.push('/photo-story')}
                >
                  사진투표
                </TabsTrigger>
              </TabsList>
              <TabsContent value="news-vote" className="w-full">
                <div className="container mx-auto px-4 py-6 text-center text-gray-400">
                  <h2 className="text-xl font-bold">뉴스투표 페이지입니다.</h2>
                  <p className="mt-2">뉴스투표 콘텐츠는 여기에 표시됩니다.</p>
                  <Link href="/news-vote" className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">뉴스투표 바로가기</Link>
                </div>
              </TabsContent>
              <TabsContent value="modoo-vote" className="w-full">
                <div className="mb-6 flex justify-center">
                  <CategoryCarousel
                    categories={MODOO_CATEGORIES}
                    selectedCategory={selectedCategory}
                    onSelect={setSelectedCategory}
                  />
                </div>

                <div className="flex justify-between items-center mb-6">
                  {user && (
                    <Link href="/modoo-vote/submit" className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded-lg shadow-md transition-colors text-xs">
                      공감 등록
                    </Link>
                  )}
                  <div className="flex gap-2 ml-auto">
                    <button 
                      onClick={() => setSortBy('created_at_desc')}
                      className={`px-3 py-1 rounded-lg transition-colors text-xs ${sortBy === 'created_at_desc' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                    >
                      최신순
                    </button>
                    <button
                      onClick={() => setSortBy('total_votes_desc')}
                      className={`px-3 py-1 rounded-lg transition-colors text-xs ${sortBy === 'total_votes_desc' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                    >
                      인기순
                    </button>
                    <button
                      onClick={() => setSortBy('view_count_desc')}
                      className={`px-3 py-1 rounded-lg transition-colors text-xs ${sortBy === 'view_count_desc' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                    >
                      조회수순
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {loading && modooList.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      공감 투표를 불러오는 중...
                    </div>
                  ) : modooList.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      선택한 카테고리의 공감 투표가 없습니다.
                    </div>
                  ) : (
                    modooList.map(modooItem => (
                      <div key={modooItem.id} className="relative">
                        <Link href={`/modoo-vote/${modooItem.id}`} className="block">
                          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20 shadow-lg cursor-pointer hover:bg-white/20 transition-all">
                            <div className="flex items-start gap-3">
                              {isFromFeed && (
                                <div className="flex-shrink-0">
                                  <img
                                    src={`/logos/${modooItem.category || 'worry'}.png`}
                                    alt="감정 아이콘"
                                    className="w-8 h-8 object-contain"
                                  />
                                </div>
                              )}
                              <h2 className="text-xl font-bold mb-2">{
                                modooItem.category && MODOO_CATEGORIES.find(cat => cat.id === modooItem.category)?.label ? 
                                `[${MODOO_CATEGORIES.find(cat => cat.id === modooItem.category)?.label}] ${modooItem.title}` : 
                                modooItem.title
                              }</h2>
                            </div>
                            <p className="text-gray-300 text-sm mb-4">
                              <span className="hidden md:inline">
                                {modooItem.story.length > 250 
                                  ? `${modooItem.story.slice(0, 250)}...` 
                                  : modooItem.story}
                              </span>
                              <span className="md:hidden">
                                {modooItem.story.length > 100 
                                  ? `${modooItem.story.slice(0, 100)}...` 
                                  : modooItem.story}
                              </span>
                            </p>
                            <div className="mt-6 flex justify-between items-center text-xs text-gray-500">
                              <span>총 {modooItem.totalVotes}명 참여</span>
                              <span>조회수 {modooItem.viewCount}</span>
                            </div>
                          </div>
                        </Link>
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDelete(modooItem.id, modooItem.title);
                            }}
                            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded-md transition-colors z-10"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    ))
                  )}

                  {/* 더보기 버튼 섹션 */}
                  <div className="text-center pt-4 pb-24">
                    {loading && (
                      <div className="text-gray-400 mb-4">
                        <span className="inline-block animate-spin mr-2">⏳</span>
                        더보기 로딩 중...
                      </div>
                    )}
                    {!loading && hasMore && (
                      <button
                        onClick={() => fetchModooVotes(false)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center mx-auto"
                      >
                        <span>더 많은 공감 투표 보기</span>
                        <span className="ml-2">↓</span>
                      </button>
                    )}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="photo-vote" className="w-full">
                <PhotoStoryPage />
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}
    </div>
  );
}