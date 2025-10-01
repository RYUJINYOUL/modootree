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
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { Loader2, ImageIcon } from 'lucide-react';

const EMOTIONS = [
  { id: 'peaceful', label: '평온함', description: '차분하고 안정된 감정' },
  { id: 'happy', label: '행복', description: '기쁘고 즐거운 감정' },
  { id: 'sad', label: '슬픔', description: '우울하고 슬픈 감정' },
  { id: 'hope', label: '희망', description: '밝은 미래를 향한 감정' },
  { id: 'inner', label: '내면', description: '깊이 있는 자아 탐구' }
];

const ART_STYLES = [
  { 
    id: 'oil', 
    label: '유화 필터', 
    description: '두꺼운 붓 터치와 풍부한 질감으로 깊이 있는 감성 표현' 
  },
  { 
    id: 'watercolor', 
    label: '수채화 필터', 
    description: '맑고 투명한 붓놀림으로 섬세한 감정을 담아내는 표현' 
  },
  { 
    id: 'impressionism', 
    label: '인상주의 (모네)', 
    description: '빛과 색채의 순간적인 인상을 포착한 모네 스타일' 
  },
  { 
    id: 'post_impressionism', 
    label: '후기 인상주의 (고흐)', 
    description: '강렬한 색채와 소용돌이치는 붓터치의 고흐 스타일' 
  },
  { 
    id: 'cubism', 
    label: '입체파 (피카소)', 
    description: '다중 시점과 기하학적 형태로 재해석하는 피카소 스타일' 
  },
  { 
    id: 'pop_art', 
    label: '팝 아트 (워홀)', 
    description: '대중문화적 요소와 강렬한 색상의 앤디 워홀 스타일' 
  },
  { 
    id: 'glitch', 
    label: '글리치 아트', 
    description: '디지털 노이즈와 왜곡 효과를 활용한 현대적 표현' 
  },
  { 
    id: 'minimalism', 
    label: '미니멀리즘', 
    description: '단순한 형태와 제한된 색상으로 본질을 표현' 
  }
];

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
  
  // 모든 state hooks를 최상단으로 이동
  const [style, setStyle] = useState('');
  const [colorMood, setColorMood] = useState('');
  const [generating, setGenerating] = useState(false);
  interface GenerationResult {
    imageUrl?: string;
    error?: string;
    base64Data?: string;  // base64 이미지 데이터
  }

  const [result, setResult] = useState<GenerationResult | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);

  useEffect(() => {
    // 로딩이 완료되고 사용자가 없을 때만 리다이렉트
    if (!loading && user === null) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // 로딩 중이면 로딩 표시
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

  // 사용자가 없으면 아무것도 렌더링하지 않음 (리다이렉트 처리 중)
  if (!user) {
    return null;
  }

  const handleGenerate = async () => {
    if (!style || !colorMood || !result?.base64Data) {
      alert('모든 옵션을 선택하고 이미지를 업로드해주세요.');
      return;
    }

    setGenerating(true);
    setResult(null);

    try {
      const token = user ? await user.getIdToken(true) : null;  // true를 전달하여 토큰 강제 새로고침
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

      setResult({ imageUrl: data.imageUrl });
      
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' });
    } finally {
      setGenerating(false);
    }
  };

  const SelectionGroup = ({ title, items, value, onChange }: any) => (
    <div className="space-y-4">
      <h3 className="text-xl font-medium text-white mb-4">{title}</h3>
      <RadioGroup value={value} onValueChange={onChange} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item: any) => (
          <div key={item.id} className="relative" onClick={() => onChange(item.id)}>
            <div
              className={`flex flex-col p-6 border-2 rounded-lg cursor-pointer
                border-white/20 text-white
                ${value === item.id ? 'border-blue-500 bg-blue-500/30 shadow-[inset_0_0_20px_rgba(59,130,246,0.3)]' : ''}
                hover:bg-white/5 transition-all duration-300`}
            >
              <span className="text-lg font-medium mb-2">{item.label}</span>
              <span className="text-base text-gray-300">{item.description}</span>
            </div>
          </div>
        ))}
      </RadioGroup>
    </div>
  );

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
      
      <Card className="p-6 space-y-8 bg-white/5 backdrop-blur-sm border-white/20 text-white">
        <div className="space-y-4">
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
                  // 이미지를 base64로 변환
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const base64String = reader.result as string;
                    // base64 문자열 전체를 저장 (prefix 포함)
                    setResult({ 
                      imageUrl: URL.createObjectURL(file),
                      base64Data: base64String  // 전체 base64 문자열 저장
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

        <SelectionGroup
          title="STEP 2. 예술 스타일 선택"
          items={ART_STYLES}
          value={style}
          onChange={setStyle}
        />

        <SelectionGroup
          title="STEP 3. 색채와 분위기 선택"
          items={COLOR_MOODS}
          value={colorMood}
          onChange={setColorMood}
        />

        <div className="flex justify-center pt-4">
          <Button
            onClick={handleGenerate}
            disabled={generating || !result?.imageUrl || !style || !colorMood}
            className="w-full md:w-auto text-base px-6 py-2.5"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                변환 중...
              </>
            ) : (
              '예술 작품으로 변환하기'
            )}
          </Button>
        </div>
      </Card>

      {result && (
        <Card className="mt-8 p-6 bg-white/5 backdrop-blur-sm border-white/20 text-white">
          {result.error ? (
            <div className="text-red-500 text-center">{result.error}</div>
          ) : result.imageUrl ? (
            <div className="space-y-4">
              <div className="relative aspect-square w-full max-w-xl mx-auto">
                <Image
                  src={result.imageUrl}
                  alt="생성된 예술 작품"
                  fill
                  className="object-contain"
                />
              </div>
              {user && (
                <div className="flex justify-center gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowShareDialog(true)}
                  >
                    공감 한 조각에 공유하기
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </Card>
      )}

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>작품을 공유하시겠습니까?</DialogTitle>
            <DialogDescription>
              공유된 작품은 '공감 한 조각' 커뮤니티에서 익명으로 공개됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              취소
            </Button>
            <Button
              onClick={async () => {
                // TODO: Implement share functionality
                setShowShareDialog(false);
              }}
            >
              공유하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </main>
    <CollapsibleFooter />
    </>
  );
}
