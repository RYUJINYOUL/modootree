'use client';

import { useState, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '@/firebase';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, MessageCircle } from 'lucide-react';

interface AiContentCarouselProps {
  type: 'likes' | 'joy' | 'modoo-ai';
}

interface FeedItem {
  id: string;
  createdAt: Date;
  title?: string;
  content?: string;
  description?: string;
  images?: string[];
  emotion?: string;
  stats?: {
    likeCount?: number;
    participantCount?: number;
  };
  comments?: number;
  likes?: number;
}

export default function AiContentCarousel({ type }: AiContentCarouselProps) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const options = {
    align: "center" as const,
    containScroll: "trimSnaps" as const,
    dragFree: true,
    loop: true,
    startIndex: 1
  };

  const [emblaRef] = useEmblaCarousel(options);

  useEffect(() => {
    loadItems();
  }, [type]);

  const loadItems = async () => {
    setLoading(true);
    try {
      let collectionName;
      if (type === 'modoo-ai') {
        collectionName = 'modoo-ai-tests';
      } else if (type === 'likes') {
        collectionName = 'likes';
      } else {
        collectionName = 'joy';
      }

      console.log('Loading from collection:', collectionName);

      const q = query(
        collection(db, collectionName),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      
      const snapshot = await getDocs(q);
      console.log('Found documents:', snapshot.size);

      const data = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const docData = doc.data();
          console.log('Document data:', docData);
          
          const item: FeedItem = {
            id: doc.id,
            ...docData,
            createdAt: docData.createdAt?.toDate(),
            comments: 0,
            likes: 0
          };

          // 댓글 수 가져오기
          const commentsQuery = query(
            collection(db, type === 'likes' ? 'comments' : 
                       type === 'joy' ? 'joyComments' : 'modoo-ai-comments'),
            where(type === 'likes' ? 'likeId' : 
                  type === 'joy' ? 'postId' : 'testId', '==', doc.id)
          );
          const commentsSnapshot = await getDocs(commentsQuery);
          item.comments = commentsSnapshot.size;

          // 좋아요 수 가져오기
          if (type === 'modoo-ai') {
            item.likes = item.stats?.likeCount || 0;
          } else {
            const likesQuery = query(
              collection(db, type === 'likes' ? 'likesReactions' : 'joyLikes'),
              where(type === 'likes' ? 'likeId' : 'postId', '==', doc.id)
            );
            const likesSnapshot = await getDocs(likesQuery);
            item.likes = likesSnapshot.size;
          }

          return item;
        })
      );

      console.log('Processed data:', data);
      setItems(data);
    } catch (error) {
      console.error('데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 카드 컴포넌트
  const Card = ({ item }: { item: FeedItem }) => (
    <div className="flex-[0_0_300px] min-w-0 px-1">
      <div className="mx-1">
        <Link 
          href={type === 'likes' ? '/likes/all' : type === 'joy' ? '/joy' : `/modoo-ai/tests/${item.id}`}
          className="block"
        >
          <div className="relative w-[280px] h-[320px] bg-[#2a6f97] rounded-3xl overflow-hidden shadow-lg backdrop-blur-sm hover:bg-[#357cab] transition-colors">
            <div className="absolute inset-0 flex flex-col p-4">
              {/* 썸네일 영역 */}
              <div className="w-full h-[200px] rounded-2xl overflow-hidden flex items-center justify-center bg-black/10">
                {type === 'modoo-ai' ? (
                  <div className="w-24 h-24">
                    <img
                      src={EMOTION_ICONS[item.emotion as keyof typeof EMOTION_ICONS || 'default']}
                      alt="감정 이모티콘"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : item.images?.[0] ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={item.images[0]}
                      alt="썸네일"
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : null}
              </div>

              {/* 콘텐츠 영역 */}
              <div className="flex-1 pt-4">
                <h3 className="text-lg font-semibold mb-2 text-white line-clamp-2">
                  {type === 'modoo-ai' ? item.title :
                   type === 'joy' ? item.description :
                   item.content}
                </h3>
                
                <div className="flex items-center justify-between text-sm text-gray-400">
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
                  
                  {type === 'modoo-ai' && (
                    <span className="text-blue-400">
                      {item.stats?.participantCount || 0}명
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1500px] mx-auto">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex backface-hidden">
          {items.map((item) => (
            <Card key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

const EMOTION_ICONS = {
  happy: '/logos/m1.png',    // 행복
  sad: '/logos/m6.png',      // 슬픔
  angry: '/logos/m9.png',    // 분노
  anxious: '/logos/m5.png',  // 불안
  peaceful: '/logos/m4.png', // 평온
  worried: '/logos/m14.png', // 걱정
  default: '/logos/m1.png'   // 기본
};