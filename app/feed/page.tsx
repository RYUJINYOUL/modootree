'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';

interface FeedItem {
  id: string;
  type: 'likes' | 'joy' | 'modoo-ai';
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
};
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '@/firebase';
import Image from 'next/image';
import { Heart, MessageCircle, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CategoryCarousel from '../../components/CategoryCarousel';

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

export default function FeedPage() {
  const router = useRouter();
  const currentUser = useSelector((state: any) => state.user.currentUser);
  const [loading, setLoading] = useState(true);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    loadInitialFeed();
  }, []);

  const loadInitialFeed = async () => {
    setLoading(true);
    try {
      const [likesData, joyData, modooData] = await Promise.all([
        fetchFromCollection('likes', 10),
        fetchFromCollection('joy', 10),
        fetchFromCollection('modoo-ai-tests', 10)
      ]);

      const [formattedLikes, formattedJoy, formattedModoo] = await Promise.all([
        formatData(likesData, 'likes'),
        formatData(joyData, 'joy'),
        formatData(modooData, 'modoo-ai')
      ]);

      const combinedData = [
        ...formattedLikes,
        ...formattedJoy,
        ...formattedModoo
      ].sort((a: any, b: any) => b.createdAt - a.createdAt);

      setFeedItems(combinedData);
    } catch (error) {
      console.error('피드 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFromCollection = async (collectionName: string, itemLimit: number = 10): Promise<any[]> => {
    const q = query(
      collection(db, collectionName),
      orderBy('createdAt', 'desc'),
      limit(itemLimit)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));
  };

  const formatData = async (data: any[], type: string): Promise<FeedItem[]> => {
    const formattedData = await Promise.all(data.map(async (item) => {
      // 댓글 수 가져오기
      const commentsQuery = query(
        collection(db, type === 'likes' ? 'comments' : 
                     type === 'joy' ? 'joyComments' : 'modoo-ai-comments'),
        where(type === 'likes' ? 'likeId' : 
              type === 'joy' ? 'postId' : 'testId', '==', item.id)
      );
      const commentsSnapshot = await getDocs(commentsQuery);
      const commentCount = commentsSnapshot.size;

      // 좋아요 수 가져오기
      let likeCount = 0;
      if (type === 'modoo-ai') {
        // modoo-ai는 stats.likeCount를 직접 사용
        likeCount = item.stats?.likeCount || 0;
      } else {
        const likesQuery = query(
          collection(db, type === 'likes' ? 'likesReactions' : 'joyLikes'),
          where(type === 'likes' ? 'likeId' : 'postId', '==', item.id)
        );
        const likesSnapshot = await getDocs(likesQuery);
        likeCount = likesSnapshot.size;
      }

      return {
        ...item,
        type,
        displayType: 
          type === 'likes' ? '공감 한조각' :
          type === 'joy' ? '사진 한조각' :
          '사연 한조각',
        previewContent: item.content || item.description || '',
        emotionIcon: type === 'modoo-ai' ? EMOTION_ICONS[(item.emotion as keyof typeof EMOTION_ICONS) || 'default'] : null,
        comments: commentCount,
        likes: likeCount
      };
    }));

    return formattedData;
  };

  const FILTERS = [
    { id: 'all', label: '전체' },
    { id: 'likes', label: '공감', path: '/likes/all', fullLabel: '공감 한조각' },
    { id: 'joy', label: '사진', path: '/joy', fullLabel: '사진 한조각' },
    { id: 'modoo-ai', label: '사연', path: '/modoo-ai', fullLabel: '사연 한조각' }
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-gray-900">
      <div className="w-full max-w-[2000px] mx-auto px-4 py-6">
        {/* 헤더 영역 */}
        <div className="sticky top-0 z-40 bg-gradient-to-b from-slate-950 to-slate-950/80 backdrop-blur-sm py-4">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-4 mb-6">
              <h1 className="text-3xl font-bold text-white">모두트리 피드</h1>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost"
                    className="bg-blue-500/10 hover:bg-blue-500/30 text-white/90 hover:text-white px-3 border border-blue-500/30"
                  >
                    참여 <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 bg-gray-900/90 border border-blue-500/20">
                  <DropdownMenuItem
                    className="text-white/70 hover:text-white focus:text-white hover:bg-blue-500/50 cursor-pointer transition-colors"
                    onClick={() => router.push('/likes/all')}
                  >
                    공감
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-white/70 hover:text-white focus:text-white hover:bg-blue-500/50 cursor-pointer transition-colors"
                    onClick={() => router.push('/joy')}
                  >
                    사진
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-white/70 hover:text-white focus:text-white hover:bg-blue-500/50 cursor-pointer transition-colors"
                    onClick={() => router.push('/modoo-ai')}
                  >
                    사연
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* 모바일에서는 캐러셀, 데스크톱에서는 일반 버튼 */}
            <div className="w-full md:w-auto mb-4">
              <div className="hidden md:flex items-center justify-center gap-2">
                {FILTERS.map(filter => (
                  <Button
                    key={filter.id}
                    variant={activeFilter === filter.id ? "default" : "outline"}
                    onClick={() => setActiveFilter(filter.id)}
                    className={`whitespace-nowrap px-6 transition-all border ${
                      activeFilter === filter.id 
                        ? 'bg-blue-500 hover:bg-blue-600 text-white border-transparent' 
                        : 'bg-blue-500/10 hover:bg-blue-500/30 text-white/90 hover:text-white border-blue-500/30'
                    }`}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
              <div className="md:hidden w-full">
                <CategoryCarousel
                  categories={FILTERS}
                  selectedCategory={activeFilter}
                  onSelect={setActiveFilter}
                />
              </div>
            </div>
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
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
            {feedItems
              .filter(item => activeFilter === 'all' || item.type === activeFilter)
              .map((item: any) => (
                <div 
                  key={item.id}
                  onClick={() => {
                    if (item.type === 'modoo-ai') {
                      router.push(`/modoo-ai/tests/${item.id}`);
                    } else if (item.type === 'joy') {
                      router.push(`/joy`);
                    } else {
                      router.push(`/likes/all`);
                    }
                  }}
                  className="bg-white/10 rounded-lg overflow-hidden hover:bg-white/20 transition-colors cursor-pointer"
                >
                  {/* 썸네일 영역 */}
                  <div className="aspect-square relative bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    {item.type === 'modoo-ai' ? (
                      // 사연 한조각인 경우 이모티콘 표시
                      <div className="w-24 h-24 relative">
                        <img
                          src={item.emotionIcon}
                          alt="감정 이모티콘"
                          className="w-24 h-24 object-contain"
                        />
                      </div>
                    ) : item.images?.[0] ? (
                      // 이미지가 있는 경우
                      <Image
                        src={item.images[0]}
                        alt="썸네일"
                        fill
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  
                  {/* 콘텐츠 영역 */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-blue-400">{item.displayType}</span>
                      <span className="text-xs text-gray-400">
                        {item.createdAt?.toLocaleDateString()}
                      </span>
                    </div>
                    
                    {/* 제목 영역 - 두 줄 고정 */}
                    <h3 className="text-lg font-semibold text-white mb-2 h-[3.5rem] line-clamp-2">
                      {item.type === 'modoo-ai' ? item.title :
                       item.type === 'joy' ? (item.description || '').slice(0, 50) :
                       (item.content || '').slice(0, 50)}
                    </h3>
                    
                    {/* 내용 제외 */}

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
        )}
      </div>
    </main>
  );
}
