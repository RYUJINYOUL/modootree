'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Test {
  title: string;
  description: string;
  questions: Array<{
    text: string;
    options: Array<{
      text: string;
    }>;
  }>;
  createdBy: string;
}

export default function EditTestPage({ 
  params 
}: { 
  params: Promise<{ testId: string }> 
}) {
  const router = useRouter();
  const currentUser = useSelector((state: any) => state.user.currentUser);
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const resolvedParams = use(params);
  const testId = resolvedParams.testId;

  useEffect(() => {
    const loadTest = async () => {
      try {
        setLoading(true);
        const testDoc = await getDoc(doc(db, 'modoo-ai-tests', testId));
        if (!testDoc.exists()) {
          alert('테스트를 찾을 수 없습니다.');
          router.push('/modoo-ai');
          return;
        }

        const testData = testDoc.data() as Test;
        if (testData.createdBy !== currentUser?.uid) {
          alert('테스트 수정 권한이 없습니다.');
          router.push('/modoo-ai');
          return;
        }

        setTest(testData);
      } catch (error) {
        console.error('테스트 로드 실패:', error);
        alert('테스트 로드에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      loadTest();
    }
  }, [testId, currentUser, router]);

  const handleSave = async () => {
    if (!test) return;

    // 유효성 검사
    if (!test.title.trim()) {
      alert('공감 투표 제목을 입력해주세요.');
      return;
    }

    if (!test.description.trim()) {
      alert('사연을 입력해주세요.');
      return;
    }

    if (test.questions.length === 0) {
      alert('최소 1개 이상의 질문이 필요합니다.');
      return;
    }

    for (const question of test.questions) {
      if (!question.text.trim()) {
        alert('모든 질문에 내용을 입력해주세요.');
        return;
      }
      if (question.options.length < 2) {
        alert('각 질문은 최소 2개 이상의 선택지가 필요합니다.');
        return;
      }
      for (const option of question.options) {
        if (!option.text.trim()) {
          alert('모든 선택지에 내용을 입력해주세요.');
          return;
        }
      }
    }

    try {
      setSaving(true);
      // 기존 데이터에서 title, description, questions만 업데이트
      const updateData = {
        title: test.title,
        description: test.description,
        questions: test.questions,
      };
      await updateDoc(doc(db, 'modoo-ai-tests', testId), updateData);
      alert('수정되었습니다.');
      router.push(`/modoo-ai/tests/${testId}`);
    } catch (error) {
      console.error('수정 실패:', error);
      alert('수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !test) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-gray-900 text-white/90">
        <div className="container mx-auto px-4 py-10">
          <div className="text-center">
            테스트를 불러오는 중...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-gray-900 text-white/90">
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-6">공감 투표 수정</h1>
            
            {/* 기본 정보 */}
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-medium mb-2">제목</label>
                <Textarea
                  value={test.title}
                  onChange={(e) => setTest({ ...test, title: e.target.value })}
                  className="bg-gray-700/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">사연</label>
                <Textarea
                  value={test.description}
                  onChange={(e) => setTest({ ...test, description: e.target.value })}
                  className="bg-gray-700/50"
                />
              </div>
            </div>

            {/* 질문 목록 */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">질문 목록</h2>
              {test.questions.map((question, qIndex) => (
                <div key={qIndex} className="bg-gray-700/50 p-4 rounded-lg space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">질문 {qIndex + 1}</label>
                    <Textarea
                      value={question.text}
                      onChange={(e) => {
                        const newQuestions = [...test.questions];
                        newQuestions[qIndex] = {
                          ...question,
                          text: e.target.value
                        };
                        setTest({ ...test, questions: newQuestions });
                      }}
                      className="bg-gray-600/50"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-sm font-medium">선택지</label>
                    {question.options.map((option, oIndex) => (
                      <div key={oIndex} className="flex gap-2">
                        <Textarea
                          value={option.text}
                          onChange={(e) => {
                            const newQuestions = [...test.questions];
                            newQuestions[qIndex].options[oIndex] = {
                              ...option,
                              text: e.target.value
                            };
                            setTest({ ...test, questions: newQuestions });
                          }}
                          className="flex-1 bg-gray-600/50"
                        />
                        <Button
                          onClick={() => {
                            const newQuestions = [...test.questions];
                            newQuestions[qIndex].options = question.options.filter((_, i) => i !== oIndex);
                            setTest({ ...test, questions: newQuestions });
                          }}
                          className="bg-red-500/50 hover:bg-red-500"
                        >
                          삭제
                        </Button>
                      </div>
                    ))}
                    <Button
                      onClick={() => {
                        const newQuestions = [...test.questions];
                        newQuestions[qIndex].options.push({ text: '' });
                        setTest({ ...test, questions: newQuestions });
                      }}
                      className="w-full bg-blue-500/50 hover:bg-blue-500"
                    >
                      선택지 추가
                    </Button>
                  </div>
                  <Button
                    onClick={() => {
                      const newQuestions = test.questions.filter((_, i) => i !== qIndex);
                      setTest({ ...test, questions: newQuestions });
                    }}
                    className="w-full bg-red-500/50 hover:bg-red-500 mt-4"
                  >
                    질문 삭제
                  </Button>
                </div>
              ))}
              <Button
                onClick={() => {
                  setTest({
                    ...test,
                    questions: [
                      ...test.questions,
                      {
                        text: '',
                        options: [{ text: '' }, { text: '' }, { text: '' }, { text: '' }]
                      }
                    ]
                  });
                }}
                className="w-full bg-blue-500 hover:bg-blue-600"
              >
                새 질문 추가
              </Button>
            </div>


            {/* 저장 버튼 */}
            <div className="flex justify-end gap-2 mt-8">
              <Button
                onClick={() => router.back()}
                variant="outline"
                className="bg-gray-700/50 hover:bg-gray-700 text-white"
              >
                취소
              </Button>
              <Button
                onClick={handleSave}
                className="bg-blue-500 hover:bg-blue-600 text-white"
                disabled={saving}
              >
                {saving ? '저장 중...' : '저장하기'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
