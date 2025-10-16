'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, where, doc, getDoc, updateDoc, setDoc, increment, arrayUnion } from 'firebase/firestore';
import { Loader2, Plus, Calendar, Activity, Heart } from 'lucide-react';
import Link from 'next/link';
import LoginOutButton from '@/components/ui/LoginOutButton';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Analysis {
  dailySummary: {
    balanceScore: number;
    varietyScore: number;
    effortScore: number;
    overallComment: string;
  };
  mealFeedback: {
    breakfast: {
      positives: string[];
      suggestions: string[];
    };
    lunch: {
      positives: string[];
      suggestions: string[];
    };
    dinner: {
      positives: string[];
      suggestions: string[];
    };
  };
  activityFeedback: {
    exerciseAnalysis: {
      intensity: string;
      duration: string;
      positives: string[];
      suggestions: string[];
    };
    dailyGoals: {
      achieved: string[];
      next: string[];
    };
  };
}

interface HealthRecord {
  userId: string;
  date: string;
  meals: {
    breakfast: { imageUrl?: string; mainDish: string; portion: string; sideDishes: string };
    lunch: { imageUrl?: string; mainDish: string; portion: string; sideDishes: string };
    dinner: { imageUrl?: string; mainDish: string; portion: string; sideDishes: string };
  };
  exercise: {
    imageUrl?: string;
    type: string;
    duration: string;
    intensity: string;
  };
  analysis: Analysis;
  createdAt: any;  // Firestore Timestamp
}

