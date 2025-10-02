'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { loadSlim } from "tsparticles-slim";
import Particles from "react-tsparticles";
import LoginOutButton from '@/components/ui/LoginOutButton';
import CollapsibleFooter from '@/components/ui/CollapsibleFooter';
import useAuth from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RadioGroup } from '@/components/ui/radio-group';
import Image from 'next/image';
import { Loader2, ImageIcon } from 'lucide-react';
const LOGO_URL = '/logos/m1.png';

// 스타일 카테고리 정의
const STYLE_CATEGORIES = {
  'design': { label: '디자인/아트', description: '현대적이고 실험적인 스타일' },
  'painting': { label: '회화/드로잉', description: '전통적인 예술 스타일' },
  'etc': { label: '기타', description: '특별한 효과와 재미있는 변형' }
};

// 카테고리별 스타일 그룹
const CATEGORIZED_STYLES = {
  'design': [
    { id: 'pop_art', label: '팝 아트 (워홀)', description: '강렬한 윤곽선과 원색, 패턴' },
    { id: 'minimalism', label: '미니멀리즘', description: '단순한 형태, 깨끗한 선' },
    { id: 'kaleidoscope', label: '만화경 필터', description: '강화된 색상과 기하학적 패턴 (급진적 변형 O)' },
    { id: 'glitch', label: '글리치 아트', description: '디지털 왜곡, 깨진 픽셀 (급진적 변형 O)' },
    { id: 'pixel_art', label: '픽셀 아트', description: '고전 게임 스타일의 8비트 그래픽 (급진적 변형 O)' },
    { id: 'ghibli', label: '지브리 스타일', description: '부드러운 색감, 몽환적인 분위기 (급진적 변형 O)' },
    { id: 'pixar_3d', label: '픽사 3D', description: '매끄러운 질감, 생생한 색상의 3D (급진적 변형 O)' },
    { id: 'comic_book', label: '코믹북', description: '굵은 윤곽선, 점묘법 (급진적 변형 O)' },
    { id: 'simpsons', label: '심슨 스타일', description: '노란 피부, 과장된 특징 (급진적 변형 O)' }
  ],
  'painting': [
    { id: 'oil', label: '유화 필터', description: '두꺼운 붓 터치와 풍부한 질감' },
    { id: 'watercolor', label: '수채화 필터', description: '맑고 투명한 붓놀림' },
    { id: 'sketch', label: '스케치 필터', description: '정밀한 연필 스케치' },
    { id: 'masterpiece', label: '명작 필터', description: '고전적인 초상화 스타일' },
    { id: 'impressionism', label: '인상주의 (모네)', description: '빛과 생생한 색상 강조' },
    { id: 'post_impressionism', label: '후기 인상주의 (고흐)', description: '두껍고 소용돌이치는 붓 터치 (급진적 변형 O)' },
    { id: 'cubism', label: '입체파 (피카소)', description: '기하학적 파편화 (급진적 변형 O)' },
    { id: 'klimt', label: '클림트 스타일', description: '황금 패턴, 모자이크 디테일 (급진적 변형 O)' }
  ],
  'etc': [
    { id: 'synthwave', label: '신스웨이브', description: '레트로 네온 핑크/블루 조명' },
    { id: 'paper_cutout', label: '종이 오리기', description: '입체적인 레이어링 질감' },
    { id: 'crayon_art', label: '크레용 아트', description: '어린이 낙서 스타일의 유쾌한 변형' },
    { id: 'dreamy', label: '몽환적 필터', description: '부드러운 초점과 비현실적인 조명' },
    { id: 'cyberpunk', label: '사이버펑크', description: '네온 빛, 미래적 배경 (급진적 변형 O)' }
  ]
};

// 모든 스타일을 하나의 배열로 변환 (기존 코드와의 호환성을 위해)
const ART_STYLES = Object.values(CATEGORIZED_STYLES).flat();

const COLOR_MOODS = [
  { id: 'warm', label: '따뜻한 색조', description: '노란색/주황색 계열' },
  { id: 'cool', label: '차가운 색조', description: '파란색/보라색 계열' },
  { id: 'intense', label: '강렬한 색조', description: '빨간색/주황색 계열' },
  { id: 'bw', label: '흑백', description: '모노톤의 깊이' }
];

