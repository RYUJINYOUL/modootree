'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { uploadHealthImage, saveHealthRecord, fileToBase64, analyzeHealthRecord, analyzeAllInputs, analyzeDailyActivity } from '@/lib/health-service';
import { Check, Sparkles, ImageIcon, Loader2 } from 'lucide-react';
import { AIGenerationProgress } from '@/components/AIGenerationProgress';
import LoginOutButton from '@/components/ui/LoginOutButton';

interface ParsedMeal {
  mainDish: string;
  sideDishes: string;
  portion: string;
}

interface MealData {
  description: string;
  file: File | null;
  preview: string | null;
  parsed?: ParsedMeal;
  isAnalyzing?: boolean;
}

interface ParsedExercise {
  type: string;
  duration: string;
  intensity: string;
}

interface ExerciseData {
  description: string;
  file: File | null;
  preview: string | null;
  parsed?: ParsedExercise;
  isAnalyzing?: boolean;
}

export default function HealthAnalyzePage() {
  const router = useRouter();
  const [isPreAnalyzing, setIsPreAnalyzing] = useState(false);
  const [isFinalAnalyzing, setIsFinalAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialMeals = {
    breakfast: { description: '', file: null, preview: null },
    lunch: { description: '', file: null, preview: null },
    dinner: { description: '', file: null, preview: null },
    snack: { description: '', file: null, preview: null }
  };

  const [meals, setMeals] = useState<Record<'breakfast' | 'lunch' | 'dinner' | 'snack', MealData>>(initialMeals);
  const [exercise, setExercise] = useState<ExerciseData>({
    description: '',
    file: null,
    preview: null
  });

  const handleMealFileChange = (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack', file: File | null) => {
    setMeals(prev => ({
      ...prev,
      [mealType]: {
        ...prev[mealType],
        file,
        preview: file ? URL.createObjectURL(file) : null
      }
    }));
  };

  const handleMealInputChange = (
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    value: string
  ) => {
    setMeals(prev => ({
      ...prev,
      [mealType]: {
        ...prev[mealType],
        description: value,
        parsed: undefined
      }
    }));
  };


  const handleExerciseFileChange = (file: File | null) => {
    setExercise(prev => ({
      ...prev,
      file,
      preview: file ? URL.createObjectURL(file) : null
    }));
  };

  const handleExerciseInputChange = (value: string) => {
    setExercise(prev => ({
      ...prev,
      description: value
    }));
  };

  const handleAnalyze = async () => {
    if (!auth.currentUser) {
      setError('로그인이 필요한 기능입니다.');
      return;
    }

    setError(null);
    setIsFinalAnalyzing(true);

    try {
      // 이미지를 Base64로 변환
      const images: Record<string, { data: string; mimeType: string }> = {};
      
      // 식사 이미지 변환
      await Promise.all([
        meals.breakfast.file && fileToBase64(meals.breakfast.file).then(data => { images.breakfast = data; }),
        meals.lunch.file && fileToBase64(meals.lunch.file).then(data => { images.lunch = data; }),
        meals.dinner.file && fileToBase64(meals.dinner.file).then(data => { images.dinner = data; }),
        meals.snack.file && fileToBase64(meals.snack.file).then(data => { images.snack = data; }),
        exercise.file && fileToBase64(exercise.file).then(data => { images.exercise = data; })
      ]);

      // 이미지 업로드
      const [breakfastUrl, lunchUrl, dinnerUrl, snackUrl, exerciseUrl] = await Promise.all([
        meals.breakfast.file ? uploadHealthImage(meals.breakfast.file, auth.currentUser.uid, 'breakfast') : Promise.resolve(undefined),
        meals.lunch.file ? uploadHealthImage(meals.lunch.file, auth.currentUser.uid, 'lunch') : Promise.resolve(undefined),
        meals.dinner.file ? uploadHealthImage(meals.dinner.file, auth.currentUser.uid, 'dinner') : Promise.resolve(undefined),
        meals.snack.file ? uploadHealthImage(meals.snack.file, auth.currentUser.uid, 'snack') : Promise.resolve(undefined),
        exercise.file ? uploadHealthImage(exercise.file, auth.currentUser.uid, 'exercise') : Promise.resolve(undefined),
      ]);

      // 전체 건강 기록 AI 분석
      const token = await auth.currentUser.getIdToken(true);
      const analysis = await analyzeHealthRecord({
        meals: {
          breakfast: { description: meals.breakfast.description, imageUrl: breakfastUrl || null },
          lunch: { description: meals.lunch.description, imageUrl: lunchUrl || null },
          dinner: { description: meals.dinner.description, imageUrl: dinnerUrl || null },
          snack: { description: meals.snack.description, imageUrl: snackUrl || null }
        },
        exercise: { description: exercise.description, imageUrl: exerciseUrl || null }
      }, token);

      // 건강 기록 저장
      const healthRecord = {
        userId: auth.currentUser.uid,
        date: new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0],  // KST
        meals: {
          breakfast: {
            imageUrl: breakfastUrl || null,
            description: meals.breakfast.description || ''
          },
          lunch: {
            imageUrl: lunchUrl || null,
            description: meals.lunch.description || ''
          },
          dinner: {
            imageUrl: dinnerUrl || null,
            description: meals.dinner.description || ''
          },
          snack: {
            imageUrl: snackUrl || null,
            description: meals.snack.description || ''
          }
        },
        exercise: {
          imageUrl: exerciseUrl || null,
          description: exercise.description || ''
        },
        analysis: {
          dailySummary: {
            balanceScore: analysis.dailySummary.balanceScore,
            varietyScore: analysis.dailySummary.varietyScore,
            effortScore: analysis.dailySummary.effortScore,
            overallComment: analysis.dailySummary.overallComment
          },
          mealFeedback: {
            breakfast: {
              positives: analysis.mealFeedback.breakfast.positives || [],
              suggestions: analysis.mealFeedback.breakfast.suggestions || []
            },
            lunch: {
              positives: analysis.mealFeedback.lunch.positives || [],
              suggestions: analysis.mealFeedback.lunch.suggestions || []
            },
            dinner: {
              positives: analysis.mealFeedback.dinner.positives || [],
              suggestions: analysis.mealFeedback.dinner.suggestions || []
            },
            snack: {
              positives: analysis.mealFeedback.snack.positives || [],
              suggestions: analysis.mealFeedback.snack.suggestions || []
            }
          },
          activityFeedback: {
            positives: analysis.activityFeedback.positives || [],
            suggestions: analysis.activityFeedback.suggestions || []
          }
        }
      };

      const recordId = await saveHealthRecord(db, { record: healthRecord, images });
      router.push(`/health/results/${recordId}`);

    } catch (e) {
      console.error('분석 중 오류:', e);
      setError('분석에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsFinalAnalyzing(false);
    }
  };

  // 분석된 결과를 보여주는 컴포넌트
  const AnalysisResult = ({ data, type }: { data: MealData | ExerciseData; type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'exercise' }) => {
    if (!data.parsed || !data.description) return null;

    const [isEditing, setIsEditing] = useState(false);
    const [editedData, setEditedData] = useState(type === 'exercise' ? data.parsed as ParsedExercise : data.parsed as ParsedMeal);

    const handleSave = () => {
      if (type !== 'exercise') {
        setMeals(prev => ({
          ...prev,
          [type]: {
            ...prev[type],
            parsed: editedData
          }
        }));
      } else {
        setExercise(prev => ({
          ...prev,
          parsed: editedData as ParsedExercise
        }));
      }
      setIsEditing(false);
    };

    return (
      <div className="mt-2 p-3 bg-black/20 rounded-lg border border-indigo-500/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-indigo-400 text-sm">
            <Check className="w-4 h-4" />
            <span>AI 분석 결과</span>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            {isEditing ? '취소' : '수정하기'}
          </button>
        </div>
        {type !== 'exercise' ? (
          <div className="space-y-1 text-sm">
            {isEditing ? (
              <>
                <div>
                  <span className="text-gray-400">주요 메뉴:</span>
                  <input
                    type="text"
                    value={(editedData as ParsedMeal).mainDish}
                    onChange={(e) => setEditedData({ ...(editedData as ParsedMeal), mainDish: e.target.value })}
                    className="ml-2 p-1 bg-black/30 border border-white/20 rounded focus:ring-1 focus:ring-indigo-500 text-white w-full mt-1"
                  />
                </div>
                <div>
                  <span className="text-gray-400">추가 메뉴:</span>
                  <input
                    type="text"
                    value={(editedData as ParsedMeal).sideDishes}
                    onChange={(e) => setEditedData({ ...(editedData as ParsedMeal), sideDishes: e.target.value })}
                    className="ml-2 p-1 bg-black/30 border border-white/20 rounded focus:ring-1 focus:ring-indigo-500 text-white w-full mt-1"
                  />
                </div>
                <div>
                  <span className="text-gray-400">식사량:</span>
                  <input
                    type="text"
                    value={(editedData as ParsedMeal).portion}
                    onChange={(e) => setEditedData({ ...(editedData as ParsedMeal), portion: e.target.value })}
                    className="ml-2 p-1 bg-black/30 border border-white/20 rounded focus:ring-1 focus:ring-indigo-500 text-white w-full mt-1"
                  />
                </div>
              </>
            ) : (
              <>
                <p><span className="text-gray-400">주요 메뉴:</span> {(data.parsed as ParsedMeal).mainDish}</p>
                <p><span className="text-gray-400">추가 메뉴:</span> {(data.parsed as ParsedMeal).sideDishes}</p>
                <p><span className="text-gray-400">식사량:</span> {(data.parsed as ParsedMeal).portion}</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-1 text-sm">
            {isEditing ? (
              <>
                <div>
                  <span className="text-gray-400">운동 종류:</span>
                  <input
                    type="text"
                    value={(editedData as ParsedExercise).type}
                    onChange={(e) => setEditedData({ ...(editedData as ParsedExercise), type: e.target.value })}
                    className="ml-2 p-1 bg-black/30 border border-white/20 rounded focus:ring-1 focus:ring-indigo-500 text-white w-full mt-1"
                  />
                </div>
                <div>
                  <span className="text-gray-400">운동 시간:</span>
                  <input
                    type="text"
                    value={(editedData as ParsedExercise).duration}
                    onChange={(e) => setEditedData({ ...(editedData as ParsedExercise), duration: e.target.value })}
                    className="ml-2 p-1 bg-black/30 border border-white/20 rounded focus:ring-1 focus:ring-indigo-500 text-white w-full mt-1"
                  />
                </div>
                <div>
                  <span className="text-gray-400">운동 강도:</span>
                  <input
                    type="text"
                    value={(editedData as ParsedExercise).intensity}
                    onChange={(e) => setEditedData({ ...(editedData as ParsedExercise), intensity: e.target.value })}
                    className="ml-2 p-1 bg-black/30 border border-white/20 rounded focus:ring-1 focus:ring-indigo-500 text-white w-full mt-1"
                  />
                </div>
              </>
            ) : (
              <>
                <p><span className="text-gray-400">운동 종류:</span> {(data.parsed as ParsedExercise).type}</p>
                <p><span className="text-gray-400">운동 시간:</span> {(data.parsed as ParsedExercise).duration}</p>
                <p><span className="text-gray-400">운동 강도:</span> {(data.parsed as ParsedExercise).intensity}</p>
              </>
            )}
          </div>
        )}
        {isEditing && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-indigo-600/30 hover:bg-indigo-600/40 rounded text-sm text-white border border-indigo-500/30"
            >
              저장
            </button>
          </div>
        )}
        {!isEditing && (
          <div className="mt-2 text-xs text-gray-500">
            분석 결과가 정확하지 않다면 수정하기를 눌러 내용을 수정할 수 있습니다.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-cyan-900 text-white/90">
      <div className="relative z-50">
        <LoginOutButton />
      </div>

      <main className="container mx-auto px-4 py-10 relative z-10 max-w-5xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">오늘 건강 기록</h1>
          <p className="text-sm text-gray-400 mb-4">당신의 오늘 건강 기록을 AI가 분석해 드립니다.</p>
          
          {/* AI 오늘 활동 채우기 버튼 */}
          <button
            onClick={async () => {
              try {
                setIsPreAnalyzing(true);
                const token = await auth.currentUser?.getIdToken(true);
                if (!token) {
                  setError('인증이 필요합니다.');
                  return;
                }
                
                // 오늘 날짜 생성
                const today = new Date();
                const dateStr = new Date(today.getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
                
                const result = await analyzeDailyActivity(dateStr, token);
                console.log('일일 활동 분석 결과:', result);

                // 분석 결과로 입력란 채우기
                if (result) {
                  setMeals(prev => ({
                    breakfast: { 
                      ...prev.breakfast, 
                      description: result.meals?.breakfast?.description || '',
                      parsed: result.meals?.breakfast?.description ? {
                        mainDish: result.meals.breakfast.description,
                        sideDishes: '',
                        portion: '1인분'
                      } : undefined
                    },
                    lunch: { 
                      ...prev.lunch, 
                      description: result.meals?.lunch?.description || '',
                      parsed: result.meals?.lunch?.description ? {
                        mainDish: result.meals.lunch.description,
                        sideDishes: '',
                        portion: '1인분'
                      } : undefined
                    },
                    dinner: { 
                      ...prev.dinner, 
                      description: result.meals?.dinner?.description || '',
                      parsed: result.meals?.dinner?.description ? {
                        mainDish: result.meals.dinner.description,
                        sideDishes: '',
                        portion: '1인분'
                      } : undefined
                    },
                    snack: { 
                      ...prev.snack, 
                      description: result.meals?.snack?.description || '',
                      parsed: result.meals?.snack?.description ? {
                        mainDish: result.meals.snack.description,
                        sideDishes: '',
                        portion: '적당량'
                      } : undefined
                    }
                  }));
                  
                  setExercise(prev => ({
                    ...prev,
                    description: result.exercise?.description || '',
                    parsed: result.exercise?.description ? {
                      type: result.exercise.description,
                      duration: '30분',
                      intensity: '중간'
                    } : undefined
                  }));
                  
                  setHasAnalyzed(true);
                } else {
                  setError('오늘의 답변 데이터를 찾을 수 없습니다.');
                }
              } catch (e) {
                console.error('일일 활동 분석 중 오류:', e);
                setError('오늘의 답변을 분석하는데 실패했습니다. 인사말 답변이 있는지 확인해주세요.');
              } finally {
                setIsPreAnalyzing(false);
              }
            }}
            disabled={isPreAnalyzing}
            className="inline-flex items-center px-6 py-3 text-sm font-medium rounded-lg transition-all duration-300 shadow-lg 
              bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 
              text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPreAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span>분석 중...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                <span>AI분석 오늘 활동 채우기</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 text-red-200 rounded-xl flex items-center border border-red-500/30">
            <strong>오류:</strong> {error}
          </div>
        )}

        <div className="space-y-8">
          {/* 업로드된 사진 미리보기 섹션 */}
          {(Object.entries(meals).some(([_, meal]) => meal.preview) || exercise.preview) && (
            <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-8">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((meal) => (
                meals[meal].preview && (
                  <div key={meal} className="aspect-square">
                    <div className="relative w-full h-full rounded-lg overflow-hidden bg-blue-950/30">
                      <img
                        src={meals[meal].preview}
                        alt={`${meal} 식사`}
                        className="object-cover w-full h-full"
                      />
                      <button
                        onClick={() => handleMealFileChange(meal, null)}
                        className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 p-2 rounded-lg text-white"
                      >
                        ×
                      </button>
                      <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-sm text-white">
                        {meal === 'breakfast' ? '아침' :
                         meal === 'lunch' ? '점심' :
                         meal === 'dinner' ? '저녁' : '기타'}
                      </div>
                    </div>
                  </div>
                )
              ))}
              {exercise.preview && (
                <div className="aspect-square">
                  <div className="relative w-full h-full rounded-lg overflow-hidden bg-blue-950/30">
                    <img
                      src={exercise.preview}
                      alt="운동"
                      className="object-cover w-full h-full"
                    />
                    <button
                      onClick={() => handleExerciseFileChange(null)}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 p-2 rounded-lg text-white"
                    >
                      ×
                    </button>
                    <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-sm text-white">
                      운동
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 입력 섹션 */}
          <div className="space-y-4">
            {[
              { 
                type: 'breakfast', 
                label: '아침', 
                placeholder: '예) 닭가슴살 샐러드 1인분, 아몬드 30g, 블랙커피' 
              },
              { 
                type: 'lunch', 
                label: '점심', 
                placeholder: '예) 회사 구내식당에서 제육볶음 정식 1인분, 된장국, 김치' 
              },
              { 
                type: 'dinner', 
                label: '저녁', 
                placeholder: '예) 삼겹살 2인분(친구랑 반반), 쌈채소, 된장찌개' 
              },
              { 
                type: 'snack', 
                label: '기타', 
                placeholder: '예) 오후에 바나나 1개, 운동 후 프로틴 쉐이크 1잔' 
              },
              { 
                type: 'exercise', 
                label: '운동', 
                placeholder: '예) 헬스장에서 상체 운동 1시간 30분, 중간 강도' 
              }
            ].map(({ type, label, placeholder }) => (
              <div key={type} className="p-4 bg-blue-950/20 backdrop-blur-sm rounded-xl border border-blue-500/20">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-white">{label}</h3>
                  <label className="cursor-pointer p-2 hover:bg-black/20 rounded-lg transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (type === 'exercise') {
                            handleExerciseFileChange(file);
                          } else {
                            handleMealFileChange(type as keyof typeof meals, file);
                          }
                        }
                      }}
                      className="hidden"
                    />
                    <ImageIcon className="w-5 h-5 text-indigo-400" />
                  </label>
                </div>
                <div className="space-y-2">
                  <textarea
                    value={type === 'exercise' ? exercise.description : meals[type as keyof typeof meals].description}
                    onChange={(e) => type === 'exercise' ? handleExerciseInputChange(e.target.value) : handleMealInputChange(type as keyof typeof meals, e.target.value)}
                    placeholder={placeholder}
                    rows={2}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white placeholder-gray-400"
                  />
                  {type === 'exercise' ? (
                    exercise.parsed && <AnalysisResult data={exercise} type="exercise" />
                  ) : (
                    meals[type as keyof typeof meals].parsed && <AnalysisResult data={meals[type as keyof typeof meals]} type={type as keyof typeof meals} />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 최종 저장 버튼 */}
          <div className="flex justify-center">
            {/* 최종 저장 버튼 */}
            <button
              onClick={handleAnalyze}
              disabled={
                isFinalAnalyzing || 
                // 하나의 필드도 입력되지 않았을 때 비활성화
                (meals.breakfast.description.trim().length === 0 && 
                 meals.lunch.description.trim().length === 0 && 
                 meals.dinner.description.trim().length === 0 && 
                 meals.snack.description.trim().length === 0 && 
                 exercise.description.trim().length === 0)
              }
              className="w-full flex justify-center items-center px-6 py-4 text-lg font-bold rounded-xl transition-all duration-300 shadow-xl 
                active:scale-[0.98] bg-gradient-to-r from-green-600 to-emerald-600
                hover:from-green-700 hover:to-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed
                relative overflow-hidden"
            >
              {isFinalAnalyzing ? (
                <AIGenerationProgress />
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  <span>최종 분석 및 저장하기</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* 하단 여백 */}
        <div className="h-20 md:h-32"></div>
      </main>
    </div>
  );
}