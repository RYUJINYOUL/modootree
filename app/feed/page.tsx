'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '@/firebase';
import Image from 'next/image';
import { Heart, MessageCircle, Gift, Users, Baby, Plus, Eye } from 'lucide-react';
import { LinkLetter, letterCategories } from '../link-letter/page';
import { useRouter } from 'next/navigation';
import CategoryCarousel from '../../components/CategoryCarousel';
import { loadSlim } from "tsparticles-slim";
import Particles from "react-tsparticles";

// 감정별 이모티콘 매핑
const MODOO_CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'happy', label: '행복' },
  { id: 'sad', label: '슬픔' },
  { id: 'angry', label: '화남' },
  { id: 'anxious', label: '불안' },
  { id: 'comfort', label: '편안' },
  { id: 'worry', label: '고민' },
];

const NEWS_CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'current_affairs', label: '시사' },
  { id: 'economy_it', label: '경제' },
  { id: 'entertainment', label: '연예' },
];

const EMOTION_ICONS = {
  happy: '/logos/m1.png',    // 행복
  sad: '/logos/m6.png',      // 슬픔
  angry: '/logos/m9.png',    // 분노
  anxious: '/logos/m5.png',  // 불안
  comfort: '/logos/m8.png', // 편안
  worry: '/logos/m14.png', // 고민
  default: '/logos/m1.png'   // 기본
};

interface FeedItem extends Partial<LinkLetter> {
  id: string;
  type: 'link-letter' | 'joy' | 'modoo-ai' | 'health' | 'news';
  displayType: string;
  // LinkLetter에서 이미 정의된 속성들은 Partial로 확장하여 중복을 피하고 선택적으로 사용
  // 추가적으로 필요한 FeedItem만의 속성을 여기에 정의
  previewContent?: string; // 미리보기 콘텐츠 (optional)
}

