'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import VoteComponent from '@/components/template/VoteComponent';
import { useSelector } from 'react-redux';

interface VoteOption {
  id: string;
  text: string;
  votes: number;
  voters: string[];
  images: string[];
}

interface VoteData {
  id?: string;
  title: string;
  description: string;
  options: VoteOption[];
  password: string;
  createdAt: any;
  createdBy: string;
  isPasswordProtected: boolean;
  category: string;
}

export default function VotePage() {
  const { id } = useParams();
  const [voteData, setVoteData] = useState<VoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentUser } = useSelector((state: any) => state.user);

  useEffect(() => {
    const fetchVoteData = async () => {
      try {
        const voteRef = doc(db, 'votes', id as string);
        const voteSnap = await getDoc(voteRef);
        
        if (voteSnap.exists()) {
          const data = voteSnap.data();
          setVoteData({
            ...data,
            id: voteSnap.id,
            options: data.options.map((option: any) => ({
              ...option,
              images: option.images || []
            }))
          } as VoteData);
        } else {
          setError('투표를 찾을 수 없습니다.');
        }
      } catch (error) {
        console.error('투표 데이터 로드 실패:', error);
        setError('투표 데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchVoteData();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">{error}</h1>
          <p className="text-gray-500">
            올바른 URL인지 확인해주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-black py-12">
      <div className="container max-w-[1100px] mx-auto px-4">
        <VoteComponent voteData={voteData} />
      </div>
    </div>
  );
} 