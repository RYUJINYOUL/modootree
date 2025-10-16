'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '@/firebase';
import Image from 'next/image';
import { Heart, MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CategoryCarousel from '../../components/CategoryCarousel';
import { loadSlim } from "tsparticles-slim";
import Particles from "react-tsparticles";

// 감정별 이모티콘 매핑
const EMOTION_ICONS = {
  happy: '/logos/m1.png',    // 행복
  sad: '/logos/m6.png',      // 슬픔
  angry: '/logos/m9.png',    // 분노
  anxious: '/logos/m5.png',  // 불안
  peaceful: '/logos/m4.png', // 평온
  worried: '/logos/m14.png', // 걱정
  default: '/logos/m1.png'   // 기본
};

interface FeedItem {
  id: string;
  type: 'likes' | 'joy' | 'modoo-ai' | 'health';  // health 타입 추가
  displayType: string;
  title?: string;
  content?: string;
  description?: string;
  images?: string[];
  emotionIcon?: string;
  emotion?: string;
  createdAt: any;
  stats?: {
    likeCount?: number;
    participantCount?: number;
  };
  likes?: number;
  comments?: number;
  username?: string;
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
      const [likesData, photoStoryData, modooData, healthData] = await Promise.all([
        fetchFromCollection('likes', 10).then(data => {
          console.log('공감 데이터:', data.length);
          return data;
        }),
        fetchFromCollection('photo-stories', 10).then(data => {
          console.log('사진 스토리 데이터:', data.length);
          return data;
        }),
        fetchFromCollection('modoo-ai-tests', 10).then(data => {
          console.log('사연 데이터:', data.length);
          return data;
        }),
        fetchFromCollection('health_records', 10).then(data => {
          console.log('건강 기록 데이터:', data.length);
          return data;
        })
      ]);

      console.log('데이터 포맷팅 시작...');
      const [formattedLikes, formattedPhotoStory, formattedModoo, formattedHealth] = await Promise.all([
        formatData(likesData, 'likes').then(data => {
          console.log('공감 데이터 포맷팅 완료:', data.length);
          return data;
        }),
        formatData(photoStoryData, 'photo-story').then(data => {
          console.log('사진 스토리 데이터 포맷팅 완료:', data.length);
          return data;
        }),
        formatData(modooData, 'modoo-ai').then(data => {
          console.log('사연 데이터 포맷팅 완료:', data.length);
          return data;
        }),
        formatData(healthData, 'health').then(data => {
          console.log('건강 기록 데이터 포맷팅 완료:', data.length);
          return data;
        })
      ]);

      console.log('데이터 병합 시작...');
      const combinedData = [
        ...formattedLikes,
        ...formattedPhotoStory,
        ...formattedModoo,
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
    console.log(`${collectionName} 컬렉션에서 데이터 가져오기 시작...`);
    const q = query(
      collection(db, collectionName),
      orderBy('createdAt', 'desc'),
      limit(itemLimit)
    );
    
    const snapshot = await getDocs(q);
    console.log(`${collectionName} 컬렉션 데이터 개수:`, snapshot.size);
    
    const data = snapshot.docs.map(doc => {
      const docData = doc.data();
      console.log(`${collectionName} 문서 데이터:`, { id: doc.id, ...docData });
      return {
      id: doc.id,
        ...docData,
        createdAt: docData.createdAt?.toDate()
      };
    });
    
    return data;
  };

  const formatData = async (data: any[], type: string): Promise<FeedItem[]> => {
    const formattedData = await Promise.all(data.map(async (item) => {
      // 댓글 수 가져오기
      let commentCount = 0;
      if (type === 'photo-story') {
        const commentsQuery = query(
          collection(db, 'photo-story-comments'),
          where('storyId', '==', item.id)
        );
        const commentsSnapshot = await getDocs(commentsQuery);
        commentCount = commentsSnapshot.size;
      } else if (type === 'health') {
        // 건강 기록은 댓글 기능이 없으므로 0으로 설정
        commentCount = 0;
      } else {
        const commentsQuery = query(
          collection(db, type === 'likes' ? 'comments' : 'modoo-ai-comments'),
          where(type === 'likes' ? 'likeId' : 'testId', '==', item.id)
        );
        const commentsSnapshot = await getDocs(commentsQuery);
        commentCount = commentsSnapshot.size;
      }

      // 좋아요 수 가져오기
      let likeCount = 0;
      if (type === 'modoo-ai') {
        // modoo-ai는 stats.likeCount를 직접 사용
        likeCount = item.stats?.likeCount || 0;
      } else if (type === 'photo-story') {
        // photo-story는 likeCount를 직접 사용
        likeCount = item.likeCount || 0;
      } else if (type === 'health') {
        // 건강 기록은 좋아요 기능이 없으므로 0으로 설정
        likeCount = 0;
      } else {
        const likesQuery = query(
          collection(db, 'likesReactions'),
          where('likeId', '==', item.id)
        );
        const likesSnapshot = await getDocs(likesQuery);
        likeCount = likesSnapshot.size;
      }

      let formattedItem = {
        ...item,
        type,
        displayType: 
          type === 'likes' ? '공감 한조각' :
          type === 'photo-story' ? 'AI 사진 스토리' :
          type === 'health' ? 'AI 건강기록' :
          '사연 한조각',
        previewContent: item.content || item.description || '',
        emotionIcon: type === 'modoo-ai' ? EMOTION_ICONS[(item.emotion as keyof typeof EMOTION_ICONS) || 'default'] : null,
        comments: commentCount,
        likes: likeCount
      };

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
    { id: 'likes', label: '공감', path: '/likes/all', fullLabel: '공감 한조각' },
    { id: 'photo-story', label: '사진', path: '/photo-story', fullLabel: 'AI 사진 스토리' },
    { id: 'modoo-ai', label: '사연', path: '/modoo-ai', fullLabel: '사연 한조각' },
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
          <div className="max-w-md w-full">
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
                .filter(item => activeFilter === 'all' || item.type === activeFilter)
                .slice(0, displayCount)
                .map((item: any) => (
                <div 
                  key={item.id}
                  onClick={() => {
                    if (item.type === 'modoo-ai') {
                      router.push(`/modoo-ai/tests/${item.id}`);
                    } else if (item.type === 'photo-story') {
                      router.push(`/photo-story/${item.id}`);
                    } else if (item.type === 'health') {
                      router.push(`/health/results/${item.id}`);
                    } else {
                      router.push(`/likes/all`);
                    }
                    // 페이지 이동 후 스크롤 위치 초기화
                    window.scrollTo(0, 0);
                  }}
                  className="bg-white/10 rounded-lg overflow-hidden hover:bg-white/20 transition-colors cursor-pointer"
                >
                  {/* 썸네일 영역 */}
                  <div className="aspect-square relative bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    {item.type === 'modoo-ai' ? (
                      // 사연 한조각인 경우 이모티콘 표시
                      <div className="relative w-full h-full flex items-center justify-center">
                      <div className="w-24 h-24 relative">
                        <img
                          src={item.emotionIcon}
                          alt="감정 이모티콘"
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
                    
                    {/* 제목 영역 - 두 줄 고정 */}
                    <h3 className="text-lg font-semibold text-white mb-2 h-[3.5rem] line-clamp-2">
                      {item.type === 'modoo-ai' ? item.title :
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
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {item.likes || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          {item.comments || 0}
                        </span>
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