export default function FeedPage() {
  const router = useRouter();
  const currentUser = useSelector((state: any) => state.user.currentUser);
  const [loading, setLoading] = useState(true);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [displayCount, setDisplayCount] = useState(28); // PC에서 초기에 보여줄 아이템 수

  const particlesInit = useCallback(async (engine: any) => {
    await loadSlim(engine);
  }, []);

  useEffect(() => {
    loadInitialFeed();
  }, []);

  const loadInitialFeed = async () => {
    setLoading(true);
    try {
      console.log('피드 데이터 로딩 시작...');
      console.log('데이터 로딩 시작...');
      const [newsData, linkLetterData, photoStoryData, modooVoteData, healthData] = await Promise.all([
        fetchFromCollection('articles', 10).then(data => {
          console.log('뉴스 투표 데이터 로드:', {
            collectionName: 'articles',
            dataLength: data.length,
            sampleData: data[0]
          });
          return data;
        }),
        fetchFromCollection('linkLetters', 10).then(data => {
          console.log('링크편지 데이터:', data.length);
          return data;
        }),
        fetchFromCollection('photo-stories', 10).then(data => {
          console.log('사진 스토리 데이터:', data.length);
          return data;
        }),
        fetchFromCollection('modoo-vote-articles', 10).then(data => {
          console.log('공감 투표 데이터:', data.length);
          return data;
        }),
        fetchFromCollection('health_records', 10).then(data => {
          console.log('건강 기록 데이터:', data.length);
          return data;
        })
      ]);

      console.log('데이터 포맷팅 시작...');
      const [formattedNews, formattedLinkLetter, formattedPhotoStory, formattedModooVote, formattedHealth] = await Promise.all([
        formatData(newsData, 'news').then(data => {
          console.log('뉴스 데이터 포맷팅:', {
            originalLength: newsData.length,
            formattedLength: data.length,
            sampleFormattedData: data[0]
          });
          return data;
        }),
        formatData(linkLetterData, 'link-letter').then(data => {
          console.log('링크편지 데이터 포맷팅 완료:', data.length);
          return data;
        }),
        formatData(photoStoryData, 'photo-story').then(data => {
          console.log('사진 스토리 데이터 포맷팅 완료:', data.length);
          return data;
        }),
        formatData(modooVoteData, 'modoo-vote-articles').then(data => {
          console.log('사연 투표 데이터 포맷팅 완료:', data.length);
          return data;
        }),
        formatData(healthData, 'health').then(data => {
          console.log('건강 기록 데이터 포맷팅 완료:', data.length);
          return data;
        })
      ]);

      console.log('데이터 병합 시작...');
      const combinedData = [
        ...formattedNews,
        ...formattedLinkLetter,
        ...formattedPhotoStory,
        ...formattedModooVote,
        ...formattedHealth
      ].sort((a: any, b: any) => b.createdAt - a.createdAt);

      console.log('최종 데이터 개수:', combinedData.length);
      console.log('데이터 샘플:', combinedData[0]);

      setFeedItems(combinedData);
    } catch (error: any) {
      console.error('피드 로딩 실패:', error);
      console.error('에러 상세:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      // 에러 발생해도 빈 배열로 설정
      setFeedItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFromCollection = async (collectionName: string, itemLimit: number = 10): Promise<any[]> => {
    try {
      console.log(`${collectionName} 컬렉션에서 데이터 가져오기 시작...`);
      
      let orderByField = 'createdAt';
      if (collectionName === 'articles') {
        orderByField = 'created_at';
      } else if (collectionName === 'linkLetters') {
        orderByField = 'createdAt'; // linkLetters 컬렉션의 정렬 기준은 createdAt
      }
      
      const q = query(
        collection(db, collectionName),
        orderBy(orderByField, 'desc'),
        limit(itemLimit)
      );
      
      const snapshot = await getDocs(q);
      console.log(`${collectionName} 컬렉션 데이터 개수:`, snapshot.size);
      
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        console.log(`${collectionName} 문서 데이터:`, { id: doc.id, ...docData });
        
        // 뉴스 데이터의 경우 created_at 필드를 createdAt으로 정규화
        if (collectionName === 'articles') {
          return {
            id: doc.id,
            ...docData,
            createdAt: docData.created_at?.toDate() || docData.createdAt?.toDate() || new Date()
          };
        }
        
        return {
          id: doc.id,
          ...docData,
          createdAt: docData.createdAt?.toDate() || new Date()
        };
      });
      
      console.log(`${collectionName} 데이터 처리 완료:`, data);
      return data;
    } catch (error) {
      console.error(`${collectionName} 데이터 가져오기 실패:`, error);
      return [];  // 에러 발생 시 빈 배열 반환
    }
  };

  const formatData = async (data: any[], type: string): Promise<FeedItem[]> => {
    const formattedData = await Promise.all(data.map(async (item) => {
      // 댓글 수 가져오기 (링크편지는 댓글 기능 없음)
      let commentCount = 0;
      if (type === 'photo-story') {
        const commentsQuery = query(
          collection(db, 'photo-story-comments'),
          where('storyId', '==', item.id)
        );
        const commentsSnapshot = await getDocs(commentsQuery);
        commentCount = commentsSnapshot.size;
      } else if (type === 'news' || type === 'modoo-vote-articles') {
        const commentsQuery = query(
          collection(db, type === 'news' ? 'news-vote-articles' : 'modoo-vote-articles', item.id, 'comments')
        );
        const commentsSnapshot = await getDocs(commentsQuery);
        commentCount = commentsSnapshot.size;
      } else if (type === 'health') {
        commentCount = 0;
      } else if (type === 'modoo-ai') {
        const commentsQuery = query(
          collection(db, 'modoo-ai-comments'),
          where('testId', '==', item.id)
        );
        const commentsSnapshot = await getDocs(commentsQuery);
        commentCount = commentsSnapshot.size;
      }

      // 좋아요 수 가져오기 (링크편지는 좋아요 기능 없음)
      let likeCount = 0;
      if (type === 'news') {
        likeCount = item.total_votes || 0;
      } else if (type === 'modoo-ai') {
        likeCount = item.stats?.likeCount || 0;
      } else if (type === 'photo-story') {
        likeCount = item.likeCount || 0;
      } else if (type === 'health') {
        likeCount = 0;
      } else if (type === 'link-letter') { // 링크편지 좋아요 수 처리 추가
        likeCount = item.likeCount || 0; // LinkLetter 인터페이스에 likeCount가 존재
      } else {
        // 그 외 기본 좋아요 처리 (현재는 필요 없으므로 제거 또는 주석 처리)
        // const likesQuery = query(
        //   collection(db, 'likesReactions'),
        //   where('likeId', '==', item.id)
        // );
        // const likesSnapshot = await getDocs(likesQuery);
        // likeCount = likesSnapshot.size;
        likeCount = 0; // 기본값 0으로 설정
      }

      let formattedItem;
      
      if (type === 'news') {
        formattedItem = {
          id: item.id,
          type,
          displayType: '뉴스 투표',
          title: item.title || '',
          summary: item.summary || '',
          category: item.category || '',
          total_votes: item.total_votes || 0,
          view_count: item.view_count || 0,
          vote_options: item.vote_options || [],
          createdAt: item.createdAt,
          comments: commentCount,
          likes: likeCount
        };
      } else if (type === 'link-letter') {
        formattedItem = {
          id: item.id,
          type,
          displayType: '링크 편지',
          title: item.title || '',
          content: item.content || '',
          images: item.images || [],
          category: item.category || '',
          author: item.author || { uid: '', displayName: '익명', email: '' },
          viewCount: item.viewCount || 0,
          likeCount: item.likeCount || 0,
          createdAt: item.createdAt,
          comments: commentCount, // 링크편지는 댓글 기능이 없지만 FeedItem 형식에 맞춤
          likes: likeCount // FeedItem 형식에 맞춤
        };
      } else {
        formattedItem = {
          ...item,
          type,
          displayType: 
            type === 'link-letter' ? '링크 편지' :
            type === 'photo-story' ? 'AI 사진 스토리' :
            type === 'health' ? 'AI 건강기록' :
            type === 'modoo-vote-articles' ? '사연 투표' :
            '사연 한조각',
          previewContent: item.content || item.description || '',
          emotionIcon: type === 'modoo-vote-articles' ? 
                   EMOTION_ICONS[item.category as keyof typeof EMOTION_ICONS] || EMOTION_ICONS.default : null,
          comments: commentCount,
          likes: likeCount
        };
      }

      // 건강 기록인 경우 추가 데이터 포맷팅
      if (type === 'health') {
        formattedItem = {
          ...formattedItem,
          date: item.date || new Date(item.createdAt).toLocaleDateString(),
          mealPhotos: [
            item.meals?.breakfast?.imageUrl,
            item.meals?.lunch?.imageUrl,
            item.meals?.dinner?.imageUrl
          ].filter(Boolean),
          exercisePhotos: item.exercise?.imageUrl ? [item.exercise.imageUrl] : [],
          content: item.analysis?.dailySummary?.overallComment || '건강 기록'
        };
      }

      return formattedItem;
    }));

    return formattedData;
  };

  const FILTERS = [
    { id: 'all', label: '전체' },
    { id: 'news', label: '뉴스', path: '/news-vote', fullLabel: '뉴스 투표' },
    { id: 'link-letter', label: '편지', path: '/link-letter', fullLabel: '링크 편지' },
    { id: 'photo-story', label: '사진', path: '/photo-story', fullLabel: 'AI 사진 스토리' },
    { id: 'modoo-vote-articles', label: '사연', path: '/modoo-vote', fullLabel: '사연 투표' },
    { id: 'health', label: '건강', path: '/health', fullLabel: 'AI 건강기록' }
  ];

  return (
    <main className="min-h-screen bg-black text-white/90 relative">
      <Particles
        className="absolute inset-0"
        init={particlesInit}
        options={{
          fpsLimit: 120,
          particles: {
            color: {
              value: ["#ffffff", "#87CEEB", "#FFD700"]
            },
            links: {
              color: "#ffffff",
              distance: 150,
              enable: true,
              opacity: 0.05,
              width: 1,
            },
            collisions: {
              enable: false,
            },
            move: {
              direction: "none",
              enable: true,
              outModes: {
                default: "out"
              },
              random: true,
              speed: { min: 0.1, max: 0.3 },
              straight: false,
              attract: {
                enable: true,
                rotate: {
                  x: 600,
                  y: 1200
                }
              }
            },
            number: {
              density: {
                enable: true,
                area: 800
              },
              value: 120
            },
            opacity: {
              animation: {
                enable: true,
                minimumValue: 0.1,
                speed: 1,
                sync: false
              },
              random: true,
              value: { min: 0.1, max: 0.8 }
            },
            shape: {
              type: "circle"
            },
            size: {
              animation: {
                enable: true,
                minimumValue: 0.1,
                speed: 2,
                sync: false
              },
              random: true,
              value: { min: 1, max: 3 }
            },
            twinkle: {
              lines: {
                enable: true,
                frequency: 0.005,
                opacity: 0.5,
                color: {
                  value: ["#ffffff", "#87CEEB"]
                }
              },
              particles: {
                enable: true,
                frequency: 0.05,
                opacity: 0.5
              }
            }
          },
          detectRetina: true
        }}
      />
      <div className="relative z-10 w-full max-w-[2000px] mx-auto px-4 pt-6 pb-20">
        {/* 필터 캐러셀만 유지 */}
        <div className="flex justify-center mb-4">
          <div className="w-full max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl">
                <CategoryCarousel
                  categories={FILTERS}
                  selectedCategory={activeFilter}
                  onSelect={setActiveFilter}
                />
              </div>
            </div>


        {/* 로딩 상태 */}
        {loading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* 피드 그리드 */}
        {!loading && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
              {feedItems
                .filter(item => (activeFilter === 'all' && item.type !== 'news') || item.type === activeFilter)
                .slice(0, displayCount)
                .map((item: any) => (
                <div 
                  key={item.id}
                  onClick={() => {
                    if (item.type === 'news') {
                      router.push(`/news-vote/${item.id}`);
                    } else if (item.type === 'modoo-vote-articles') {
                      router.push(`/modoo-vote/${item.id}`);
                    } else if (item.type === 'photo-story') {
                      router.push(`/photo-story/${item.id}`);
                    } else if (item.type === 'health') {
                      router.push(`/health/results/${item.id}`);
                    } else if (item.type === 'link-letter') {
                      router.push(`/link-letter/${item.id}`);
                    } else {
                      router.push(`/link-letter`);
                    }
                    // 페이지 이동 후 스크롤 위치 초기화
                    window.scrollTo(0, 0);
                  }}
                  className="bg-white/10 rounded-lg overflow-hidden hover:bg-white/20 transition-colors cursor-pointer"
                >
                  {/* 썸네일 영역 */}
                  <div className="aspect-square relative bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    {item.type === 'news' ? (
                      // 뉴스 투표인 경우
                      <div className="relative w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-blue-500/20">
                        <div className="absolute top-2 left-2 px-3 py-1 rounded-full bg-blue-500/50 backdrop-blur-sm text-white text-sm font-medium">
                          {NEWS_CATEGORIES.find(cat => cat.id === item.category)?.label || '뉴스'}
                        </div>
                        <div className="text-center">
                          <h3 className="text-lg font-bold text-white line-clamp-3 mb-2">
                            {item.title}
                          </h3>
                          <p className="text-sm text-white/70 line-clamp-2">
                            {item.summary}
                          </p>
                        </div>
                      </div>
                    ) : item.type === 'modoo-vote-articles' ? (
                      // 공감 투표인 경우 이모티콘 표시
                      <div className="relative w-full h-full flex items-center justify-center">
                      <div className="w-24 h-24 relative">
                        <img
                          src={EMOTION_ICONS[item.category as keyof typeof EMOTION_ICONS] || EMOTION_ICONS.default}
                          alt="감정 아이콘"
                          className="w-24 h-24 object-contain"
                        />
                      </div>
                        <div className="absolute top-2 left-2 px-3 py-1 rounded-full bg-blue-500/50 backdrop-blur-sm text-white text-sm font-medium">
                          투표
                        </div>
                      </div>
                    ) : item.type === 'health' ? (
                      // 건강 기록인 경우 식사/운동 이미지 표시
                      <Image
                        src={item.mealPhotos?.[0] || item.exercisePhotos?.[0] || '/music/hb.png'}
                        alt="건강 기록"
                        fill
                        className="object-cover"
                      />
                    ) : item.type === 'photo-story' ? (
                      // 포토 스토리인 경우
                      <div className="relative w-full h-full">
                      <Image
                        src={item.photo}
                        alt="포토 스토리"
                        fill
                        className="object-cover"
                      />
                        <div className="absolute top-2 left-2 px-3 py-1 rounded-full bg-blue-500/50 backdrop-blur-sm text-white text-sm font-medium">
                          투표
                        </div>
                      </div>
                    ) : item.type === 'link-letter' ? (
                      // 링크편지인 경우
                      <div className="relative w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-purple-500/20">
                        <div className="absolute top-2 left-2 px-3 py-1 rounded-full bg-purple-500/50 backdrop-blur-sm text-white text-sm font-medium z-10">
                          {letterCategories.find(cat => cat.id === item.category)?.name || '편지'}
                        </div>
                        {item.images && item.images.length > 0 ? (
                          <Image
                            src={item.images[0]}
                            alt="링크 편지 이미지"
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <Image
                            src="/samples/linklett.png"
                            alt="기본 링크 편지 이미지"
                            fill
                            className="object-cover opacity-70"
                          />
                        )}
                        <div className="text-center absolute bottom-4 w-full px-4">
                          <h3 className="text-sm font-medium text-white line-clamp-2">
                            {item.title || '링크 편지'}
                          </h3>
                        </div>
                      </div>
                    ) : (
                      // 이미지가 있는 경우 또는 기본 이미지
                      <Image
                        src={item.images?.[0] || '/music/jb.png'}
                        alt="썸네일"
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  
                  {/* 콘텐츠 영역 */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-blue-400">{item.displayType}</span>
                    </div>
                    
                    {/* 제목 영역 */}
                    <h3 className="text-lg font-semibold text-white mb-2 h-[3.5rem] line-clamp-2">
                      {item.type === 'news' ? (
                        item.title
                      ) : item.type === 'modoo-vote-articles' ? (
                        item.title
                      ) : item.type === 'link-letter' ? (
                        item.title || item.content || '링크 편지'
                      ) :
                       item.type === 'photo-story' ? 
                         (Array.isArray(item.aiStories) 
                           ? item.aiStories.find((s: any) => s.id === item.selectedStoryId)?.content 
                           : '') :
                       item.type === 'health' ?
                         item.analysis?.dailySummary?.overallComment || '건강 기록' :
                       (item.content || '').slice(0, 50)}
                    </h3>

                    <div className="flex items-center justify-between text-gray-400">
                      <div className="flex items-center gap-3">
                        {item.type === 'link-letter' ? (
                          <>
                            <span className="flex items-center gap-1">
                              <Heart className="w-4 h-4" />
                              {item.likeCount || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              {item.viewCount || 0}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="flex items-center gap-1">
                              <Heart className="w-4 h-4" />
                              {item.likes || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-4 h-4" />
                              {item.comments || 0}
                            </span>
                          </>
                        )}
                      </div>
                      
                      {/* 사연 한조각인 경우 참여자 수 표시 */}
                      {item.type === 'modoo-ai' && (
                        <span className="text-sm text-blue-400">
                          {item.stats?.participantCount || 0}명
                        </span>
                      )}
                    </div>
                  </div>
              </div>
            ))}
            </div>
            
            {/* 더보기 버튼 */}
            {feedItems.filter(item => activeFilter === 'all' || item.type === activeFilter).length > displayCount && (
              <div className="flex justify-center">
                <button
                  onClick={() => setDisplayCount(prev => prev + 28)}
                  className="px-6 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-white rounded-lg transition-colors backdrop-blur-sm"
                >
                  더보기
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}