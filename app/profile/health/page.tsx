'use client';

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { Loader2, Calendar, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import Link from 'next/link';

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

export default function HealthPage() {
  const { currentUser } = useSelector((state: any) => state.user);
  
  // 로그인하지 않은 경우 바로 안내 메시지 표시
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">로그인이 필요한 서비스입니다</h2>
          <p className="text-gray-400">건강 관리 기능을 사용하려면 회원가입 후 로그인해주세요.</p>
          <div className="space-x-4">
            <button 
              onClick={() => window.location.href = '/login'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              로그인
            </button>
            <button 
              onClick={() => window.location.href = '/signup'}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              회원가입
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  const [records, setRecords] = useState<(HealthRecord & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'latest' | 'highest'>('latest');

  useEffect(() => {
    const fetchRecords = async () => {
      if (!currentUser?.uid) return;

      try {
        const q = query(
          collection(db, 'health_records'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );

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

        setRecords(fetchedRecords);
      } catch (error) {
        console.error('Error fetching records:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [currentUser?.uid, selectedFilter]);

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">로그인이 필요합니다.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 md:p-6 py-6 overflow-auto w-full">
      <div className="w-full space-y-6">
        <div className="flex justify-between items-center px-2 md:px-0">
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value as 'latest' | 'highest')}
            className="bg-[#2A4D45]/40 text-white px-4 py-2 rounded-lg border border-[#358f80]/20 focus:outline-none focus:border-[#358f80]/40 backdrop-blur-sm [&>option]:text-black"
          >
            <option value="latest">최신순</option>
            <option value="highest">높은 점수순</option>
          </select>
          <Link 
            href="/health"
            className="bg-[#56ab91]/60 hover:bg-[#56ab91]/80 text-white px-4 py-2 rounded-lg border border-[#358f80]/20 backdrop-blur-sm flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            건강 분석
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-2 md:px-0">
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
              <Link
                href={`/health/results/${record.id}`}
                key={record.id}
                className="block p-6 bg-[#2A4D45]/40 backdrop-blur-sm rounded-2xl border border-[#358f80]/20 hover:bg-[#2A4D45]/50 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-white">
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

                <p className="text-white line-clamp-2">{dailySummary.overallComment}</p>

                <div className="mt-4 space-y-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-2 bg-[#2A4D45]/50 rounded-lg backdrop-blur-sm border border-[#358f80]/20">
                        <div className="text-lg font-bold text-white">{dailySummary.balanceScore}</div>
                        <div className="text-sm text-gray-300">영양 균형</div>
                      </div>
                      <div className="text-center p-2 bg-[#2A4D45]/50 rounded-lg backdrop-blur-sm border border-[#358f80]/20">
                        <div className="text-lg font-bold text-white">{dailySummary.varietyScore}</div>
                        <div className="text-sm text-gray-300">식단 다양성</div>
                      </div>
                      <div className="text-center p-2 bg-[#2A4D45]/50 rounded-lg backdrop-blur-sm border border-[#358f80]/20">
                        <div className="text-lg font-bold text-white">{dailySummary.effortScore}</div>
                        <div className="text-sm text-gray-300">건강관리 노력</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1">
                      {record.meals.breakfast.imageUrl && (
                        <div className="relative aspect-square rounded-lg overflow-hidden bg-[#2A4D45]/50 backdrop-blur-sm border border-[#358f80]/20">
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
                        <div className="relative aspect-square rounded-lg overflow-hidden bg-[#2A4D45]/50 backdrop-blur-sm border border-[#358f80]/20">
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
                        <div className="relative aspect-square rounded-lg overflow-hidden bg-[#2A4D45]/50 backdrop-blur-sm border border-[#358f80]/20">
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
                        <div className="relative aspect-square rounded-lg overflow-hidden bg-[#2A4D45]/50 backdrop-blur-sm border border-[#358f80]/20">
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
                </div>
              </Link>
            );
          })}

          {records.length === 0 && (
            <div className="text-center py-12 text-white md:col-span-3 bg-[#2A4D45]/40 backdrop-blur-sm border border-[#358f80]/20 rounded-lg">
              아직 건강 기록이 없습니다.<br />
              건강 분석 페이지에서 첫 건강 분석을 시작해보세요!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}