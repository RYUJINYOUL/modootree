'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { loadSlim } from "tsparticles-slim";
import Particles from "react-tsparticles";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, Gift, Users, Baby, MessageCircle, Plus, Eye, Share2, Upload, X, ImageIcon, Trash2, ChevronLeft, ChevronRight, Info, Settings } from 'lucide-react';
import Link from 'next/link';
import LoginOutButton from '@/components/ui/LoginOutButton';
import { useSelector } from 'react-redux';
import { collection, query, orderBy, getDocs, where, addDoc, onSnapshot, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase';

interface LinkLetter {
  id: string;
  title: string;
  category: 'confession' | 'gratitude' | 'friendship' | 'filial' | 'apology' | 'celebration';
  content: string;
  quiz: {
    questions?: {
      question: string;
      options: string[];
      correctAnswer: number;
      hint: string;
    }[];
    // 기존 단일 퀴즈 호환성
    question?: string;
    options?: string[];
    correctAnswer?: number;
    hint?: string;
  };
  author: {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
  };
  recipient?: {
    email: string;
    name?: string;
  };
  isPublic: boolean;
  viewCount: number;
  likeCount: number;
  createdAt: Date;
  expiresAt?: Date;
  scheduledAt?: Date; // 예약 발송 시간
  images?: string[]; // 편지 이미지들
  background?: {
    type: 'color' | 'gradient' | 'image' | 'default';
    value?: string;
  };
}

interface LetterForm {
  title: string;
  category: string;
  author: string;
  content: string;
  quiz: {
    questions: {
      question: string;
      options: string[];
      correctAnswer: number;
      hint: string;
    }[];
  };
  images: File[];
  background: {
    type: 'color' | 'gradient' | 'image' | 'default';
    value?: string;
  };
}

const ParticlesComponent = () => {
  const particlesInit = useCallback(async (engine: any) => {
    await loadSlim(engine);
  }, []);

  return (
    <Particles
      className="absolute inset-0 pointer-events-none"
      init={particlesInit}
      options={{
        background: {
          color: "transparent"
        },
        fpsLimit: 120,
        particles: {
          color: {
            value: ["#ff6b9d", "#c44569", "#f8b500", "#6c5ce7", "#a29bfe", "#fd79a8"]
          },
          collisions: {
            enable: false
          },
          move: {
            direction: "none",
            enable: true,
            outModes: {
              default: "out"
            },
            random: true,
            speed: 0.3,
            straight: false,
            attract: {
              enable: true,
              rotateX: 600,
              rotateY: 1200
            }
          },
          number: {
            density: {
              enable: true,
              area: 800
            },
            value: 80
          },
          opacity: {
            animation: {
              enable: true,
              minimumValue: 0.1,
              speed: 1,
              sync: false
            },
            random: true,
            value: { min: 0.1, max: 0.4 }
          },
          shape: {
            type: ["circle", "triangle", "polygon"]
          },
          size: {
            animation: {
              enable: true,
              minimumValue: 0.1,
              speed: 2,
              sync: false
            },
            random: true,
            value: { min: 1, max: 3 }
          }
        },
        detectRetina: true,
        interactivity: {
          events: {
            onHover: {
              enable: true,
              mode: "bubble"
            }
          },
          modes: {
            bubble: {
              distance: 200,
              duration: 2,
              opacity: 0.6,
              size: 5
            }
          }
        }
      }}
    />
  );
};

const letterCategories = [
  { id: 'confession', name: '고백', icon: Heart, color: 'bg-gradient-to-br from-pink-500 to-rose-600', image: '/tabs/love.png' },
  { id: 'gratitude', name: '감사', icon: Gift, color: 'bg-gradient-to-br from-green-500 to-emerald-600', image: '/tabs/congrats.png' },
  { id: 'friendship', name: '우정', icon: Users, color: 'bg-gradient-to-br from-blue-500 to-cyan-600', image: '/tabs/friend.png' },
  { id: 'filial', name: '효도', icon: Baby, color: 'bg-gradient-to-br from-purple-500 to-violet-600', image: '/tabs/family.png' },
  { id: 'apology', name: '사과', icon: MessageCircle, color: 'bg-gradient-to-br from-orange-500 to-amber-600', image: '/tabs/sorry.png' },
  { id: 'celebration', name: '축하', icon: Plus, color: 'bg-gradient-to-br from-yellow-500 to-orange-500', image: '/tabs/cong.png' }
];

export default function LinkLetterPage() {
  const router = useRouter();
  const currentUser = useSelector((state: any) => state.user.currentUser);
  const [letters, setLetters] = useState<LinkLetter[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showMyLetters, setShowMyLetters] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: 기본정보, 2: 퀴즈, 3: 사진, 4: 내용, 5: 배경
  const [cardImageIndexes, setCardImageIndexes] = useState<{[key: string]: number}>({}); // 각 카드별 이미지 인덱스
  const [showDescription, setShowDescription] = useState(false); // 설명 표시 여부
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // 삭제 중인 게시물 ID
  
  const [letterForm, setLetterForm] = useState<LetterForm>({
    title: '',
    category: '',
    author: '',
    content: '',
    quiz: {
      questions: [{
        question: '',
        options: ['', ''],
        correctAnswer: 0,
        hint: ''
      }]
    },
    images: [],
    background: {
      type: 'default'
    }
  });

  // 임시 더미 데이터 (나중에 Firebase에서 가져올 예정)
  const dummyLetters: LinkLetter[] = [
    
  ];

  useEffect(() => {
    console.log('Firebase에서 편지 목록 로드 시작');
    
    // 기존 localStorage 데이터 정리 (한 번만 실행)
    const hasCleanedLocalStorage = localStorage.getItem('linkLettersMigrated');
    if (!hasCleanedLocalStorage) {
      const oldLetters = localStorage.getItem('linkLetters');
      const oldAllLetters = localStorage.getItem('allLinkLetters');
      
      if (oldLetters || oldAllLetters) {
        console.log('🔄 기존 localStorage 데이터 발견 - Firebase로 마이그레이션 완료됨');
        console.log('📝 이제 모든 편지는 Firebase에 저장되어 모든 사용자가 실시간으로 볼 수 있습니다!');
        
        // 기존 데이터 제거 (선택사항)
        // localStorage.removeItem('linkLetters');
        // localStorage.removeItem('allLinkLetters');
        
        localStorage.setItem('linkLettersMigrated', 'true');
      }
    }
    
    const q = query(
      collection(db, 'linkLetters'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('Firebase 스냅샷 업데이트, 문서 개수:', snapshot.size);
      
      const firebaseLetters = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        } as LinkLetter;
      });

      // 더미 데이터와 Firebase 데이터 합치기
      const allLetters = [...firebaseLetters, ...dummyLetters];
      console.log('전체 편지 개수:', allLetters.length);
      
      setLetters(allLetters);
      setLoading(false);
    }, (error) => {
      console.error('Firebase 편지 로드 실패:', error);
      // 에러 시 더미 데이터만 표시
      setLetters(dummyLetters);
      setLoading(false);
    });

    // 컴포넌트 언마운트 시 구독 해제
    return () => unsubscribe();
  }, []);

  // 편지 작성 폼 초기화
  const resetForm = () => {
    setLetterForm({
      title: '',
      category: '',
      author: '',
      content: '',
      quiz: {
        questions: [{
          question: '',
          options: ['', ''],
          correctAnswer: 0,
          hint: ''
        }]
      },
      images: [],
      background: {
        type: 'default'
      }
    });
    setCurrentStep(1);
  };

  // 퀴즈 질문 추가
  const addQuizQuestion = () => {
    if (letterForm.quiz.questions.length < 10) {
      setLetterForm(prev => ({
        ...prev,
        quiz: {
          questions: [...prev.quiz.questions, {
            question: '',
            options: ['', ''],
            correctAnswer: 0,
            hint: ''
          }]
        }
      }));
    }
  };

  // 퀴즈 질문 제거
  const removeQuizQuestion = (questionIndex: number) => {
    if (letterForm.quiz.questions.length > 1) {
      setLetterForm(prev => ({
        ...prev,
        quiz: {
          questions: prev.quiz.questions.filter((_, i) => i !== questionIndex)
        }
      }));
    }
  };

  // 퀴즈 질문 업데이트
  const updateQuizQuestion = (questionIndex: number, field: string, value: string) => {
    setLetterForm(prev => ({
      ...prev,
      quiz: {
        questions: prev.quiz.questions.map((q, i) => 
          i === questionIndex ? { ...q, [field]: value } : q
        )
      }
    }));
  };

  // 퀴즈 선택지 추가
  const addQuizOption = (questionIndex: number) => {
    const question = letterForm.quiz.questions[questionIndex];
    if (question.options.length < 10) {
      setLetterForm(prev => ({
        ...prev,
        quiz: {
          questions: prev.quiz.questions.map((q, i) => 
            i === questionIndex 
              ? { ...q, options: [...q.options, ''] }
              : q
          )
        }
      }));
    }
  };

  // 퀴즈 선택지 제거
  const removeQuizOption = (questionIndex: number, optionIndex: number) => {
    const question = letterForm.quiz.questions[questionIndex];
    if (question.options.length > 2) {
      const newOptions = question.options.filter((_, i) => i !== optionIndex);
      setLetterForm(prev => ({
        ...prev,
        quiz: {
          questions: prev.quiz.questions.map((q, i) => 
            i === questionIndex 
              ? { 
                  ...q, 
                  options: newOptions,
                  correctAnswer: q.correctAnswer >= newOptions.length ? 0 : q.correctAnswer
                }
              : q
          )
        }
      }));
    }
  };

  // 퀴즈 선택지 업데이트
  const updateQuizOption = (questionIndex: number, optionIndex: number, value: string) => {
    setLetterForm(prev => ({
      ...prev,
      quiz: {
        questions: prev.quiz.questions.map((q, i) => 
          i === questionIndex 
            ? { 
                ...q, 
                options: q.options.map((option, j) => j === optionIndex ? value : option)
              }
            : q
        )
      }
    }));
  };

  // 퀴즈 정답 설정
  const setCorrectAnswer = (questionIndex: number, answerIndex: number) => {
    setLetterForm(prev => ({
      ...prev,
      quiz: {
        questions: prev.quiz.questions.map((q, i) => 
          i === questionIndex ? { ...q, correctAnswer: answerIndex } : q
        )
      }
    }));
  };

  // 이미지 업로드 처리
  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;
    
    const newImages = Array.from(files).slice(0, 10 - letterForm.images.length);
    setLetterForm(prev => ({
      ...prev,
      images: [...prev.images, ...newImages]
    }));
  };

  // 이미지 제거
  const removeImage = (index: number) => {
    setLetterForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  // Firebase Storage에 편지 이미지 업로드 함수
  const uploadImageToStorage = async (file: File): Promise<string> => {
    try {
      // 파일명 생성 (중복 방지)
      const fileName = `link-letters/${Date.now()}_${Math.random().toString(36).substring(7)}_${file.name}`;
      const storageRef = ref(storage, fileName);
      
      // Firebase Storage에 업로드 (원본 품질 유지)
      const snapshot = await uploadBytes(storageRef, file);
      
      // 다운로드 URL 반환
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('편지 이미지 업로드 완료:', downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error('편지 이미지 업로드 실패:', error);
      throw new Error('이미지 업로드에 실패했습니다.');
    }
  };

  // Firebase Storage에 배경 이미지 업로드 함수
  const uploadBackgroundImageToStorage = async (file: File): Promise<string> => {
    try {
      // 파일명 생성 (중복 방지)
      const fileName = `link-letter-backgrounds/${Date.now()}_${Math.random().toString(36).substring(7)}_${file.name}`;
      const storageRef = ref(storage, fileName);
      
      // Firebase Storage에 업로드 (원본 품질 유지)
      const snapshot = await uploadBytes(storageRef, file);
      
      // 다운로드 URL 반환
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('배경 이미지 업로드 완료:', downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error('배경 이미지 업로드 실패:', error);
      throw new Error('배경 이미지 업로드에 실패했습니다.');
    }
  };


  // 편지 제출
  const handleSubmitLetter = async () => {
    console.log('편지 제출 시작');
    console.log('현재 사용자:', currentUser);
    console.log('편지 폼 데이터:', letterForm);
    
    if (!currentUser?.uid) {
      alert('로그인이 필요합니다.');
      return;
    }

    // 유효성 검사
    if (!letterForm.title.trim()) {
      alert('편지 제목을 입력해주세요.');
      return;
    }
    if (!letterForm.category) {
      alert('카테고리를 선택해주세요.');
      return;
    }
    if (!letterForm.author.trim()) {
      alert('작성자 이름을 입력해주세요.');
      return;
    }
    // 퀴즈 유효성 검사
    for (let i = 0; i < letterForm.quiz.questions.length; i++) {
      const question = letterForm.quiz.questions[i];
      if (!question.question.trim()) {
        alert(`${i + 1}번째 퀴즈 질문을 입력해주세요.`);
        return;
      }
      if (question.options.some(option => !option.trim())) {
        alert(`${i + 1}번째 퀴즈의 모든 선택지를 입력해주세요.`);
        return;
      }
    }
    if (!letterForm.content.trim()) {
      alert('편지 내용을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('이미지 업로드 시작, 이미지 개수:', letterForm.images.length);
      
      // Firebase Storage에 이미지들 업로드
      const imageUploadPromises = letterForm.images.map(img => uploadImageToStorage(img));
      const imageUrls = await Promise.all(imageUploadPromises);
      
      console.log('이미지 업로드 완료, URL 개수:', imageUrls.length);

      // Firebase에 편지 저장 (URL 배열로 저장)
      const letterData = {
        title: letterForm.title,
        category: letterForm.category,
        content: letterForm.content,
        quiz: {
          questions: letterForm.quiz.questions // 다중 퀴즈 저장
        },
        author: {
          uid: currentUser.uid,
          displayName: letterForm.author.trim(),
          email: currentUser.email || '',
          photoURL: currentUser.photoURL || ''
        },
        isPublic: true,
        viewCount: 0,
        likeCount: 0,
        createdAt: serverTimestamp(), // Firebase 서버 타임스탬프 사용
        images: imageUrls, // Storage URL 배열로 저장
        background: letterForm.background // 배경 정보 추가
      };

      console.log('Firebase에 편지 저장 시작:', letterData);
      
      // Firebase에 편지 저장
      const docRef = await addDoc(collection(db, 'linkLetters'), letterData);
      console.log('Firebase 저장 완료, 문서 ID:', docRef.id);
      
      const letterLink = `${window.location.origin}/link-letter/${docRef.id}`;
      
      // 클립보드에 링크 복사
      try {
        await navigator.clipboard.writeText(letterLink);
        console.log('편지 저장 및 클립보드 복사 완료');
        alert(`편지가 성공적으로 작성되었습니다! 🎉\n\n링크가 클립보드에 복사되었어요:\n${letterLink}\n\n이 링크를 원하는 사람에게 보내주세요!`);
      } catch (error) {
        console.log('편지 저장 완료, 클립보드 복사 실패');
        alert(`편지가 성공적으로 작성되었습니다! 🎉\n\n편지 링크: ${letterLink}\n\n위 링크를 복사해서 원하는 사람에게 보내주세요!`);
      }
      
      console.log('편지 작성 완료, 모달 닫기');
      setIsCreateModalOpen(false);
      setShowMyLetters(false); // 새 편지 작성 후 전체 편지 모드로 전환
      resetForm();
      
    } catch (error) {
      console.error('편지 저장 실패:', error);
      alert('편지 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 다음 단계로
  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
    }
  };

  // 이전 단계로
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // 카드 이미지 네비게이션
  const nextCardImage = (letterId: string, totalImages: number, e: React.MouseEvent) => {
    e.stopPropagation(); // 카드 클릭 이벤트 방지
    setCardImageIndexes(prev => ({
      ...prev,
      [letterId]: ((prev[letterId] || 0) + 1) % totalImages
    }));
  };

  const prevCardImage = (letterId: string, totalImages: number, e: React.MouseEvent) => {
    e.stopPropagation(); // 카드 클릭 이벤트 방지
    setCardImageIndexes(prev => ({
      ...prev,
      [letterId]: ((prev[letterId] || 0) - 1 + totalImages) % totalImages
    }));
  };

  // 관리자 권한 확인
  const isAdmin = currentUser?.uid === 'vW1OuC6qMweyOqu73N0558pv4b03';

  // 삭제 권한 확인 함수
  const canDeleteLetter = (letter: LinkLetter) => {
    return isAdmin || (currentUser?.uid && letter.author.uid === currentUser.uid);
  };

  // 게시물 삭제 함수
  const handleDeleteLetter = async (letter: LinkLetter, e: React.MouseEvent) => {
    e.stopPropagation(); // 카드 클릭 이벤트 방지
    
    if (!canDeleteLetter(letter)) {
      alert('본인이 작성한 편지만 삭제할 수 있습니다.');
      return;
    }

    const isOwnLetter = letter.author.uid === currentUser?.uid;
    const confirmMessage = isOwnLetter 
      ? '정말로 내 편지를 삭제하시겠습니까?\n삭제된 편지는 복구할 수 없습니다.'
      : '정말로 이 편지를 삭제하시겠습니까? (관리자)\n삭제된 편지는 복구할 수 없습니다.';
    
    const confirmDelete = window.confirm(confirmMessage);
    if (!confirmDelete) return;

    setIsDeleting(letter.id);
    try {
      await deleteDoc(doc(db, 'linkLetters', letter.id));
      console.log('편지 삭제 완료:', letter.id);
      alert('편지가 성공적으로 삭제되었습니다.');
    } catch (error) {
      console.error('편지 삭제 실패:', error);
      alert('편지 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredLetters = letters.filter(letter => {
    if (selectedCategory !== 'all' && letter.category !== selectedCategory) return false;
    if (showMyLetters && letter.author.uid !== currentUser?.uid) return false;
    return true;
  });

  const renderLetterList = () => {
    if (loading) {
      return (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
          <p className="mt-4 text-gray-300">편지를 불러오는 중...</p>
        </div>
      );
    }

    if (filteredLetters.length === 0) {
      return (
        <div className="text-center py-20">
          <div className="mb-6">
            <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-300 mb-2">
              {showMyLetters ? '작성한 편지가 없습니다' : '아직 편지가 없습니다'}
            </h3>
            <p className="text-gray-400">
              {showMyLetters 
                ? '첫 번째 링크 편지를 작성해보세요!' 
                : '첫 번째 편지의 주인공이 되어보세요!'
              }
            </p>
          </div>
          {currentUser?.uid && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-pink-500 hover:bg-pink-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              편지 쓰기
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {filteredLetters.map((letter) => {
          const category = letterCategories.find(cat => cat.id === letter.category);
          const IconComponent = category?.icon || Heart;
          const currentImageIndex = cardImageIndexes[letter.id] || 0;
          
          return (
            <div 
              key={letter.id}
              className="bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden hover:bg-white/20 transition-all duration-300 cursor-pointer group hover:scale-105 hover:shadow-xl"
              onClick={() => router.push(`/link-letter/${letter.id}`)}
            >
              {/* 이미지 캐로셀 또는 카테고리 헤더 */}
              <div className="relative h-48">
                {letter.images && letter.images.length > 0 ? (
                  // 이미지 캐로셀
                  <>
                    <img
                      src={letter.images[currentImageIndex]}
                      alt={`${letter.title} 이미지 ${currentImageIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* 이미지가 여러 개일 때만 네비게이션 버튼 표시 */}
                    {letter.images.length > 1 && (
                      <>
                        <button
                          onClick={(e) => prevCardImage(letter.id, letter.images!.length, e)}
                          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => nextCardImage(letter.id, letter.images!.length, e)}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        
                        {/* 이미지 인디케이터 */}
                        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1.5">
                          {letter.images.map((_, index) => (
                            <div
                              key={index}
                              className={`w-2 h-2 rounded-full transition-all ${
                                index === currentImageIndex 
                                  ? 'bg-white shadow-lg' 
                                  : 'bg-white/40'
                              }`}
                            />
                          ))}
                        </div>
                        
                        {/* 이미지 카운터 */}
                        <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                          <span className="text-xs text-white font-medium">
                            {currentImageIndex + 1}/{letter.images.length}
                          </span>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  // 기본 카테고리 아이콘
                  <div className="bg-blue-500/30 backdrop-blur-sm h-full flex items-center justify-center">
                    <img 
                      src={category?.image} 
                      alt={category?.name}
                      className="w-16 h-16 object-contain drop-shadow-lg"
                    />
                  </div>
                )}
                
                {/* 카테고리 배지 */}
                <div className="absolute top-3 left-3 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                  <span className="text-xs text-white font-medium">{category?.name}</span>
                </div>
                
                {/* 삭제 버튼 (관리자 또는 본인 게시물) */}
                {canDeleteLetter(letter) && (
                  <button
                    onClick={(e) => handleDeleteLetter(letter, e)}
                    disabled={isDeleting === letter.id}
                    className={`absolute top-3 right-3 w-8 h-8 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                      letter.author.uid === currentUser?.uid 
                        ? 'bg-orange-500/80 hover:bg-orange-500' 
                        : 'bg-red-500/80 hover:bg-red-500'
                    }`}
                    title={letter.author.uid === currentUser?.uid ? "내 편지 삭제" : "편지 삭제 (관리자)"}
                  >
                    {isDeleting === letter.id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-white" />
                    )}
                  </button>
                )}
                
                {/* 비공개 배지 */}
                {!letter.isPublic && !canDeleteLetter(letter) && (
                  <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                    <span className="text-xs text-white font-medium">🔒</span>
                  </div>
                )}
              </div>
              
              {/* 편지 정보 */}
              <div className="p-4">
                <div className="mb-3">
                  <h3 className="font-semibold text-white truncate mb-1 group-hover:text-pink-200 transition-colors">
                    {letter.title}
                  </h3>
                </div>
                
                {/* 통계 */}
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      <span>{letter.likeCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>{letter.viewCount}</span>
                    </div>
                  </div>
                  
                  {/* 작성일 */}
                  <span className="text-xs text-gray-500">
                    {letter.createdAt.toLocaleDateString('ko-KR', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
                
                {/* 작성자 (항상 표시) */}
                <div className="mt-2 pt-2 border-t border-white/10">
                  <span className="text-xs text-gray-500">
                    by {letter.author.displayName || letter.author.email?.split('@')[0] || '익명'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* 헤더 */}
      <div className="fixed top-0 left-0 right-0 z-20 w-full">
        <LoginOutButton />
      </div>

      <main className="min-h-screen bg-slate-950 text-white/90 relative overflow-hidden pt-[70px]">
        {/* 파티클 배경 효과 */}
        <div className="absolute inset-0 z-0">
          <ParticlesComponent />
        </div>
        
        <div className="container mx-auto px-4 py-7 pb-32 relative z-10">
          
          {/* 페이지 헤더 */}
          
          <div className="text-center">
  <div className="inline-flex items-center gap-2 mb-6">
    <div className="flex flex-col"> 
      <h1 className="text-2xl font-bold text-white mb-2">모두트리 링크편지</h1> 
      <p className="text-sm text-gray-400">퀴즈를 풀어야만 볼 수 있는 편지</p>
    </div>
  </div>
</div>

          {/* 카테고리 필터 */}
          <div className="mb-8">
            {/* 데스크톱: 기존 flex-wrap 방식 */}
            <div className="hidden md:flex flex-wrap gap-3 justify-center">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('all')}
                className={`text-sm transition-all ${
                  selectedCategory === 'all' 
                    ? 'bg-blue-500/30 hover:bg-blue-500/40 text-white shadow-lg backdrop-blur-sm border-blue-400/50' 
                    : 'border-white/20 text-gray-300 hover:bg-blue-500/20 hover:text-white hover:border-blue-400/30'
                }`}
              >
                전체 ({letters.length})
              </Button>
              {letterCategories.map((category) => {
                const count = letters.filter(letter => letter.category === category.id).length;
                return (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`text-sm transition-all flex items-center gap-2 ${
                      selectedCategory === category.id 
                        ? 'bg-blue-500/30 hover:bg-blue-500/40 text-white shadow-lg backdrop-blur-sm border-blue-400/50' 
                        : 'border-white/20 text-gray-300 hover:bg-blue-500/20 hover:text-white hover:border-blue-400/30'
                    }`}
                  >
                    <img 
                      src={category.image} 
                      alt={category.name}
                      className="w-4 h-4 object-contain"
                    />
                    {category.name} ({count})
                  </Button>
                );
              })}
            </div>

            {/* 모바일: 캐로셀 방식 */}
            <div className="md:hidden">
              <div className="flex gap-3 overflow-x-auto pb-2 px-4 -mx-4 scrollbar-hide">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory('all')}
                  className={`text-sm transition-all flex-shrink-0 ${
                    selectedCategory === 'all' 
                      ? 'bg-blue-500/30 hover:bg-blue-500/40 text-white shadow-lg backdrop-blur-sm border-blue-400/50' 
                      : 'border-white/20 text-gray-300 hover:bg-blue-500/20 hover:text-white hover:border-blue-400/30'
                  }`}
                >
                  전체 ({letters.length})
                </Button>
                {letterCategories.map((category) => {
                  const count = letters.filter(letter => letter.category === category.id).length;
                  return (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? 'default' : 'outline'}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`text-sm transition-all flex-shrink-0 flex items-center gap-2 ${
                        selectedCategory === category.id 
                          ? 'bg-blue-500/30 hover:bg-blue-500/40 text-white shadow-lg backdrop-blur-sm border-blue-400/50' 
                          : 'border-white/20 text-gray-300 hover:bg-blue-500/20 hover:text-white hover:border-blue-400/30'
                      }`}
                    >
                      <img 
                        src={category.image} 
                        alt={category.name}
                        className="w-4 h-4 object-contain"
                      />
                      {category.name} ({count})
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 컨트롤 버튼들 */}
          <div className="flex flex-row justify-between items-center gap-4 mb-8">
            <div className="flex gap-3">
              <Button
                variant={showMyLetters ? 'default' : 'outline'}
                onClick={() => setShowMyLetters(!showMyLetters)}
                className={`text-sm transition-all ${
                  showMyLetters 
                    ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                    : 'border-white/20 text-gray-300 hover:bg-blue-500/20 hover:text-white hover:border-blue-400/30'
                }`}
              >
                {showMyLetters ? '📝 내 편지' : '🌍 전체 편지'}
              </Button>
            </div>
            
            {currentUser?.uid ? (
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg transition-all hover:scale-105 flex-shrink-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                편지 쓰기
              </Button>
            ) : (
              <p className="text-sm text-gray-400 flex-shrink-0">
                편지를 쓰려면 로그인이 필요해요 ✨
              </p>
            )}
          </div>

          {/* 편지 목록 */}
          {renderLetterList()}
          
          {/* 하단 여백 */}
          <div className="h-20 md:h-32"></div>
        </div>

      </main>

      {/* 편지 작성 모달 */}
      <Dialog open={isCreateModalOpen} onOpenChange={(open) => {
        setIsCreateModalOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-center text-white">
              링크 편지 쓰기
            </DialogTitle>
            <div className="flex justify-center mt-4">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      currentStep >= step 
                        ? 'bg-blue-500 text-white shadow-lg' 
                        : 'bg-white/20 text-white/60 backdrop-blur-sm'
                    }`}>
                      {step}
                    </div>
                    {step < 5 && (
                      <div className={`w-8 h-1 transition-all ${
                        currentStep > step ? 'bg-blue-500' : 'bg-white/20'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center text-sm text-white/70 mt-2">
              {currentStep === 1 && '기본 정보'}
              {currentStep === 2 && '퀴즈 만들기'}
              {currentStep === 3 && '사진 업로드'}
              {currentStep === 4 && '편지 내용'}
              {currentStep === 5 && '배경 선택'}
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-1">
            {/* Step 1: 기본 정보 */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-white">편지 제목 *</Label>
                  <Input
                    id="title"
                    value={letterForm.title}
                    onChange={(e) => setLetterForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="편지 제목을 입력하세요"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="category" className="text-white">카테고리 *</Label>
                  <Select value={letterForm.category} onValueChange={(value) => setLetterForm(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="카테고리를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {letterCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="author" className="text-white">작성자 *</Label>
                  <Input
                    id="author"
                    value={letterForm.author}
                    onChange={(e) => setLetterForm(prev => ({ ...prev, author: e.target.value }))}
                    placeholder="작성자 이름을 입력하세요"
                    className="mt-1"
                  />
                  <p className="text-xs text-white/70 mt-1">
                    편지를 받는 사람이 볼 작성자 이름입니다
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: 퀴즈 만들기 */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-3 backdrop-blur-sm">
                  <p className="text-sm text-white">
                    <strong>퀴즈 만들기 가이드:</strong><br />
                    • 최소 1개, 최대 10개까지 퀴즈 질문 생성 가능<br />
                    • 각 질문마다 최소 2개, 최대 10개 선택지<br />
                    • 각 질문의 정답을 반드시 선택해주세요
                  </p>
                </div>

                {/* 퀴즈 질문 목록 */}
                <div className="space-y-6">
                  {letterForm.quiz.questions.map((question, questionIndex) => (
                    <div key={questionIndex} className="border border-blue-400/30 rounded-lg p-4 bg-blue-500/20 backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-white">
                          퀴즈 {questionIndex + 1}
                        </h4>
                        {letterForm.quiz.questions.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeQuizQuestion(questionIndex)}
                            className="border-red-400/50 text-red-300 hover:text-red-200 hover:bg-red-500/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-3">
                        {/* 질문 입력 */}
                        <div>
                          <Label className="text-white">질문 *</Label>
                          <Input
                            value={question.question}
                            onChange={(e) => updateQuizQuestion(questionIndex, 'question', e.target.value)}
                            placeholder={`${questionIndex + 1}번째 퀴즈 질문을 입력하세요`}
                            className="mt-1"
                          />
                        </div>

                        {/* 선택지 */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-white">선택지 * (최대 10개)</Label>
                            <span className="text-xs text-white/70">
                              {question.options.length}/10 개
                            </span>
                          </div>
                          <div className="space-y-2">
                            {question.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center gap-2">
                                <div className="flex items-center gap-2 flex-1">
                                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                                    question.correctAnswer === optionIndex 
                                      ? 'border-green-400 bg-green-500 text-white' 
                                      : 'border-white/50 text-white'
                                  }`}>
                                    {optionIndex + 1}
                                  </div>
                                  <Input
                                    value={option}
                                    onChange={(e) => updateQuizOption(questionIndex, optionIndex, e.target.value)}
                                    placeholder={`선택지 ${optionIndex + 1}`}
                                    className="flex-1"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCorrectAnswer(questionIndex, optionIndex)}
                                  className={`border-white/30 text-white hover:bg-white/10 ${
                                    question.correctAnswer === optionIndex ? 'bg-green-500/30 border-green-400/50' : ''
                                  }`}
                                >
                                  정답
                                </Button>
                                {question.options.length > 2 && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeQuizOption(questionIndex, optionIndex)}
                                    className="border-red-400/50 text-red-300 hover:text-red-200 hover:bg-red-500/20"
                                    title="선택지 삭제"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                          
                          {/* 선택지 추가 버튼 */}
                          <div className="mt-2">
                            {question.options.length < 10 ? (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => addQuizOption(questionIndex)}
                                className="w-full border-white/30 text-white hover:bg-white/10"
                                size="sm"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                선택지 추가 ({question.options.length}/10)
                              </Button>
                            ) : (
                              <div className="w-full p-2 bg-green-500/20 border border-green-400/30 rounded text-center backdrop-blur-sm">
                                <span className="text-xs text-white">
                                  ✅ 최대 10개 선택지 완료
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 힌트 */}
                        <div>
                          <Label className="text-white">힌트 (선택)</Label>
                          <Input
                            value={question.hint}
                            onChange={(e) => updateQuizQuestion(questionIndex, 'hint', e.target.value)}
                            placeholder="퀴즈가 어려울 때 보여줄 힌트"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 퀴즈 질문 추가 버튼 */}
                <div className="mt-4">
                  {letterForm.quiz.questions.length < 10 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addQuizQuestion}
                      className="w-full border-white/30 text-white hover:bg-white/10"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      퀴즈 질문 추가 ({letterForm.quiz.questions.length}/10)
                    </Button>
                  ) : (
                    <div className="w-full p-3 bg-blue-500/20 border border-blue-400/30 rounded-lg text-center backdrop-blur-sm">
                      <span className="text-sm text-white">
                        ✅ 최대 10개 퀴즈 질문이 모두 추가되었습니다
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: 사진 업로드 */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-white">편지 사진 (최대 5장)</Label>
                  <div className="mt-2">
                    <div className="border-2 border-dashed border-white/30 rounded-lg p-6 text-center bg-blue-500/10 backdrop-blur-sm">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e.target.files)}
                        className="hidden"
                        id="imageUpload"
                        disabled={letterForm.images.length >= 5}
                      />
                      <label
                        htmlFor="imageUpload"
                        className={`cursor-pointer ${letterForm.images.length >= 5 ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        <Upload className="w-12 h-12 text-white/60 mx-auto mb-2" />
                        <p className="text-white/80">
                          {letterForm.images.length >= 5 
                            ? '최대 5장까지 업로드 가능합니다' 
                            : '클릭하여 사진을 업로드하세요'
                          }
                        </p>
                        <p className="text-xs text-white/60 mt-1">
                          * 이미지는 캡쳐 사진 사용 권장
                        </p>
                        <p className="text-xs text-white/60 mt-1">
                          {letterForm.images.length}/5 장 업로드됨
                        </p>
                      </label>
                    </div>
                  </div>
                </div>

                {letterForm.images.length > 0 && (
                  <div>
                    <Label className="text-white">업로드된 사진</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                      {letterForm.images.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={`업로드된 이미지 ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: 편지 내용 */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="content" className="text-white">편지 내용 *</Label>
                  <Textarea
                    id="content"
                    value={letterForm.content}
                    onChange={(e) => setLetterForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="마음을 담은 편지를 작성해주세요..."
                    className="mt-1 min-h-[200px]"
                  />
                  <p className="text-xs text-white/70 mt-1">
                    {letterForm.content.length} 글자
                  </p>
                </div>

                {/* 미리보기 */}
                <div className="border border-blue-400/30 rounded-lg p-4 bg-blue-500/20 backdrop-blur-sm">
                  <h4 className="font-medium mb-2 text-white">편지 미리보기</h4>
                  <div className="text-sm text-white/90">
                    <p><strong>제목:</strong> {letterForm.title || '제목 없음'}</p>
                    <p><strong>카테고리:</strong> {letterCategories.find(cat => cat.id === letterForm.category)?.name || '선택 안함'}</p>
                    <p><strong>작성자:</strong> {letterForm.author || '작성자 없음'}</p>
                    <p><strong>퀴즈:</strong> {letterForm.quiz.questions.length}개 질문</p>
                    <p><strong>사진:</strong> {letterForm.images.length}장</p>
                    <div className="mt-2 p-2 bg-white/10 rounded border border-white/20 max-h-20 overflow-y-auto backdrop-blur-sm">
                      <span className="text-white/80">{letterForm.content || '내용 없음'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: 배경 선택 */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">편지 배경 선택</h3>
                  <p className="text-sm text-white/70 mb-4">편지를 받는 사람이 볼 배경을 선택해주세요</p>
                  
                  {/* 배경 옵션들 */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {/* 기본 배경 */}
                    <button
                      onClick={() => setLetterForm(prev => ({
                        ...prev,
                        background: { type: 'default' }
                      }))}
                      className={`aspect-video bg-slate-950 rounded-lg border-2 transition-all ${
                        letterForm.background.type === 'default' 
                          ? 'border-blue-500 ring-2 ring-blue-500/30' 
                          : 'border-white/20 hover:border-blue-400/50'
                      }`}
                    >
                      <div className="h-full flex items-center justify-center text-white/70 text-sm">
                        기본
                      </div>
                    </button>
                    
                    {/* 로맨틱 그라데이션 */}
                    <button
                      onClick={() => setLetterForm(prev => ({
                        ...prev,
                        background: { 
                          type: 'gradient', 
                          value: 'linear-gradient(to bottom, #ec4899, #8b5cf6)' 
                        }
                      }))}
                      className={`aspect-video bg-gradient-to-b from-pink-500 to-purple-600 rounded-lg border-2 transition-all ${
                        letterForm.background.value === 'linear-gradient(to bottom, #ec4899, #8b5cf6)' 
                          ? 'border-blue-500 ring-2 ring-blue-500/30' 
                          : 'border-white/20 hover:border-blue-400/50'
                      }`}
                    >
                      <div className="h-full flex items-center justify-center text-white text-sm font-medium">
                        로맨틱
                      </div>
                    </button>
                    
                    {/* 자연 그라데이션 */}
                    <button
                      onClick={() => setLetterForm(prev => ({
                        ...prev,
                        background: { 
                          type: 'gradient', 
                          value: 'linear-gradient(to bottom, #10b981, #3b82f6)' 
                        }
                      }))}
                      className={`aspect-video bg-gradient-to-b from-green-500 to-blue-500 rounded-lg border-2 transition-all ${
                        letterForm.background.value === 'linear-gradient(to bottom, #10b981, #3b82f6)' 
                          ? 'border-blue-500 ring-2 ring-blue-500/30' 
                          : 'border-white/20 hover:border-blue-400/50'
                      }`}
                    >
                      <div className="h-full flex items-center justify-center text-white text-sm font-medium">
                        자연
                      </div>
                    </button>
                    
                    {/* 따뜻함 그라데이션 */}
                    <button
                      onClick={() => setLetterForm(prev => ({
                        ...prev,
                        background: { 
                          type: 'gradient', 
                          value: 'linear-gradient(to bottom, #f59e0b, #ef4444)' 
                        }
                      }))}
                      className={`aspect-video bg-gradient-to-b from-yellow-500 to-red-500 rounded-lg border-2 transition-all ${
                        letterForm.background.value === 'linear-gradient(to bottom, #f59e0b, #ef4444)' 
                          ? 'border-blue-500 ring-2 ring-blue-500/30' 
                          : 'border-white/20 hover:border-blue-400/50'
                      }`}
                    >
                      <div className="h-full flex items-center justify-center text-white text-sm font-medium">
                        따뜻함
                      </div>
                    </button>
                  </div>
                  
                  {/* 커스텀 색상 */}
                  <div className="space-y-2">
                    <label className="text-white text-sm">커스텀 색상</label>
                    <input
                      type="color"
                      onChange={(e) => setLetterForm(prev => ({
                        ...prev,
                        background: { type: 'color', value: e.target.value }
                      }))}
                      className="w-full h-12 rounded-lg border border-white/20"
                    />
                  </div>
                  
                  {/* 배경 이미지 업로드 */}
                  <div className="space-y-2">
                    <label className="text-white text-sm">배경 이미지 업로드</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        id="backgroundImageUpload"
                         onChange={async (e) => {
                           const file = e.target.files?.[0];
                           if (file) {
                             // 파일 크기 체크 (50MB 제한 - Storage는 더 큰 파일 지원)
                             if (file.size > 50 * 1024 * 1024) {
                               alert('이미지 크기는 50MB 이하로 선택해주세요.');
                               return;
                             }
                             try {
                               const imageUrl = await uploadBackgroundImageToStorage(file);
                               setLetterForm(prev => ({
                                 ...prev,
                                 background: { type: 'image', value: imageUrl }
                               }));
                             } catch (error) {
                               console.error('배경 이미지 업로드 실패:', error);
                               alert('배경 이미지 업로드 중 오류가 발생했습니다.');
                             }
                           }
                         }}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById('backgroundImageUpload')?.click()}
                        className="w-full p-4 border-2 border-dashed border-white/30 rounded-lg bg-white/5 hover:bg-white/10 hover:border-white/50 transition-all text-white text-center"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="w-6 h-6 text-white/70" />
                          <span className="text-sm">이미지 선택하기</span>
                          <span className="text-xs text-white/60">고품질 이미지 지원 (최대 50MB)</span>
                        </div>
                      </button>
                    </div>
                    <p className="text-xs text-white/60">
                      편지 배경으로 사용할 이미지를 선택해주세요 (권장: 16:9 비율, 최대 50MB)
                    </p>
                  </div>
                </div>

                {/* 배경 미리보기 */}
                <div className="border border-blue-400/30 rounded-lg p-4 bg-blue-500/20 backdrop-blur-sm">
                  <h4 className="font-medium mb-2 text-white">선택된 배경</h4>
                  <div 
                    className="w-full h-20 rounded-lg border border-white/20 overflow-hidden relative"
                    style={{
                      backgroundColor: letterForm.background.type === 'color' ? letterForm.background.value : undefined,
                      background: letterForm.background.type === 'gradient' ? letterForm.background.value : 
                                letterForm.background.type === 'default' ? '#0f172a' : undefined
                    }}
                  >
                    {letterForm.background.type === 'image' && letterForm.background.value && (
                      <>
                        <img 
                          src={letterForm.background.value} 
                          alt="배경 미리보기" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30" />
                        <button
                          type="button"
                          onClick={() => setLetterForm(prev => ({
                            ...prev,
                            background: { type: 'default' }
                          }))}
                          className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs transition-colors"
                          title="배경 이미지 제거"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 버튼들 */}
          <div className="flex justify-between pt-4 border-t border-white/20">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="border-white/30 text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                className="border-white/30 text-white hover:bg-white/10"
              >
                취소
              </Button>
              
              {currentStep < 5 ? (
                <Button
                  onClick={nextStep}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                >
                  다음
                </Button>
              ) : (
                <Button
                  onClick={handleSubmitLetter}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? '저장 중...' : '편지 보내기'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
