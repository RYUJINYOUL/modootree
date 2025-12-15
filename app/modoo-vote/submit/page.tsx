'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase'; // auth 추가
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Loader2, Upload, Camera, Image } from 'lucide-react';
import { AIGenerationProgress } from '@/components/AIGenerationProgress';
import { useSelector } from 'react-redux';
import useAuth from '@/hooks/useAuth';
import LoginOutButton from '@/components/ui/LoginOutButton';

interface VoteOption {
  text: string;
}

interface VoteQuestion {
  text: string;
  options: VoteOption[];
}

export default function SubmitModooVotePage() {
  const router = useRouter();
  const currentUser = useSelector((state: any) => state.user.currentUser);
  const { user } = useAuth();

  const [title, setTitle] = useState(''); // 사연 제목 (선택 사항)
  const [story, setStory] = useState(''); // 사연 내용
  const [category, setCategory] = useState('worry'); // 카테고리 상태 추가, 기본값 'worry'
  const [questions, setQuestions] = useState<VoteQuestion[]>([
    { text: '', options: [{ text: '' }, { text: '' }] }
  ]);
  const [loading, setLoading] = useState(false);
  const [isSummarizingChat, setIsSummarizingChat] = useState(false); // 채팅 요약 로딩 상태
  const [isGeneratingAiVote, setIsGeneratingAiVote] = useState(false); // AI 투표 생성 로딩 상태 추가
  
  // 이미지 업로드 & OCR 관련 상태
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 이미지 업로드 함수
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setUploadedImages(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
  };

  // 이미지 제거 함수
  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // OCR 처리 함수
  const handleOCR = async () => {
    if (uploadedImages.length === 0) {
      alert('먼저 이미지를 업로드해주세요.');
      return;
    }

    setIsOCRProcessing(true);
    try {
      // Gemini OCR API 호출 (freememo에서 사용하는 것과 동일)
      const response = await fetch('/api/gemini-ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: uploadedImages 
        }),
      });

      if (!response.ok) {
        throw new Error('OCR 처리 실패');
      }

      const data = await response.json();
      
      if (data.text) {
        // OCR로 추출된 텍스트를 사연 내용에 추가
        setStory(prev => prev + (prev ? '\n\n' : '') + data.text);
        
        const { imageCount, extractedCount, failedCount } = data;
        if (failedCount > 0) {
          alert(`OCR 완료! ${imageCount}개 중 ${extractedCount}개 성공, ${failedCount}개 실패\n\n실패 원인을 확인하려면 개발자 도구 콘솔을 확인하세요.`);
        } else {
          alert(`OCR 완료! ${imageCount}개 이미지 모두 성공적으로 처리되었습니다.`);
        }
      }
    } catch (error) {
      console.error('OCR 처리 중 오류:', error);
      alert('텍스트 추출 중 오류가 발생했습니다.');
    } finally {
      setIsOCRProcessing(false);
    }
  };

  // 사연 생성 시 채팅 내용 요약 함수
  const handleSummarizeChat = async () => {
    if (!currentUser?.uid) {
      alert('로그인이 필요합니다.');
      return;
    }
    setIsSummarizingChat(true);
    try {
      const token = await auth.currentUser?.getIdToken(true); // 토큰 가져오기
      if (!token) {
        throw new Error('인증 토큰을 가져올 수 없습니다.');
      }
      const response = await fetch('/api/ai-story-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // 토큰 전송
        },
        body: JSON.stringify({ userId: currentUser.uid }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '채팅 내용 요약에 실패했습니다.');
      }

      const data = await response.json();
      setStory(data.summary);
      alert('오늘 채팅 내용이 요약되어 사연으로 사용되었습니다!');
    } catch (error) {
      console.error('채팅 요약 실패:', error);
      alert(error instanceof Error ? error.message : '채팅 내용을 요약하는 데 실패했습니다.');
    } finally {
      setIsSummarizingChat(false);
    }
  };

  // AI로 공감 투표 제안 함수
  const handleGenerateAiVote = async () => {
    if (!currentUser?.uid) {
      alert('로그인이 필요합니다.');
      return;
    }
    if (!story.trim()) {
      alert('사연 내용을 입력해주세요.');
      return;
    }

    setIsGeneratingAiVote(true);
    try {
      const response = await fetch('/api/modoo-vote-ai-suggest', { // 새 API 라우트 호출
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emotion: category,
          category: category, 
          story: story,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'AI 투표 생성에 실패했습니다.');
      }

      const data = await response.json();
      if (data.vote && Array.isArray(data.vote) && data.vote.length > 0) {
        setQuestions(data.vote.map((q: any) => ({
          text: q.text,
          options: q.options.map((o: any) => ({ text: o.text }))
        })));
        alert('AI가 공감 투표를 제안했습니다. 내용을 수정하여 등록하세요.');
      } else {
        alert('AI가 투표를 제안하지 못했습니다. 사연을 더 자세히 작성해주세요.');
      }
    } catch (error) {
      console.error('AI 투표 생성 실패:', error);
      alert(error instanceof Error ? error.message : 'AI 투표 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsGeneratingAiVote(false);
    }
  };

  // 질문 추가
  const addQuestion = () => {
    setQuestions([...questions, { text: '', options: [{ text: '' }, { text: '' }] }]);
  };

  // 질문 텍스트 변경
  const handleQuestionTextChange = (index: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[index].text = value;
    setQuestions(newQuestions);
  };

  // 질문 제거
  const removeQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
  };

  // 선택지 텍스트 변경
  const handleOptionTextChange = (qIndex: number, oIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex].text = value;
    setQuestions(newQuestions);
  };

  // 선택지 추가
  const addOption = (qIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options.push({ text: '' });
    setQuestions(newQuestions);
  };

  // 선택지 제거
  const removeOption = (qIndex: number, oIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options = newQuestions[qIndex].options.filter((_, i) => i !== oIndex);
    setQuestions(newQuestions);
  };

  const handleSubmit = async () => {
    if (!currentUser?.uid) {
      alert('로그인이 필요합니다.');
      router.push('/login');
      return;
    }

    if (!story.trim()) {
      alert('사연 내용을 입력해주세요.');
      return;
    }

    if (questions.length === 0) {
      alert('최소 1개 이상의 투표 질문이 필요합니다.');
      return;
    }

    // 모든 질문과 선택지가 채워졌는지 확인
    for (const q of questions) {
      if (!q.text.trim()) {
        alert('모든 투표 질문 내용을 입력해주세요.');
        return;
      }
      if (q.options.length < 2) {
        alert('각 질문에는 최소 2개 이상의 선택지가 필요합니다.');
        return;
      }
      for (const o of q.options) {
        if (!o.text.trim()) {
          alert('모든 선택지 내용을 입력해주세요.');
          return;
        }
      }
    }

    setLoading(true);
    try {
      console.log('등록될 데이터:', {
        title: title || story.substring(0, 50) + '...',
        category: category,
        story: story,
        questions: questions.map(q => ({
          text: q.text,
          options: q.options.map(o => ({ text: o.text, votes: 0 }))
        }))
      });
      const docRef = await addDoc(collection(db, 'modoo-vote-articles'), {
        title: title || story.substring(0, 50) + '...', // 사연 제목이 없으면 사연 내용 일부로 대체
        story: story, // 사연 내용
        category: category, // 카테고리 추가
        questions: questions.map(q => ({
          text: q.text,
          options: q.options.map(o => ({ text: o.text, votes: 0 }))
        })),
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        totalVotes: 0,
        view_count: 0, // view_count로 수정
        status: 'pending' // 승인 대기 상태
      });

      alert('공감 투표가 성공적으로 등록되었습니다. 승인 후 메인 페이지에 노출됩니다.');
      router.push('/modoo-vote');
    } catch (error) {
      console.error('공감 투표 등록 실패:', error);
      alert('공감 투표 등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <h1 className="text-2xl font-bold mb-4">로그인이 필요합니다</h1>
        <Button onClick={() => router.push('/login')}>로그인하러 가기</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="fixed top-0 left-0 right-0 z-10">
        <LoginOutButton />
      </div>
      <div className="max-w-3xl mx-auto bg-gray-800 rounded-lg shadow-lg p-6 mt-16">
        <h1 className="text-3xl font-bold text-center mb-8">새 공감 투표 등록</h1>

        {/* 1. 사연 제목 (선택 사항) */}
        <div className="mb-6">
          <label htmlFor="title" className="block text-lg font-semibold mb-2">사연 제목 (선택 사항)</label>
          <Input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="사연의 제목을 입력하세요 (예: 썸남썸녀의 애매한 관계)"
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>

        {/* 2. 사연 내용 */}
        <div className="mb-6">
          <label htmlFor="story" className="block text-lg font-semibold mb-2">사연 내용 <span className="text-red-400">*</span></label>
          <Textarea
            id="story"
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="공감 투표를 만들 사연을 자세히 작성해주세요."
            className="bg-gray-700 border-gray-600 text-white min-h-[150px]"
          />
          {/* <Button
            onClick={handleSummarizeChat}
            disabled={isSummarizingChat || !currentUser?.uid}
            className="w-full bg-blue-500 hover:bg-blue-600 h-10 text-base mt-2"
          >
            {isSummarizingChat ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}오늘 대화 내용으로 사연 생성
          </Button> */}
          
          {/* 이미지 업로드 & OCR 기능 */}
          <div className="border-t border-gray-600 pt-4 mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
              <h4 className="text-white font-medium flex items-center gap-2">
                <Image className="w-5 h-5 text-blue-400" />
                이미지 업로드 & OCR
              </h4>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-500/60 hover:bg-blue-500/80 text-white px-4 py-2 text-sm flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <Upload className="w-4 h-4" />
                  이미지 선택
                </Button>
                {uploadedImages.length > 0 && (
                  <Button
                    onClick={handleOCR}
                    disabled={isOCRProcessing}
                    className="bg-green-500/60 hover:bg-green-500/80 text-white px-4 py-2 text-sm flex items-center justify-center gap-2 w-full sm:w-auto"
                  >
                    {isOCRProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        OCR 처리 중...
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        텍스트 추출
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* 업로드된 이미지 미리보기 */}
            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                {uploadedImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image}
                      alt={`업로드된 이미지 ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border border-gray-600"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
          <Button
            onClick={handleGenerateAiVote}
            disabled={isGeneratingAiVote || !story.trim()}
            className="w-full bg-purple-500 hover:bg-purple-600 h-10 text-base mt-2 relative overflow-hidden"
          >
            {isGeneratingAiVote ? (
              <AIGenerationProgress />
            ) : (
              "AI로 공감 투표 제안받기"
            )}
          </Button>
        </div>

        {/* 3. 카테고리 선택 */}
        <div className="mb-6">
          <label htmlFor="category" className="block text-lg font-semibold mb-2">카테고리 <span className="text-red-400">*</span></label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="block w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="happy">행복</option>
            <option value="sad">슬픔</option>
            <option value="angry">화남</option>
            <option value="anxious">불안</option>
            <option value="comfort">편안</option>
            <option value="worry">고민</option>
          </select>
        </div>

        {/* 4. 투표 질문 및 선택지 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">투표 질문 및 선택지 <span className="text-red-400">*</span></h2>
          {questions.map((q, qIndex) => (
            <div key={qIndex} className="bg-gray-700 rounded-lg p-4 mb-4 relative">
              <h3 className="text-lg font-medium mb-2">질문 {qIndex + 1}</h3>
              <Textarea
                value={q.text}
                onChange={(e) => handleQuestionTextChange(qIndex, e.target.value)}
                placeholder="투표 질문을 입력하세요 (예: 저의 썸남썸녀는 저에게 어떤 마음일까요?)"
                className="bg-gray-600 border-gray-500 text-white mb-2 min-h-[60px]"
              />
              
              <h4 className="font-medium mb-2">선택지 <span className="text-red-400">*</span> (최소 2개)</h4>
              {q.options.map((o, oIndex) => (
                <div key={oIndex} className="flex items-center mb-2">
                  <Input
                    type="text"
                    value={o.text}
                    onChange={(e) => handleOptionTextChange(qIndex, oIndex, e.target.value)}
                    placeholder={`선택지 ${oIndex + 1}`}
                    className="flex-1 bg-gray-600 border-gray-500 text-white mr-2"
                  />
                  {q.options.length > 2 && (
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      onClick={() => removeOption(qIndex, oIndex)}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button onClick={() => addOption(qIndex)} variant="outline" className="w-full mt-2 bg-gray-600 hover:bg-gray-500 text-white border-gray-500">
                <Plus className="h-4 w-4 mr-2" /> 선택지 추가
              </Button>
              
              {questions.length > 1 && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => removeQuestion(qIndex)}
                  className="absolute top-4 right-4"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button onClick={addQuestion} className="w-full bg-green-600 hover:bg-green-700 mt-4">
            <Plus className="h-5 w-5 mr-2" /> 질문 추가
          </Button>
        </div>

        <Button 
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-lg"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}공감 투표 등록하기
        </Button>
      </div>
      <div className="h-20 md:h-32"></div>
    </div>
    
  );
}