export default function HealthListPage() {
  const router = useRouter();
  const [records, setRecords] = useState<(HealthRecord & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'all' | 'my'>('all');
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [selectedFilter, setSelectedFilter] = useState<'latest' | 'highest'>('latest');

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        let q;
        if (viewMode === 'my' && auth.currentUser) {
          q = query(
            collection(db, 'health_records'),
            where('userId', '==', auth.currentUser.uid),
            orderBy('createdAt', 'desc')
          );
        } else {
          q = query(
            collection(db, 'health_records'),
            orderBy('createdAt', 'desc')
          );
        }

        const querySnapshot = await getDocs(q);
        let fetchedRecords = querySnapshot.docs.map(doc => {
          const data = doc.data() as HealthRecord;
          // 평균 점수 계산
          const averageScore = data.analysis?.dailySummary ? 
            Math.round((
              (data.analysis.dailySummary.balanceScore || 0) +
              (data.analysis.dailySummary.varietyScore || 0) +
              (data.analysis.dailySummary.effortScore || 0)
            ) / 3) : 0;

          return {
            id: doc.id,
            ...data,
            averageScore // 평균 점수 추가
          };
        });

        // 정렬 적용
        if (selectedFilter === 'highest') {
          fetchedRecords.sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));
        } else {
          // 최신순 정렬
          fetchedRecords.sort((a, b) => {
            const dateA = new Date(a.createdAt?.seconds * 1000 || 0);
            const dateB = new Date(b.createdAt?.seconds * 1000 || 0);
            return dateB.getTime() - dateA.getTime();
          });
        }

        // 좋아요 수 가져오기
        const likesSnapshot = await getDocs(collection(db, 'health_records_likes'));
        const likesData = Object.fromEntries(
          likesSnapshot.docs.map(doc => [doc.id, doc.data().count || 0])
        );
        setLikes(likesData);
        setRecords(fetchedRecords);
      } catch (error) {
        console.error('Error fetching records:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [viewMode, selectedFilter]);

  const handleNewAnalysis = () => {
    router.push('/health/analyze');
  };

  const handleLike = async (recordId: string) => {
    if (!auth.currentUser) {
      alert('로그인이 필요한 기능입니다.');
      return;
    }

    try {
      const docRef = doc(db, 'health_records_likes', recordId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        await updateDoc(docRef, {
          count: increment(1),
          users: arrayUnion(auth.currentUser.uid)
        });
      } else {
        await setDoc(docRef, {
          count: 1,
          users: [auth.currentUser.uid]
        });
      }

      setLikes(prev => ({
        ...prev,
        [recordId]: (prev[recordId] || 0) + 1
      }));
    } catch (error) {
      console.error('Error updating likes:', error);
      alert('응원하기에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-cyan-900 text-white/90">
      <div className="relative z-50">
        <LoginOutButton />
      </div>

      <main className="container mx-auto px-4 py-10 relative z-10 max-w-5xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">건강 기록 모아보기</h1>
          <p className="text-sm text-gray-400">나의 건강 기록을 한눈에 확인하세요</p>
        </div>

        <div className="mb-8 space-y-4">
          {!auth.currentUser && (
            <div className="text-center py-4 px-6 rounded-xl bg-blue-950/20 border border-blue-500/20">
              <p className="text-gray-300">로그인하시면 나만의 건강 분석을 시작할 수 있습니다.</p>
            </div>
          )}
          {auth.currentUser && (
            <button
              onClick={handleNewAnalysis}
              className="w-full flex justify-center items-center gap-2 px-6 py-4 text-lg font-bold rounded-xl transition-all duration-300 shadow-xl 
                active:scale-[0.98] bg-gradient-to-r from-blue-600 to-indigo-600
                hover:from-blue-700 hover:to-indigo-700 text-white"
            >
              <Plus className="w-5 h-5" />
              새로운 건강 분석하기
            </button>
          )}

          <div className="flex gap-4 justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('all')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  viewMode === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-950/20 text-gray-400 hover:bg-blue-950/30'
                }`}
              >
                전체 기록
              </button>
              <button
                onClick={() => setViewMode('my')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  viewMode === 'my'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-950/20 text-gray-400 hover:bg-blue-950/30'
                }`}
              >
                내 기록
              </button>
            </div>

            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value as 'latest' | 'highest')}
              className="bg-blue-950/20 text-gray-300 px-4 py-2 rounded-lg border border-blue-500/20 focus:outline-none focus:border-blue-500/40"
            >
              <option value="latest">최신순</option>
              <option value="highest">높은 점수순</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4">
          {records.map((record) => {
            // 데이터 처리
            let dailySummary = {
              balanceScore: 0,
              varietyScore: 0,
              effortScore: 0,
              overallComment: '분석 결과를 불러올 수 없습니다.'
            };

            try {
              // 새로운 형식
              if (record.analysis?.dailySummary?.balanceScore !== undefined) {
                dailySummary = record.analysis.dailySummary;
              }
              // 점수가 있는지 확인
              if (typeof dailySummary.balanceScore !== 'number') {
                dailySummary.balanceScore = 0;
              }
              if (typeof dailySummary.varietyScore !== 'number') {
                dailySummary.varietyScore = 0;
              }
              if (typeof dailySummary.effortScore !== 'number') {
                dailySummary.effortScore = 0;
              }
              if (!dailySummary.overallComment) {
                dailySummary.overallComment = '분석 결과를 불러올 수 없습니다.';
              }
            } catch (e) {
              console.error('Error processing analysis:', e, record);
            }

            const averageScore = Math.round(
              (dailySummary.balanceScore +
               dailySummary.varietyScore +
               dailySummary.effortScore) / 3
            );

            return (
              <div
                key={record.id}
                onClick={() => router.push(`/health/results/${record.id}`)}
                className="p-6 bg-blue-950/20 backdrop-blur-sm rounded-2xl border border-blue-500/20 hover:border-blue-400/30 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-blue-300">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(record.date), 'PPP', { locale: ko })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">
                      평균 {averageScore}점
                    </span>
                  </div>
                </div>

                <p className="text-gray-300 line-clamp-2">{dailySummary.overallComment}</p>

                <div className="mt-4 space-y-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-2 bg-blue-950/30 rounded-lg">
                        <div className="text-lg font-bold text-blue-300">{dailySummary.balanceScore}</div>
                        <div className="text-xs text-gray-400">영양 균형</div>
                      </div>
                      <div className="text-center p-2 bg-blue-950/30 rounded-lg">
                        <div className="text-lg font-bold text-blue-300">{dailySummary.varietyScore}</div>
                        <div className="text-xs text-gray-400">식단 다양성</div>
                      </div>
                      <div className="text-center p-2 bg-blue-950/30 rounded-lg">
                        <div className="text-lg font-bold text-blue-300">{dailySummary.effortScore}</div>
                        <div className="text-xs text-gray-400">건강관리 노력</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1">
                      {record.meals.breakfast.imageUrl && (
                        <div className="relative aspect-square rounded-lg overflow-hidden bg-blue-950/30">
                          <img
                            src={record.meals.breakfast.imageUrl}
                            alt="아침 식사"
                            className="object-cover w-full h-full"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-xs text-white py-1 px-2">
                            아침
                          </div>
                        </div>
                      )}
                      {record.meals.lunch.imageUrl && (
                        <div className="relative aspect-square rounded-lg overflow-hidden bg-blue-950/30">
                          <img
                            src={record.meals.lunch.imageUrl}
                            alt="점심 식사"
                            className="object-cover w-full h-full"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-xs text-white py-1 px-2">
                            점심
                          </div>
                        </div>
                      )}
                      {record.meals.dinner.imageUrl && (
                        <div className="relative aspect-square rounded-lg overflow-hidden bg-blue-950/30">
                          <img
                            src={record.meals.dinner.imageUrl}
                            alt="저녁 식사"
                            className="object-cover w-full h-full"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-xs text-white py-1 px-2">
                            저녁
                          </div>
                        </div>
                      )}
                      {record.exercise.imageUrl && (
                        <div className="relative aspect-square rounded-lg overflow-hidden bg-blue-950/30">
                          <img
                            src={record.exercise.imageUrl}
                            alt="운동"
                            className="object-cover w-full h-full"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-xs text-white py-1 px-2">
                            운동
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-blue-500/20">
                    <div className="text-sm text-gray-400">
                      {record.userId === auth.currentUser?.uid ? '내 기록' : '다른 사용자의 기록'}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(record.id);
                      }}
                      className="flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-950/30 hover:bg-blue-950/40 transition-all"
                    >
                      <Heart className="w-4 h-4 text-pink-400" />
                      <span className="text-blue-300 font-bold">{likes[record.id] || 0}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {records.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              아직 건강 기록이 없습니다.<br />
              위 버튼을 눌러 첫 건강 분석을 시작해보세요!
            </div>
          )}
        </div>
      </main>
      {/* AI 플로팅 버튼 */}
      <Link
        href="/ai-comfort"
        className="fixed bottom-[80px] right-4 z-[40] w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-all group"
      >
        <span className="text-white font-medium text-base">AI</span>
        <span className="absolute right-full mr-3 px-2 py-1 bg-gray-900/80 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          모두트리 AI와 대화하기
        </span>
      </Link>
    </div>
  );
}