export default function ArtGenerationPage() {
  const { user, loading } = useAuth() as { user: User | null, loading: boolean };
  const router = useRouter();

  const particlesInit = useCallback(async (engine: any) => {
    await loadSlim(engine);
  }, []);
  
  const [style, setStyle] = useState('');
  const [colorMood, setColorMood] = useState('');
  const [generating, setGenerating] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState('design'); // 디자인/아트를 기본값으로 설정

  interface GenerationResult {
    imageUrl?: string;
    error?: string;
    base64Data?: string;
  }

  const [result, setResult] = useState<GenerationResult | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');

  const CATEGORIES = ['일상', '감정', '관계', '취미', '목표', '기타'];

  const handleShare = async () => {
    if (!selectedCategory || !user) {
      alert('카테고리를 선택해주세요.');
      return;
    }
    
    try {
      const token = await user.getIdToken(true);
      if (!result?.imageUrl || !style || !colorMood) {
        alert('이미지 정보가 없습니다.');
        return;
      }

      const requestData = {
        token,
        category: selectedCategory,
        description: description || '',
        imageUrl: result.imageUrl,
        style,
        colorMood
      };
      console.log('보내는 데이터:', requestData);
      
      console.log('전송 데이터:', requestData);
      
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('서버 응답:', errorData);
        throw new Error(`공유 실패: ${errorData}`);
      }

      const data = await response.json();
      console.log('서버 응답 데이터:', data);

      setShowShareDialog(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('공유 중 오류 발생:', error);
      alert('공유 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  useEffect(() => {
    if (!loading && user === null) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <>
        <main className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-cyan-900 text-white/90 relative overflow-hidden">
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
          </div>
        </main>
        <CollapsibleFooter />
      </>
    );
  }

  if (!user) {
    return null;
  }

  const handleGenerate = async () => {
    if (!style || !colorMood || !result?.base64Data) {
      alert('모든 옵션을 선택하고 이미지를 업로드해주세요.');
      return;
    }

    setGenerating(true);
    setResult((prev) => ({ ...prev, imageUrl: undefined, error: undefined }));

    try {
      const token = user ? await user.getIdToken(true) : null;
      const response = await fetch('/api/art-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          style,
          colorMood,
          token,
          imageData: result.base64Data
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '이미지 생성에 실패했습니다.');
      }

      setResult((prev) => ({ 
        ...prev, 
        imageUrl: data.imageUrl 
      }));
      
    } catch (error) {
      setResult((prev) => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' 
      }));
    } finally {
      setGenerating(false);
    }
  };

  const SelectionGroup = ({ title, items, value, onChange }: any) => {
    if (title === "STEP 2. 예술 스타일 선택") {
      return (
        <div className="space-y-4">
          <h3 className="text-xl font-medium text-white mb-4">{title}</h3>
          
          <Accordion 
            type="single" 
            value={activeAccordion}
            onValueChange={setActiveAccordion}
            className="space-y-4">
            {Object.entries(STYLE_CATEGORIES).map(([key, category]) => (
              <AccordionItem key={key} value={key} className="border-white/20 px-0">
                <AccordionTrigger className="text-lg py-4 px-4 hover:bg-white/5 rounded-lg transition-all">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{category.label}</span>
                    <span className="text-sm text-gray-400 font-normal">({CATEGORIZED_STYLES[key as keyof typeof CATEGORIZED_STYLES].length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-2 px-0">
                  <RadioGroup value={value} onValueChange={onChange} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {CATEGORIZED_STYLES[key as keyof typeof CATEGORIZED_STYLES].map((item) => (
                      <div key={item.id} className="relative" onClick={() => {
                        onChange(item.id);
                        // 스타일 선택 시 해당 카테고리의 아코디언을 열린 상태로 유지
                        setActiveAccordion(key);
                      }}>
                        <div
                          className={`flex flex-col p-3 border-2 rounded-lg cursor-pointer
                            border-white/20 text-white bg-black/30
                            ${value === item.id ? 'border-blue-500 bg-blue-600/30 ring-2 ring-blue-500/50' : 'hover:bg-black/50 hover:border-white/60'}
                            transition-all duration-300`}
                        >
                          <span className="text-lg font-medium mb-2">{item.label}</span>
                          <span className="text-sm text-gray-300 leading-relaxed">
                            {item.description.replace(' (급진적 변형 O)', '')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      );
    }

    // 다른 SelectionGroup (색채와 분위기 선택)은 기존 스타일 유지
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-medium text-white mb-4">{title}</h3>
        <RadioGroup value={value} onValueChange={onChange} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {items.map((item: any) => (
            <div key={item.id} className="relative" onClick={() => onChange(item.id)}>
              <div
                className={`flex flex-col p-3 border-2 rounded-lg cursor-pointer
                  border-white/20 text-white bg-black/30
                  ${value === item.id ? 'border-blue-500 bg-blue-600/30 ring-2 ring-blue-500/50' : 'hover:bg-black/50 hover:border-white/60'}
                  transition-all duration-300`}
              >
                <span className="text-lg font-medium mb-2">{item.label}</span>
                <span className="text-sm text-gray-300 leading-relaxed">
                  {item.description.replace(' (급진적 변형 O)', '')}
                </span>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>
    );
  };

  return (
    <>
      <LoginOutButton />
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-cyan-900 text-white/90 relative overflow-hidden">
        <Particles
          className="absolute inset-0"
          init={particlesInit}
          options={{
            background: {
              color: "transparent"
            },
            fpsLimit: 120,
            particles: {
              color: {
                value: ["#3498db", "#2980b9", "#8e44ad", "#2ecc71", "#16a085"]
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
                speed: 0.5,
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
                value: 100
              },
              opacity: {
                animation: {
                  enable: true,
                  minimumValue: 0.1,
                  speed: 1,
                  sync: false
                },
                random: true,
                value: { min: 0.1, max: 0.5 }
              },
              shape: {
                type: "circle"
              },
              size: {
                animation: {
                  enable: true,
                  minimumValue: 0.1,
                  speed: 2,
                  sync: false
                },
                random: true,
                value: { min: 1, max: 4 }
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
                  opacity: 0.8,
                  size: 6
                }
              }
            }
          }}
        />
        <div className="container mx-auto px-4 py-10 relative z-10 max-w-5xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">사진을 예술 작품으로</h1>
            <p className="text-sm text-gray-400">
              당신의 사진을 선택한 스타일의 예술 작품으로 변환합니다
            </p>
          </div>
        
          <div className="space-y-12">
            <div className="bg-blue-900/20 backdrop-blur-sm rounded-xl p-8 border border-blue-500/20 shadow-lg">
              <h3 className="text-xl font-medium text-white mb-4">STEP 1. 사진 업로드</h3>
              <div className="relative aspect-video w-full max-w-2xl mx-auto border-2 border-dashed border-white/20 rounded-lg overflow-hidden hover:border-white/40 transition-colors">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 10 * 1024 * 1024) {
                        alert('파일 크기는 10MB 이하여야 합니다.');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64String = reader.result as string;
                        setResult({ 
                          imageUrl: URL.createObjectURL(file),
                          base64Data: base64String
                        });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                {!result?.imageUrl ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60">
                    <ImageIcon className="w-16 h-16 mb-4" />
                    <p className="text-lg">클릭하여 사진 업로드</p>
                    <p className="text-sm mt-2">PNG, JPEG 형식 (10MB 이하)</p>
                    <p className="text-sm mt-1">또는 드래그 앤 드롭</p>
                  </div>
                ) : (
                  <Image
                    src={result.imageUrl}
                    alt="업로드된 사진"
                    fill
                    className="object-contain"
                  />
                )}
              </div>
            </div>

            <div className="bg-blue-900/20 backdrop-blur-sm rounded-xl p-8 border border-blue-500/20 shadow-lg">
              <SelectionGroup
                title="STEP 2. 예술 스타일 선택"
                items={ART_STYLES}
                value={style}
                onChange={setStyle}
              />
            </div>

            <div className="bg-blue-900/20 backdrop-blur-sm rounded-xl p-8 border border-blue-500/20 shadow-lg">
              <SelectionGroup
                title="STEP 3. 색채와 분위기 선택"
                items={COLOR_MOODS}
                value={colorMood}
                onChange={setColorMood}
              />
            </div>

            <div className="bg-blue-900/20 backdrop-blur-sm rounded-xl p-8 border border-blue-500/20 shadow-lg">
              <div className="flex justify-center">
                <Button
                  onClick={handleGenerate}
                  disabled={generating || !result?.base64Data || !style || !colorMood}
                  className="w-full md:w-auto text-lg px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600"
                >
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      변환 중...
                    </>
                  ) : (
                    '예술 작품으로 변환하기'
                  )}
                </Button>
              </div>
            </div>

            {result && (
              <div className="mt-8 space-y-4">
                {result.error ? (
                  <div className="text-red-500 text-center p-4 bg-black/30 rounded-lg">{result.error}</div>
                ) : result.imageUrl ? (
                  <div className="space-y-4">
                    <div className="relative aspect-square w-full max-w-xl mx-auto bg-black/30 rounded-lg overflow-hidden">
                      <div className="relative w-full h-full">
                        <Image
                          src={result.imageUrl}
                          alt="생성된 예술 작품"
                          fill
                          className="object-contain"
                          onLoadingComplete={(img) => {
                            // 이미 워터마크가 추가된 이미지면 건너뛰기
                            if (!result?.imageUrl || result.imageUrl.startsWith('data:image/jpeg;base64,')) return;
                            // 이미지가 로드되면 캔버스에 워터마크 추가
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            if (!ctx) return;

                            // 캔버스 크기 설정
                            canvas.width = img.naturalWidth;
                            canvas.height = img.naturalHeight;

                            // 원본 이미지 그리기
                            ctx.drawImage(img, 0, 0);

                            // 워터마크 설정
                            const padding = Math.max(canvas.width * 0.02, 20);
                            const fontSize = Math.max(canvas.width * 0.02, 16);
                            
                            // 로고 이미지 로드 및 크기 계산을 위한 변수 선언
                            let logoWidth = 0;
                            let logoHeight = 0;
                            const logoImg = new window.Image();
                            logoImg.onload = () => {
                              // 로고 크기 계산 (원본 비율 유지하면서 너비는 캔버스의 15%로 제한)
                              // 링크 텍스트 기준 크기 설정
                              const boxPadding = 10;
                              const cornerRadius = 12;
                              const desiredWidth = linkWidth + boxPadding * 3; // 텍스트보다 약간 더 넓게

                              // 로고 크기를 텍스트 폭에 맞춰 조정
                              const logoScale = desiredWidth / logoImg.width;
                              logoWidth = logoImg.width * logoScale;
                              logoHeight = logoImg.height * logoScale;
                              
                              // 통합된 배경 영역 계산
                              const bgWidth = Math.max(logoWidth, linkWidth) + boxPadding * 2;
                              const bgHeight = logoHeight + fontSize + boxPadding * 3.5; // 하단 패딩 약간 증가
                              const bgX = canvas.width - bgWidth - padding;
                              const bgY = canvas.height - bgHeight - padding;
                              
                              // 둥근 모서리 배경 그리기
                              ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                              ctx.beginPath();
                              ctx.moveTo(bgX + cornerRadius, bgY);
                              ctx.lineTo(bgX + bgWidth - cornerRadius, bgY);
                              ctx.quadraticCurveTo(bgX + bgWidth, bgY, bgX + bgWidth, bgY + cornerRadius);
                              ctx.lineTo(bgX + bgWidth, bgY + bgHeight - cornerRadius);
                              ctx.quadraticCurveTo(bgX + bgWidth, bgY + bgHeight, bgX + bgWidth - cornerRadius, bgY + bgHeight);
                              ctx.lineTo(bgX + cornerRadius, bgY + bgHeight);
                              ctx.quadraticCurveTo(bgX, bgY + bgHeight, bgX, bgY + bgHeight - cornerRadius);
                              ctx.lineTo(bgX, bgY + cornerRadius);
                              ctx.quadraticCurveTo(bgX, bgY, bgX + cornerRadius, bgY);
                              ctx.closePath();
                              ctx.fill();
                              
                              // 로고 이미지 그리기
                              // 로고와 텍스트를 수직 중앙 정렬
                              const topPadding = boxPadding * 1; // 로고 위 패딩 지정
                              const contentHeight = logoHeight + fontSize;
                              const startY = bgY + topPadding; // 상단에서 시작

                              // 로고 그리기
                              ctx.drawImage(
                                logoImg,
                                bgX + (bgWidth - logoWidth) / 2,
                                startY,
                                logoWidth,
                                logoHeight
                              );
                              
                              // 링크 텍스트 그리기
                              ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                              ctx.textAlign = 'center';
                              ctx.fillText(
                                linkText,
                                bgX + bgWidth / 2,
                                startY + logoHeight + fontSize
                              );

                              // 캔버스를 이미지로 변환하여 결과 업데이트
                              const watermarkedImageUrl = canvas.toDataURL('image/jpeg', 0.95);
                              setResult(prev => ({
                                ...prev,
                                imageUrl: watermarkedImageUrl
                              }));
                            };
                            logoImg.src = LOGO_URL;

                            // 링크 텍스트 설정
                            const linkText = '모두트리';
                            ctx.font = `bold ${fontSize}px Arial`;
                            const linkWidth = ctx.measureText(linkText).width;

                            // 캔버스를 이미지로 변환하여 결과 업데이트
                            const watermarkedImageUrl = canvas.toDataURL('image/jpeg', 0.95);
                            setResult(prev => ({
                              ...prev,
                              imageUrl: watermarkedImageUrl
                            }));
                          }}
                        />
                      </div>
                    </div>
                    {user && (
                      <div className="flex flex-col sm:flex-row justify-center gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setShowShareDialog(true)}
                          className="bg-black/30 hover:bg-black/50 w-full sm:w-auto"
                        >
                          공감 한 조각 (선택)
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            // TODO: 이미지 저장 로직 구현
                            if (!result?.imageUrl) return;
                            const link = document.createElement('a');
                            link.href = result.imageUrl;
                            link.download = '모두트리_아트.png';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="bg-black/30 hover:bg-black/50 w-full sm:w-auto"
                        >
                          저장하기
                        </Button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
              <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>공감 한 조각에 공유하기</DialogTitle>
                  <DialogDescription>
                    이 작품을 공유하고 싶은 카테고리를 선택해주세요.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                  {result?.imageUrl && (
                    <div className="mb-6">
                      <div className="relative aspect-square w-full rounded-lg overflow-hidden">
                        <Image
                          src={result.imageUrl}
                          alt="공유할 작품"
                          fill
                          className="object-contain"
                        />
                      </div>
                    </div>
                  )}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      작품 설명 (선택사항)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="작품에 대한 설명이나 느낌을 자유롭게 작성해주세요."
                      className="w-full min-h-[100px] p-3 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <Select
                      value={selectedCategory}
                      onValueChange={setSelectedCategory}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="카테고리 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleShare}
                      disabled={!selectedCategory}
                      className="flex-1 bg-violet-500 hover:bg-violet-600 text-white"
                    >
                      공유하기
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* 공유 완료 모달 */}
            <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
              <DialogContent className="sm:max-w-[400px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>작품이 공유되었습니다</DialogTitle>
                  <DialogDescription>
                    공유한 작품은 공감 한 조각 페이지에서 확인하실 수 있습니다.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4 space-y-4">
                  <p className="text-gray-600">
                    공감 한 조각 페이지에서 확인하시겠습니까?
                  </p>
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowSuccessModal(false)}
                    >
                      닫기
                    </Button>
                    <Button
                      className="bg-violet-500 hover:bg-violet-600 text-white"
                      onClick={() => {
                        console.log('Moving to likes page:', user?.uid);
                        setShowSuccessModal(false);
                        if (user?.uid) {
                          router.push(`/${user.uid}/likes`);
                        } else {
                          console.error('User ID not found');
                          alert('사용자 정보를 찾을 수 없습니다.');
                        }
                      }}
                    >
                      공감 한 조각으로 이동
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </main>
      <CollapsibleFooter />
    </>
  );
}