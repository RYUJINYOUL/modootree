'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, where, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
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

  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setModooList([]);
    setLastVisible(null);
    setHasMore(true);
    if (isActive && selectedTab === 'modoo-vote') {
      fetchModooVotes(true);
    } else if (!isActive) {
      setLoading(false);
    }
  }, [selectedCategory, sortBy, selectedTab, isActive]);

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
                  <Link href={`/modoo-vote/${modooItem.id}`} key={modooItem.id} className="block">
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
          <div className="container mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold mb-2 text-center">세상의 모든 투표</h1>
            <p className="text-gray-400 text-center mb-6">가입 없이도 투표는 가능, 투표 제안은 회원가입 필수</p>

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
                      <Link href={`/modoo-vote/${modooItem.id}`} key={modooItem.id} className="block">
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