'use client';

import { useEffect, useState } from 'react';
import { db } from '../../../firebase';
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  updateDoc,
  doc,
  increment,
  getDoc
} from 'firebase/firestore';
import Link from 'next/link';
import CategoryCarousel from '../../components/CategoryCarousel';
import { Button } from '@/components/ui/button';

const CATEGORIES = ['일상', '감정', '관계', '목표/취미', '특별한 날', '기타/자유'];

const REACTIONS = [
  { 
    id: 'awesome', 
    text: '멋져요',
    bgColor: 'bg-blue-500/10 hover:bg-blue-500/20',
    textColor: 'text-blue-200',
    countBgColor: 'bg-blue-500/20'
  },
  { 
    id: 'cheer', 
    text: '힘내세요',
    bgColor: 'bg-green-500/10 hover:bg-green-500/20',
    textColor: 'text-green-200',
    countBgColor: 'bg-green-500/20'
  },
  { 
    id: 'sad', 
    text: '슬퍼요',
    bgColor: 'bg-purple-500/10 hover:bg-purple-500/20',
    textColor: 'text-purple-200',
    countBgColor: 'bg-purple-500/20'
  },
  { 
    id: 'same', 
    text: '저도그래요',
    bgColor: 'bg-rose-500/10 hover:bg-rose-500/20',
    textColor: 'text-rose-200',
    countBgColor: 'bg-rose-500/20'
  },
];

export default function LikesPage() {
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [isMobile, setIsMobile] = useState(false);
  const [reacting, setReacting] = useState(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchLikes = async () => {
      try {
        const likesRef = collection(db, 'likes');
        const q = query(likesRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const likesData = [];
        for (const doc of querySnapshot.docs) {
          const data = doc.data();
          likesData.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            reactions: data.reactions || {
              awesome: 0,
              cheer: 0,
              sad: 0,
              same: 0
            }
          });
        }
        
        setLikes(likesData);
      } catch (error) {
        console.error('공감 목록 가져오기 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLikes();
  }, []);

  const handleReaction = async (postId, reactionId) => {
    const reactionKey = `${postId}:${reactionId}`;
    if (reacting === reactionKey) return;

    setReacting(reactionKey);
    try {
      // 해당 게시물의 문서 참조 가져오기
      const postRef = doc(db, 'likes', postId);
      
      // reactions 필드 업데이트
      await updateDoc(postRef, {
        [`reactions.${reactionId}`]: increment(1)
      });

      // 업데이트된 문서 가져오기
      const updatedDoc = await getDoc(postRef);
      const updatedData = updatedDoc.data();

      // 로컬 상태 업데이트
      setLikes(prevLikes => 
        prevLikes.map(like => {
          if (like.id === postId) {
            return {
              ...like,
              reactions: updatedData.reactions || like.reactions
            };
          }
          return like;
        })
      );
    } catch (error) {
      console.error('공감 반응 저장 실패:', error);
      alert('공감 저장에 실패했습니다.');
    } finally {
      setReacting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filteredLikes = selectedCategory === '전체' 
    ? likes 
    : likes.filter(like => like.category === selectedCategory);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">공감 한 조각</h1>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            홈으로
          </Link>
        </div>

        {/* 카테고리 필터 */}
        {isMobile ? (
          <div className="mb-8">
            <CategoryCarousel
              categories={CATEGORIES}
              selectedCategory={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setSelectedCategory('전체')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedCategory === '전체'
                  ? 'bg-white/20 text-white'
                  : 'bg-black/50 text-white/70 hover:bg-white/10'
              }`}
            >
              전체
            </button>
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedCategory === category
                    ? 'bg-white/20 text-white'
                    : 'bg-black/50 text-white/70 hover:bg-white/10'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        {filteredLikes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">아직 공감한 조각이 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLikes.map((like) => (
              <div key={like.id} className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700/80 transition-colors">
                <div className="mb-3 flex justify-between items-center">
                  <span className="text-sm text-gray-400">{like.category}</span>
                  <span className="text-xs text-gray-500">
                    {like.createdAt?.toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-300 text-sm whitespace-pre-wrap mb-4">{like.content}</p>
                <div className="grid grid-cols-2 gap-2">
                  {REACTIONS.map((reaction) => (
                    <Button
                      key={reaction.id}
                      onClick={() => handleReaction(like.id, reaction.id)}
                      disabled={reacting === `${like.id}:${reaction.id}`}
                      variant="ghost"
                      className={`flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg text-sm transition-colors
                        ${reacting === `${like.id}:${reaction.id}`
                          ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                          : `${reaction.bgColor} ${reaction.textColor}`
                        }`}
                    >
                      <span>{reaction.text}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${reaction.countBgColor}`}>
                        {like.reactions[reaction.id] || 0}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 