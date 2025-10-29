'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, where, startAfter, QueryDocumentSnapshot, DocumentData, doc, deleteDoc } from 'firebase/firestore'; // startAfter, QueryDocumentSnapshot, DocumentData 임포트
import { db } from '@/lib/firebase'; // Firestore 클라이언트 SDK 임포트
import CategoryCarousel from '@/components/CategoryCarousel';
// import Image from 'next/image'; // Added for YouTube logo (제거)
import Link from 'next/link'; // Link 컴포넌트 추가
import useAuth from '@/hooks/useAuth'; // useAuth 훅 추가
import LoginOutButton from '@/components/ui/LoginOutButton'; // LoginOutButton 임포트
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Tabs 컴포넌트 임포트
import { useRouter } from 'next/navigation'; // useRouter 임포트
import PhotoStoryPage from '../photo-story/page'; // PhotoStoryPage 임포트 추가

const NEWS_CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'current_affairs', label: '시사' },
  { id: 'economy_it', label: '경제' },
  { id: 'entertainment', label: '연예' },
];

export default function NewsVotePage({ isActive = true }: { isActive?: boolean }) {
  const [newsList, setNewsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('created_at_desc'); // 정렬 기준 상태 추가
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null); // 마지막 문서 상태 추가
  const [hasMore, setHasMore] = useState(true); // 더 많은 데이터가 있는지 여부 상태 추가
  const [selectedTab, setSelectedTab] = useState('news-vote'); // 탭 상태 추가

  const { user } = useAuth(); // useAuth 훅 사용
  const router = useRouter(); // useRouter 훅 사용

  useEffect(() => {
    if (isActive && selectedTab === 'news-vote') { // isActive가 true이고 news-vote 탭이 활성화될 때만 데이터 로드
      setNewsList([]); // 카테고리/정렬 변경 시 목록 초기화
      setLastVisible(null); // 마지막 문서 초기화
      setHasMore(true); // 더보기 가능 상태 초기화
      fetchNews(true); // 처음부터 데이터 가져오기
    } else if (!isActive) {
      setLoading(false); // 탭이 활성화되지 않으면 로딩 상태 해제
    }
  }, [selectedCategory, sortBy, selectedTab, isActive]); // isActive를 의존성 배열에 추가

  const fetchNews = async (reset: boolean) => {
    setLoading(true);
    try {
      let q = query(collection(db, 'articles')); // 초기 쿼리 생성

      if (selectedCategory !== 'all') {
        q = query(q, where('category', '==', selectedCategory));
        console.log(`카테고리 필터 적용: ${selectedCategory}`); // 디버그 로그 추가
      }

      switch (sortBy) {
        case 'total_votes_desc':
          q = query(q, orderBy('total_votes', 'desc'), orderBy('created_at', 'desc')); // 인기순, 동점 시 최신순
          console.log('정렬 기준: 인기순 (total_votes desc, created_at desc)'); // 디버그 로그 추가
          break;
        case 'view_count_desc':
          q = query(q, orderBy('view_count', 'desc'), orderBy('created_at', 'desc')); // 조회수순, 동점 시 최신순
          console.log('정렬 기준: 조회수순 (view_count desc, created_at desc)'); // 디버그 로그 추가
          break;
        case 'created_at_desc':
        default:
          q = query(q, orderBy('created_at', 'desc')); // 최신순
          console.log('정렬 기준: 최신순 (created_at desc)'); // 디버그 로그 추가
          break;
      }

      if (!reset && lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      q = query(q, limit(10)); // 항상 10개로 제한
      
      const snapshot = await getDocs(q);
      const newNews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setNewsList(prevNews => (reset ? newNews : [...prevNews, ...newNews]));
      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(newNews.length === 10); // 10개 미만이면 더 이상 데이터 없음

    } catch (error) {
      console.error('뉴스 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 투표 핸들러 구현 (목록 페이지에서는 사용 안 함)
  // const handleVote = async (articleId: string, optionId: string, totalVotes: number) => { ... };

  return (
    <div className="min-h-screen bg-gray-900 text-white relative pt-[80px]"> {/* main 태그를 div로 변경 */}
      {!isActive ? ( // isActive가 false일 때는 LoginOutButton, 제목, 설명, Tabs를 렌더링하지 않음
        <div className="container mx-auto px-4 py-6">
          {/* NewsVotePage의 실제 내용 */}
          {/* 카테고리 탭 */}
            <div className="mb-6 flex justify-center"> {/* 중앙 정렬 추가 */}
              <CategoryCarousel
                categories={NEWS_CATEGORIES}
                selectedCategory={selectedCategory}
                onSelect={setSelectedCategory}
              />
            </div>

            {/* 새 뉴스 제안하기 버튼 (로그인 시에만 노출) 및 정렬 기준 선택 UI */}
            <div className="flex justify-between items-center mb-6">
              {user && ( // user가 있을 때만 버튼 노출
                <Link href="/news-vote/submit" className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded-lg shadow-md transition-colors text-xs"> {/* 크기 조정 */}
                  투표 등록
                </Link>
              )}
              <div className="flex gap-2 ml-auto"> {/* text-sm 제거, 버튼 개별 text-xs 적용 */}
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

            {/* 투표 목록 */}
            <div className="space-y-6">
              {loading && newsList.length === 0 ? ( // 초기 로딩 또는 데이터 없을 때만 로딩 표시
                <div className="text-center py-10 text-gray-400">
                  뉴스 투표를 불러오는 중...
                </div>
              ) : newsList.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  선택한 카테고리의 뉴스 투표가 없습니다.
                </div>
              ) : (
                newsList.map(newsItem => (
                  <Link href={`/news-vote/${newsItem.id}`} key={newsItem.id} className="block">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20 shadow-lg cursor-pointer hover:bg-white/20 transition-all">
                      <h2 className="text-xl font-bold mb-2">{
                        newsItem.category && NEWS_CATEGORIES.find(cat => cat.id === newsItem.category)?.label ? 
                        `[${NEWS_CATEGORIES.find(cat => cat.id === newsItem.category)?.label}] ${newsItem.title}` : 
                        newsItem.title
                      }</h2>
                      <p className="text-gray-300 text-sm mb-4">{newsItem.summary}</p>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-blue-300 hover:text-blue-400 text-xs inline-block">원문 보기 →</span>
                      </div>

                      <div className="mt-6 flex justify-between items-center text-xs text-gray-500">
                        <span>총 {newsItem.total_votes}명 참여</span>
                        <span>조회수 {newsItem.view_count}</span>
                      </div>
                    </div>
                  </Link>
                ))
              )}

              {loading && newsList.length > 0 && (
                <div className="text-center py-4 text-gray-400">더보기 로딩 중...</div>
              )}
              {!loading && hasMore && ( 
                <div className="text-center mt-6">
                  <button
                    onClick={() => fetchNews(false)}
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
                      // 이 onClick 핸들러를 추가하여 페이지를 이동시킵니다.
                      onClick={() => router.push('/photo-story')} 
                  >
                      사진투표
                </TabsTrigger>
              </TabsList>
              <TabsContent value="news-vote" className="w-full">
                {/* 카테고리 탭 */}
                <div className="mb-6 flex justify-center"> {/* 중앙 정렬 추가 */}
                  <CategoryCarousel
                    categories={NEWS_CATEGORIES}
                    selectedCategory={selectedCategory}
                    onSelect={setSelectedCategory}
                  />
                </div>

                {/* 새 뉴스 제안하기 버튼 (로그인 시에만 노출) 및 정렬 기준 선택 UI */}
                <div className="flex justify-between items-center mb-6">
                  {user && ( // user가 있을 때만 버튼 노출
                    <Link href="/news-vote/submit" className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded-lg shadow-md transition-colors text-xs"> {/* 크기 조정 */}
                      투표 등록
                    </Link>
                  )}
                  <div className="flex gap-2 ml-auto"> {/* text-sm 제거, 버튼 개별 text-xs 적용 */}
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

                {/* 투표 목록 */}
                <div className="space-y-6">
                  {loading && newsList.length === 0 ? ( // 초기 로딩 또는 데이터 없을 때만 로딩 표시
                    <div className="text-center py-10 text-gray-400">
                      뉴스 투표를 불러오는 중...
                    </div>
                  ) : newsList.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      선택한 카테고리의 뉴스 투표가 없습니다.
                    </div>
                  ) : (
                    <>
                      <div className="space-y-6">
                        {newsList.map(newsItem => (
                          <Link href={`/news-vote/${newsItem.id}`} key={newsItem.id} className="block">
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20 shadow-lg cursor-pointer hover:bg-white/20 transition-all">
                              <h2 className="text-xl font-bold mb-2">{
                                newsItem.category && NEWS_CATEGORIES.find(cat => cat.id === newsItem.category)?.label ? 
                                `[${NEWS_CATEGORIES.find(cat => cat.id === newsItem.category)?.label}] ${newsItem.title}` : 
                                newsItem.title
                              }</h2>
                              <p className="text-gray-300 text-sm mb-4">{newsItem.summary}</p>
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-blue-300 hover:text-blue-400 text-xs inline-block">원문 보기 →</span>
                              </div>

                              <div className="mt-6 flex justify-between items-center text-xs text-gray-500">
                                <div>
                                  <span>총 {newsItem.total_votes}명 참여</span>
                                  <span className="mx-2">•</span>
                                  <span>조회수 {newsItem.view_count}</span>
                                </div>
                                {user?.uid === 'vW1OuC6qMweyOqu73N0558pv4b03' && (
                                  <button
                                    onClick={async (e) => {
                                      e.preventDefault(); // Link 이벤트 방지
                                      if (window.confirm('이 뉴스를 삭제하시겠습니까?')) {
                                        try {
                                          await deleteDoc(doc(db, 'articles', newsItem.id));
                                          setNewsList(prevList => prevList.filter(item => item.id !== newsItem.id));
                                          alert('삭제되었습니다.');
                                        } catch (error) {
                                          console.error('삭제 실패:', error);
                                          alert('삭제에 실패했습니다.');
                                        }
                                      }
                                    }}
                                    className="text-red-500 hover:text-red-400 transition-colors"
                                  >
                                    삭제
                                  </button>
                                )}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>

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
                            onClick={() => fetchNews(false)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center mx-auto"
                          >
                            <span>더 많은 뉴스 보기</span>
                            <span className="ml-2">↓</span>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="modoo-vote" className="w-full">
                <div className="container mx-auto px-4 py-6 text-center text-gray-400">
                  <h2 className="text-xl font-bold">공감투표 페이지입니다.</h2>
                  <p className="mt-2">공감투표 콘텐츠는 여기에 표시됩니다.</p>
                  <Link href="/modoo-vote" className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">공감투표 바로가기</Link>
                </div>
              </TabsContent>
              <TabsContent value="photo-vote" className="w-full">
                <PhotoStoryPage isActive={selectedTab === 'photo-vote'} />
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}
    </div>
  );
}

