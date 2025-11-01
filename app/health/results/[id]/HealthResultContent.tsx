'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, Copy, CheckCheck, Camera } from 'lucide-react';
import Image from 'next/image';
import LoginOutButton from '@/components/ui/LoginOutButton';

interface Analysis {
  dailySummary: {
    balanceScore: number;
    varietyScore: number;
    effortScore: number;
    overallComment: string;
  };
  mealFeedback: {
    breakfast: { positives: string[]; suggestions: string[] };
    lunch: { positives: string[]; suggestions: string[] };
    dinner: { positives: string[]; suggestions: string[] };
    snack: { positives: string[]; suggestions: string[] };
  };
  activityFeedback: {
    positives: string[];
    suggestions: string[];
  };
}

interface HealthRecord {
  userId: string;
  date: string;
  meals: {
    breakfast: { description: string; imageUrl: string | null };
    lunch: { description: string; imageUrl: string | null };
    dinner: { description: string; imageUrl: string | null };
    snack: { description: string; imageUrl: string | null };
  };
  exercise: {
    description: string;
    imageUrl: string | null;
  };
  analysis: Analysis;
}

export default function HealthResultContent({ id }: { id: string }) {
  const router = useRouter();
  const [record, setRecord] = useState<HealthRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        console.log('Fetching analysis for ID:', id);
        const docRef = doc(db, 'health_records', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const rawData = docSnap.data();
          console.log('=== Raw Data ===');
          console.log(JSON.stringify(rawData, null, 2));
          console.log('=== Analysis Data ===');
          console.log(JSON.stringify(rawData.analysis, null, 2));
          console.log('=== Daily Summary ===');
          console.log(JSON.stringify(rawData.analysis?.dailySummary, null, 2));
          console.log('=== Meal Feedback ===');
          console.log(JSON.stringify(rawData.analysis?.mealFeedback, null, 2));
          console.log('=== Activity Feedback ===');
          console.log(JSON.stringify(rawData.analysis?.activityFeedback, null, 2));

          // 데이터 구조 확인 및 변환
          const processedData: HealthRecord = {
            userId: rawData.userId,
            date: rawData.date,
            meals: rawData.meals,
            exercise: rawData.exercise,
            analysis: {
              dailySummary: {
                balanceScore: Number(rawData.analysis?.dailySummary?.balanceScore) || 0,
                varietyScore: Number(rawData.analysis?.dailySummary?.varietyScore) || 0,
                effortScore: Number(rawData.analysis?.dailySummary?.effortScore) || 0,
                overallComment: rawData.analysis?.dailySummary?.overallComment || '분석 결과가 없습니다.'
              },
              mealFeedback: {
                breakfast: {
                  positives: Array.isArray(rawData.analysis?.mealFeedback?.breakfast?.positives) 
                    ? rawData.analysis.mealFeedback.breakfast.positives 
                    : [],
                  suggestions: Array.isArray(rawData.analysis?.mealFeedback?.breakfast?.suggestions)
                    ? rawData.analysis.mealFeedback.breakfast.suggestions
                    : []
                },
                lunch: {
                  positives: Array.isArray(rawData.analysis?.mealFeedback?.lunch?.positives)
                    ? rawData.analysis.mealFeedback.lunch.positives
                    : [],
                  suggestions: Array.isArray(rawData.analysis?.mealFeedback?.lunch?.suggestions)
                    ? rawData.analysis.mealFeedback.lunch.suggestions
                    : []
                },
                dinner: {
                  positives: Array.isArray(rawData.analysis?.mealFeedback?.dinner?.positives)
                    ? rawData.analysis.mealFeedback.dinner.positives
                    : [],
                  suggestions: Array.isArray(rawData.analysis?.mealFeedback?.dinner?.suggestions)
                    ? rawData.analysis.mealFeedback.dinner.suggestions
                    : []
                },
                snack: {
                  positives: Array.isArray(rawData.analysis?.mealFeedback?.snack?.positives)
                    ? rawData.analysis.mealFeedback.snack.positives
                    : [],
                  suggestions: Array.isArray(rawData.analysis?.mealFeedback?.snack?.suggestions)
                    ? rawData.analysis.mealFeedback.snack.suggestions
                    : []
                }
              },
              activityFeedback: {
                positives: Array.isArray(rawData.analysis?.activityFeedback?.positives)
                  ? rawData.analysis.activityFeedback.positives
                  : [],
                suggestions: Array.isArray(rawData.analysis?.activityFeedback?.suggestions)
                  ? rawData.analysis.activityFeedback.suggestions
                  : []
              }
            }
          };

          console.log('=== Processed Data ===');
          console.log(JSON.stringify(processedData, null, 2));
          setRecord(processedData);
        } else {
          console.log('Document not found');
          setError('분석 결과를 찾을 수 없습니다.');
        }
      } catch (e) {
        console.error('분석 결과 조회 중 오류:', e);
        setError('분석 결과를 불러오는데 실패했습니다. ' + (e as Error).message);
      }
    };

    fetchAnalysis();
  }, [id]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-cyan-900 text-white/90 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-900/30 text-red-200 p-4 rounded-xl border border-red-500/30">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-cyan-900 text-white/90 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse bg-blue-900/30 h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  const { analysis } = record;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-cyan-900 text-white/90">
      <div className="relative z-50">
        <LoginOutButton />
      </div>

      <main className="container mx-auto px-4 py-10 relative z-10 max-w-5xl">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => router.push('/health')}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>목록으로 돌아가기</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600/30 hover:bg-indigo-600/40 rounded-lg border border-indigo-500/30 transition-colors"
          >
            {copied ? (
              <>
                <CheckCheck className="w-5 h-5" />
                <span>복사됨</span>
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                <span>링크 복사</span>
              </>
            )}
          </button>
        </div>

        <div className="space-y-8">
          {/* 종합 점수 */}
          <div className="p-6 bg-blue-950/20 backdrop-blur-sm rounded-2xl border border-blue-500/20">
            <h2 className="text-2xl font-bold text-white mb-6">종합 건강 점수</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-950/30 rounded-lg">
                <div className="text-sm text-gray-400">영양 균형도</div>
                <div className="text-3xl font-bold text-blue-200">{analysis.dailySummary.balanceScore}</div>
              </div>
              <div className="p-4 bg-blue-950/30 rounded-lg">
                <div className="text-sm text-gray-400">식단 다양성</div>
                <div className="text-3xl font-bold text-blue-200">{analysis.dailySummary.varietyScore}</div>
              </div>
              <div className="p-4 bg-blue-950/30 rounded-lg">
                <div className="text-sm text-gray-400">건강관리 노력도</div>
                <div className="text-3xl font-bold text-blue-200">{analysis.dailySummary.effortScore}</div>
              </div>
            </div>
            <div className="mt-6 p-4 bg-blue-950/30 rounded-lg">
              <div className="text-sm text-gray-400 mb-2">종합 평가</div>
              <div className="text-gray-200">{analysis.dailySummary.overallComment}</div>
            </div>
          </div>

          {/* 식사 분석 */}
          <div className="p-6 bg-blue-950/20 backdrop-blur-sm rounded-2xl border border-blue-500/20">
            <h2 className="text-2xl font-bold text-white mb-6">식사 분석</h2>
            <div className="space-y-6">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((meal) => (
                <div key={meal} className="p-4 bg-blue-950/30 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    {meal === 'breakfast' ? '아침' :
                     meal === 'lunch' ? '점심' :
                     meal === 'dinner' ? '저녁' : '기타'}
                  </h3>
                  {(record.meals[meal]?.description || record.meals[meal]?.imageUrl) && (
                    <>
                      {record.meals[meal]?.imageUrl && (
                        <div className="mb-4">
                          <div className="relative aspect-square w-full max-w-md mx-auto rounded-lg overflow-hidden bg-blue-950/30">
                            <Image
                              src={record.meals[meal]?.imageUrl}
                              alt={`${meal === 'breakfast' ? '아침' : meal === 'lunch' ? '점심' : meal === 'dinner' ? '저녁' : '간식'} 식사`}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        </div>
                      )}
                      {record.meals[meal]?.description && (
                        <div className="mb-4">
                          <div className="text-sm text-gray-400 mb-1">기록</div>
                          <div className="text-gray-200">{record.meals[meal]?.description}</div>
                        </div>
                      )}
                      <div className="space-y-4">
                        {analysis.mealFeedback[meal].positives.length > 0 && (
                          <div>
                            <div className="text-sm text-gray-400 mb-1">잘한 점</div>
                            <ul className="list-disc list-inside text-gray-300">
                              {analysis.mealFeedback[meal].positives.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {analysis.mealFeedback[meal].suggestions.length > 0 && (
                          <div>
                            <div className="text-sm text-gray-400 mb-1">개선할 점</div>
                            <ul className="list-disc list-inside text-gray-300">
                              {analysis.mealFeedback[meal].suggestions.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 운동 분석 */}
          <div className="p-6 bg-blue-950/20 backdrop-blur-sm rounded-2xl border border-blue-500/20">
            <h2 className="text-2xl font-bold text-white mb-6">운동 분석</h2>
            {(record.exercise?.description || record.exercise?.imageUrl) && (
              <>
                {record.exercise?.imageUrl && (
                  <div className="mb-4">
                    <div className="relative aspect-square w-full max-w-md mx-auto rounded-lg overflow-hidden bg-blue-950/30">
                      <Image
                        src={record.exercise?.imageUrl}
                        alt="운동 기록"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  </div>
                )}
                {record.exercise?.description && (
                  <div className="mb-4">
                    <div className="text-sm text-gray-400 mb-1">기록</div>
                    <div className="text-gray-200">{record.exercise?.description}</div>
                  </div>
                )}
                <div className="space-y-4">
                  {analysis.activityFeedback.positives.length > 0 && (
                    <div>
                      <div className="text-sm text-gray-400 mb-1">잘한 점</div>
                      <ul className="list-disc list-inside text-gray-300">
                        {analysis.activityFeedback.positives.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysis.activityFeedback.suggestions.length > 0 && (
                    <div>
                      <div className="text-sm text-gray-400 mb-1">개선할 점</div>
                      <ul className="list-disc list-inside text-gray-300">
                        {analysis.activityFeedback.suggestions.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* 하단 여백 */}
        <div className="h-20 md:h-32"></div>
      </main>
    </div>
  );
}