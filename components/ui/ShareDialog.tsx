import { useState } from 'react';

declare global {
  interface Window {
    Kakao?: {
      init: (key: string) => Promise<void>;
      isInitialized: () => boolean;
      Share: {
        sendDefault: (options: {
          objectType: string;
          content: {
            title: string;
            description: string;
            imageUrl?: string;
            link: {
              mobileWebUrl: string;
              webUrl: string;
            };
          };
          buttons: Array<{
            title: string;
            link: {
              mobileWebUrl: string;
              webUrl: string;
            };
          }>;
        }) => Promise<void>;
      };
    };
  }
}
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { testService } from '@/lib/test-service';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: {
    id: string;
    title: string;
    description: string;
    imageUrl?: string;
    url: string;
  };
}

export function ShareDialog({ open, onOpenChange, data }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  // 카카오톡 공유
  const handleKakaoShare = async () => {
    if (!window.Kakao?.isInitialized()) {
      console.log('카카오 SDK 초기화 시도');
      await window.Kakao?.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY);
    }

    if (!window.Kakao?.Share) {
      alert('카카오톡 공유 기능을 사용할 수 없습니다.');
      return;
    }

    try {
      setSharing(true);
      await window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: data.title,
          description: data.description,
          imageUrl: data.imageUrl,
          link: {
            mobileWebUrl: data.url,
            webUrl: data.url
          }
        },
        buttons: [
          {
            title: '테스트 하러가기',
            link: {
              mobileWebUrl: data.url,
              webUrl: data.url
            }
          }
        ]
      });

      // 공유 수 증가
      await testService.incrementShareCount(data.id);
      onOpenChange(false);
    } catch (error) {
      console.error('카카오톡 공유 실패:', error);
      alert('카카오톡 공유에 실패했습니다.');
    } finally {
      setSharing(false);
    }
  };

  // 클립보드 복사
  const handleCopy = async () => {
    try {
      const shareText = [
        data.title,
        '',
        data.description,
        '',
        `테스트 하러가기: ${data.url}`
      ].join('\n');

      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      
      // 공유 수 증가
      await testService.incrementShareCount(data.id);
      
      setTimeout(() => {
        setCopied(false);
        onOpenChange(false);
      }, 1500);
    } catch (error) {
      console.error('클립보드 복사 실패:', error);
      alert('클립보드 복사에 실패했습니다.');
    }
  };

  // 네이티브 공유
  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: data.title,
        text: data.description,
        url: data.url
      });
      
      // 공유 수 증가
      await testService.incrementShareCount(data.id);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('공유 실패:', error);
        alert('공유에 실패했습니다.');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>공유하기</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {/* 미리보기 */}
          <div className="bg-gray-100 p-4 rounded-lg mb-6">
            <div className="flex items-start gap-3">
              {data.imageUrl && (
                <div className="w-20 h-20 flex-shrink-0">
                  <img
                    src={data.imageUrl}
                    alt={data.title}
                    className="w-full h-full object-cover rounded"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">
                  {data.title}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {data.description}
                </p>
              </div>
            </div>
          </div>

          {/* 공유 버튼 */}
          <div className="space-y-3">
            {/* 카카오톡 공유 */}
            <Button
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black h-11"
              onClick={handleKakaoShare}
              disabled={sharing}
            >
              {sharing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>공유 중...</span>
                </div>
              ) : (
                <>
                  <img
                    src="/Image/sns/kakaotalk.png"
                    alt="카카오톡"
                    className="w-5 h-5 mr-2"
                  />
                  카카오톡 공유
                </>
              )}
            </Button>

            {/* 클립보드 복사 */}
            <Button
              className="w-full bg-blue-500 hover:bg-blue-600 h-11"
              onClick={handleCopy}
            >
              {copied ? '복사 완료!' : '링크 복사'}
            </Button>

            {/* 네이티브 공유 (모바일) */}
            {'share' in navigator && (
              <Button
                className="w-full bg-gray-500 hover:bg-gray-600 h-11"
                onClick={handleNativeShare}
              >
                다른 앱으로 공유
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}




