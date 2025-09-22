'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSelector } from 'react-redux';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface VoteOption {
  text: string;
}

interface VoteQuestion {
  text: string;
  options: VoteOption[];
}

interface AIResponse {
  recommendations: string;
  vote: string;
}

interface FormattedVote {
  questions: VoteQuestion[];
}

export default function CreateTestPage() {
  const router = useRouter();
  const currentUser = useSelector((state: any) => state.user.currentUser);
  const [isGenerating, setIsGenerating] = useState(false);
  const [emotion, setEmotion] = useState('happy');
  const [category, setCategory] = useState('daily');
  const [story, setStory] = useState('');
  const [emotionOpen, setEmotionOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [formattedVote, setFormattedVote] = useState<FormattedVote>({ questions: [] });

  // AI 응답 생성
  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const response = await fetch('/api/ai-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          emotion,
          category,
          story,
        }),
      });

      if (!response.ok) {
        throw new Error('AI 응답 생성에 실패했습니다.');
      }

      const data = await response.json();
      setAiResponse(data);

      // 공감 투표 데이터 파싱
      const voteLines = data.vote.split('\n').filter((line: string) => line.trim());
      const questions: VoteQuestion[] = [];
      let currentQuestion: VoteQuestion | null = null;

      voteLines.forEach((line: string) => {
        if (line.startsWith('Q.')) {
          if (currentQuestion) {
            questions.push(currentQuestion);
          }
          currentQuestion = {
            text: line.replace('Q.', '').trim(),
            options: []
          };
        } else if (line.match(/^\d\)/) && currentQuestion) {
          currentQuestion.options.push({
            text: line.replace(/^\d\)/, '').trim()
          });
        }
      });

      if (currentQuestion) {
        questions.push(currentQuestion);
      }

      setFormattedVote({ questions });
    } catch (error) {
      console.error('AI 응답 생성 실패:', error);
      alert(error instanceof Error ? error.message : 'AI 응답 생성에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 로그인 체크
  if (!currentUser?.uid) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-gray-900 text-white/90">
        <div className="container mx-auto px-4 py-10">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">로그인이 필요합니다</h1>
            <p className="text-gray-400 mb-8">사연을 작성하려면 먼저 로그인해주세요.</p>
            <Button onClick={() => router.push('/login')}>
              로그인하러 가기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-gray-900 text-white/90">
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-center mb-8">모두트리 공감 투표 만들기</h1>

          <div className="bg-gray-800/50 p-6 rounded-lg shadow-lg space-y-8">
            {/* 1. 사연 입력 */}
            <div>
              <h2 className="text-xl font-semibold mb-4">1. 사연을 들려주세요</h2>
              <Textarea
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="사연을 자유롭게 작성해주세요. AI가 공감 투표를 만들고 도움이 될 만한 컨텐츠를 추천해드립니다."
                className="bg-gray-700 border-gray-600 text-white min-h-[200px]"
              />
            </div>

            {/* 2. 감정 선택 */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800">
                  <h2 className="text-xl font-semibold">2. 현재 감정을 선택해주세요</h2>
                  <span className="text-gray-400">
                    {emotion === 'happy' ? '😊 행복해요' :
                     emotion === 'sad' ? '😢 슬퍼요' :
                     emotion === 'angry' ? '😠 화나요' :
                     emotion === 'anxious' ? '😨 불안해요' :
                     emotion === 'peaceful' ? '😌 편안해요' :
                     '🤔 고민이에요'}
                  </span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                  {[
                    { value: 'happy', label: '😊 행복해요' },
                    { value: 'sad', label: '😢 슬퍼요' },
                    { value: 'angry', label: '😠 화나요' },
                    { value: 'anxious', label: '😨 불안해요' },
                    { value: 'peaceful', label: '😌 편안해요' },
                    { value: 'worried', label: '🤔 고민이에요' },
                  ].map((item) => (
                    <Button
                      key={item.value}
                      className={`h-12 w-full ${
                        emotion === item.value
                          ? 'bg-blue-500 hover:bg-blue-600 text-white'
                          : 'bg-gray-800/50 hover:bg-gray-800/70 text-gray-100'
                      }`}
                      onClick={() => setEmotion(item.value)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* 3. 주제 선택 */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800">
                  <h2 className="text-xl font-semibold">3. 이야기의 주제를 선택해주세요</h2>
                  <span className="text-gray-400">
                    {category === 'daily' ? '💫 일상' :
                     category === 'relationship' ? '💝 관계' :
                     category === 'worry' ? '💭 고민' :
                     '🌟 위로'}
                  </span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {[
                    { value: 'daily', label: '💫 일상' },
                    { value: 'relationship', label: '💝 관계' },
                    { value: 'worry', label: '💭 고민' },
                    { value: 'comfort', label: '🌟 위로' },
                  ].map((item) => (
                    <Button
                      key={item.value}
                      className={`h-12 w-full ${
                        category === item.value
                          ? 'bg-blue-500 hover:bg-blue-600 text-white'
                          : 'bg-gray-800/50 hover:bg-gray-800/70 text-gray-100'
                      }`}
                      onClick={() => setCategory(item.value)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* AI 생성 버튼 */}
            <Button
              onClick={handleGenerate}
              disabled={!story.trim() || isGenerating}
              className="w-full bg-blue-500 hover:bg-blue-600 h-12 text-lg"
            >
              {isGenerating ? 'AI가 내용을 생성하고 있습니다...' : 'AI로 공감 투표 만들기'}
            </Button>
          </div>

          {/* AI 응답 표시 */}
          {aiResponse && (
            <div className="mt-8 space-y-8">
              {/* 4. 공감 투표 */}
              <div className="bg-gray-800/50 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4">4. 공감 투표</h2>
                <div className="space-y-6">
                  {/* 투표 질문 표시 */}
                  {formattedVote.questions.map((question, qIndex) => (
                    <div key={qIndex} className="bg-gray-700/50 p-4 rounded-lg">
                      <div className="flex items-start gap-2 mb-4">
                        <Textarea
                          value={question.text}
                          onChange={(e) => {
                            const newQuestions = [...formattedVote.questions];
                            newQuestions[qIndex] = {
                              ...question,
                              text: e.target.value
                            };
                            setFormattedVote({ questions: newQuestions });
                          }}
                          placeholder="질문을 입력하세요"
                          className="flex-1 bg-gray-800 border-gray-600 text-white"
                        />
                        <Button
                          onClick={() => {
                            const newQuestions = formattedVote.questions.filter((_, i) => i !== qIndex);
                            setFormattedVote({ questions: newQuestions });
                          }}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          삭제
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {/* 선택지 표시 */}
                        {question.options.map((option, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-2">
                            <div className="w-6 text-gray-400">{oIndex + 1})</div>
                            <Textarea
                              value={option.text}
                              onChange={(e) => {
                                const newQuestions = [...formattedVote.questions];
                                newQuestions[qIndex].options[oIndex] = {
                                  text: e.target.value
                                };
                                setFormattedVote({ questions: newQuestions });
                              }}
                              placeholder="선택지를 입력하세요"
                              className="flex-1 bg-gray-800 border-gray-600 text-white"
                            />
                            <Button
                              onClick={() => {
                                const newQuestions = [...formattedVote.questions];
                                newQuestions[qIndex].options = question.options.filter((_, i) => i !== oIndex);
                                setFormattedVote({ questions: newQuestions });
                              }}
                              className="bg-red-500/50 hover:bg-red-500"
                              size="sm"
                            >
                              X
                            </Button>
                          </div>
                        ))}
                        <Button
                          onClick={() => {
                            const newQuestions = [...formattedVote.questions];
                            newQuestions[qIndex].options.push({ text: '' });
                            setFormattedVote({ questions: newQuestions });
                          }}
                          className="w-full mt-2 bg-blue-500 hover:bg-blue-600"
                        >
                          선택지 추가
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    onClick={() => {
                      setFormattedVote(prev => ({
                        questions: [...prev.questions, {
                          text: '',
                          options: [{ text: '' }, { text: '' }, { text: '' }]
                        }]
                      }));
                    }}
                    className="w-full bg-blue-500 hover:bg-blue-600"
                  >
                    새 질문 추가
                  </Button>
                </div>
              </div>

              {/* 5. 추천 컨텐츠 */}
              <div className="bg-gray-800/50 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4">5. 추천 컨텐츠</h2>
                <Tabs defaultValue="movie" className="w-full">
                  <TabsList className="w-full grid grid-cols-4 mb-4">
                    <TabsTrigger value="movie">🎬 영화</TabsTrigger>
                    <TabsTrigger value="music">🎵 음악</TabsTrigger>
                    <TabsTrigger value="book">📚 도서</TabsTrigger>
                    <TabsTrigger value="quote">💌 한마디</TabsTrigger>
                  </TabsList>
                  <TabsContent value="movie" className="bg-gray-700/50 p-4 rounded-lg">
                    {aiResponse.recommendations.split('\n').find(line => line.includes('🎬'))?.replace('🎬 추천 영화:', '')}
                  </TabsContent>
                  <TabsContent value="music" className="bg-gray-700/50 p-4 rounded-lg">
                    {aiResponse.recommendations.split('\n').find(line => line.includes('🎵'))?.replace('🎵 추천 음악:', '')}
                  </TabsContent>
                  <TabsContent value="book" className="bg-gray-700/50 p-4 rounded-lg">
                    {aiResponse.recommendations.split('\n').find(line => line.includes('📚'))?.replace('📚 추천 도서:', '')}
                  </TabsContent>
                  <TabsContent value="quote" className="bg-gray-700/50 p-4 rounded-lg">
                    {aiResponse.recommendations.split('\n').find(line => line.includes('💌'))?.replace('💌 위로의 한마디:', '')}
                  </TabsContent>
                </Tabs>
              </div>


              {/* 저장 버튼 */}
              <div className="flex justify-end">
                <Button
                  onClick={async () => {
                    try {
                      // 필수 입력 체크
                      if (!story.trim()) {
                        alert('사연을 입력해주세요.');
                        return;
                      }
                      if (formattedVote.questions.length === 0) {
                        alert('최소 1개 이상의 질문이 필요합니다.');
                        return;
                      }
                      if (formattedVote.questions.some(q => !q.text.trim() || q.options.length < 2 || q.options.some(o => !o.text.trim()))) {
                        alert('모든 질문에는 질문 내용과 2개 이상의 선택지가 필요합니다.');
                        return;
                      }

                      // Firestore에 저장
                      const testRef = await addDoc(collection(db, 'modoo-ai-tests'), {
                        title: formattedVote.questions[0]?.text || '무제',
                        description: story,
                        emotion,
                        category,
                        questions: formattedVote.questions,
                        recommendations: aiResponse?.recommendations || '',
                        createdAt: serverTimestamp(),
                        createdBy: currentUser.uid,
                        stats: {
                          participantCount: 0,
                          likeCount: 0
                        }
                      });

                      alert('저장되었습니다!');
                      router.push('/modoo-ai');
                    } catch (error) {
                      console.error('저장 실패:', error);
                      alert('저장에 실패했습니다. 다시 시도해주세요.');
                    }
                  }}
                  className="ml-4 bg-blue-500 hover:bg-blue-600"
                >
                  저장하기
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}