'use client';

import { useEffect, useState } from 'react';
import { db } from '@/firebase';
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  where,
  onSnapshot,
} from 'firebase/firestore';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

const CATEGORIES = [
  '전체',
  '한입냠냠', 
  '함께활동', 
  '반짝순간', 
  '취향원픽', 
  '소확행', 
  '여행휴가', 
  '셀렘만남', 
  '자유시간', 
  '기타'
];

interface VoteData {
  id: string;
  title: string;
  description: string;
  category: string;
  options: Array<{
    id: string;
    text: string;
    votes: number;
    voters: string[];
  }>;
  createdAt: any;
  createdBy: string;
  isPasswordProtected: boolean;
  totalVotes: number;
}

export default function VotesPage() {
  const { username } = useParams();
  const [votes, setVotes] = useState<VoteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const { currentUser } = useSelector((state: any) => state.user);

  // 캐러셀 설정
  const sliderSettings = {
    dots: false,
    infinite: false,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 4,
    arrows: false,
    responsive: [
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 3.5,
          slidesToScroll: 3,
        }
      }
    ]
  };

  useEffect(() => {
    const fetchVotes = async () => {
      try {
        let votesQuery = query(
          collection(db, 'votes'),
          orderBy('createdAt', 'desc')
        );

        if (username !== 'all') {
          votesQuery = query(
            collection(db, 'votes'),
            where('createdBy', '==', username),
            orderBy('createdAt', 'desc')
          );
        }

        const unsubscribe = onSnapshot(votesQuery, (snapshot) => {
          const votesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            totalVotes: doc.data().options.reduce((sum: number, option: any) => sum + option.votes, 0)
          })) as VoteData[];
          setVotes(votesData);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('투표 데이터 로드 실패:', error);
        setLoading(false);
      }
    };

    fetchVotes();
  }, [username]);

  const filteredVotes = selectedCategory === '전체'
    ? votes
    : votes.filter(vote => vote.category === selectedCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-black">
      <Header />
      
      <main className="container max-w-[1100px] mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">
            {username === 'all' ? '모든 투표' : `${username}님의 투표`}
          </h1>
          <Link href="/editor/vote/new">
            <Button>새 투표 만들기</Button>
          </Link>
        </div>

        {/* 카테고리 선택 - 데스크톱 */}
        <div className="hidden md:flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(category)}
              className="text-sm"
            >
              {category}
            </Button>
          ))}
        </div>

        {/* 카테고리 선택 - 모바일 캐러셀 */}
        <div className="md:hidden mb-8 -mx-4">
          <div className="px-4">
            <Slider {...sliderSettings}>
              {CATEGORIES.map(category => (
                <div key={category} className="px-1">
                  <Button
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(category)}
                    className="text-sm w-full whitespace-nowrap"
                  >
                    {category}
                  </Button>
                </div>
              ))}
            </Slider>
          </div>
        </div>

        {/* 투표 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVotes.map(vote => (
            <Link
              key={vote.id}
              href={`/vote/${vote.id}`}
              className="group block bg-white/10 backdrop-blur-lg rounded-xl p-6 hover:bg-white/20 transition-all hover:shadow-lg hover:-translate-y-1 border border-white/10"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="inline-block px-3 py-1 rounded-full text-xs bg-blue-500/20 text-blue-300">
                  {vote.category || '기타'}
                </span>
                <span className="text-sm text-white/60">
                  {new Date(vote.createdAt?.toDate()).toLocaleDateString()}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-white/90 mb-2 group-hover:text-white transition-colors">
                {vote.title}
              </h2>
              {vote.description && (
                <p className="text-white/70 text-sm mb-4 line-clamp-2 group-hover:text-white/80 transition-colors">
                  {vote.description}
                </p>
              )}
              <div className="flex justify-between items-center text-sm text-white/60">
                <span className="flex items-center gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  총 {vote.totalVotes}표
                </span>
                {vote.isPasswordProtected && (
                  <span className="flex items-center gap-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                    </svg>
                    비밀투표
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>

        {filteredVotes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/70">아직 투표가 없습니다.</p>
          </div>
        )}
      </main>
    </div>
  );
} 