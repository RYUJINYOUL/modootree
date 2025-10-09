'use client';

import { useState } from 'react';
import { Send, Bot } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useRouter } from 'next/navigation';

type Button = {
  label: string;
  value: string;
  response?: string;
  buttons?: Button[];
  isLink?: boolean;
}

type Message = {
  role: 'ai' | 'user';
  content: string;
  buttons?: Button[];
}

interface Props {
  isMobile?: boolean;
  onClose?: () => void;
}

export default function AiChatBox({ isMobile, onClose }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<Message[]>([
    { 
      role: 'ai', 
      content: '안녕하세요! 모두트리에 오신 것을 환영합니다.\n어떤 서비스가 궁금하신가요?',
      buttons: [
        { 
          label: '사진예술작품', 
          value: '사진예술작품',
          response: '사진을 업로드하고 스타일과 색채를 선택하면\n사진을 예술 작품으로 변환해 드립니다.\n\n지브리, 픽사 3D, 코믹북, 심슨 등 20가지 이상의\n다양한 스타일을 제공합니다.',
          buttons: [
            { label: '사진예술작품', value: 'art-generation', isLink: true },
            { label: '열린게시판', value: 'inquiry', isLink: true }
          ]
        },
        { 
          label: 'AI건강기록', 
          value: 'AI건강기록',
          response: '하루의 식사와 운동을 기록하면 AI가 당신의\n건강 습관을 분석하고 통찰해 드립니다.\n\n영양 균형도, 식단 다양성, 건강관리 노력도를\n과학적으로 평가해 드립니다.',
          buttons: [
            { label: 'AI건강기록', value: 'health', isLink: true },
            { label: '열린게시판', value: 'inquiry', isLink: true }
          ]
        },
        { 
          label: 'AI사진투표', 
          value: 'AI사진투표',
          response: '사진을 업로드하면 AI가 사진을 분석하여\n재미있는 투표 주제를 만들어 드립니다.\n\n사진 속 주인공의 심리부터 다음 행동 예측까지\n다양한 스토리 투표로 소통해 보세요.',
          buttons: [
            { label: 'AI사진투표', value: 'photo-story', isLink: true },
            { label: '열린게시판', value: 'inquiry', isLink: true }
          ]
        },
        { 
          label: 'AI사연투표', 
          value: 'AI사연투표',
          response: '익명으로 사연을 작성하면 AI가 내용을 분석하여\n흥미로운 투표 주제를 만들어 드립니다.\n\n사용자들의 공감과 논쟁을 이끌어내는 투표로\n커뮤니티와 함께 이야기를 나눠보세요.',
          buttons: [
            { label: 'AI사연투표', value: 'modoo-ai', isLink: true },
            { label: '열린게시판', value: 'inquiry', isLink: true }
          ]
        },
        { 
          label: '공감한조각', 
          value: '공감한조각',
          response: '익명으로 일기를 작성하면 AI가 감정을 분석하여\n맞춤형 조언을 제공해 드립니다.\n\n다른 사람들의 공감과 응원을 통해 내 감정을\n객관적으로 돌아보고 성장할 수 있습니다.',
          buttons: [
            { label: '공감한조각', value: 'likes/all', isLink: true },
            { label: '열린게시판', value: 'inquiry', isLink: true }
          ]
        },
        { 
          label: '사이트만들기', 
          value: '사이트만들기',
          response: '다양한 템플릿과 컴포넌트를 활용하여 나만의\n특별한 프로필 페이지를 만들 수 있습니다.\n\n자유롭게 디자인을 커스터마이징하고 나만의\n개성있는 페이지를 완성해보세요.',
          buttons: [
            { label: '사이트만들기', value: 'site', isLink: true },
            { label: '열린게시판', value: 'inquiry', isLink: true }
          ]
        },
        { label: '모두트리AI', value: 'ai-comfort', isLink: true }
      ]
    }
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = message;
    setMessage('');

    // 사용자 메시지 추가
    setConversation(prev => [...prev, 
      { role: 'user', content: userMessage },
      { 
        role: 'ai', 
        content: '안녕하세요. 😊\n\n사용 문의 및 개선 수정 사항은 아래\n열린게시판 버튼 클릭 문의 주세요.\n\n모두트리의 AI 상담 기능은\n로고 아래 감정 로고를 클릭해 보세요.\n\n편한 친구 모두트리 AI',
        buttons: [
          { label: '모두트리AI', value: 'ai-comfort', isLink: true },
          { label: '열린게시판', value: 'inquiry', isLink: true },
        ]
      }
    ]);
  };

  return (
    <div
      className={cn(
        "w-full max-w-4xl mx-auto bg-gray-900/30 backdrop-blur-lg rounded-2xl border border-blue-500/20 overflow-hidden shadow-xl hover:bg-gray-900/40 transition-all",
        isMobile && "fixed inset-0 z-50 m-0 rounded-none"
      )}
    >
      {isMobile && (
        <div className="absolute top-4 right-4">
          <button
            onClick={onClose}
            className="bg-gray-800/50 hover:bg-gray-800/70 text-white/90 rounded-full p-2 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div
        className={cn(
          "overflow-y-auto p-4 space-y-4",
          isMobile ? "h-[calc(100vh-180px)]" : "h-48"
        )}
      >
        {conversation.map((msg, idx) => (
          <div
            key={idx}
            className={cn(
              "flex items-start gap-2",
              msg.role === 'user' && "flex-row-reverse"
            )}
          >
            {msg.role === 'ai' && (
              <Bot className="w-6 h-6 text-blue-500 mt-1" />
            )}
            <div
              className={cn(
                "px-4 py-2 rounded-lg",
                msg.role === 'user'
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-white/90"
              )}
            >
              {msg.content.split('\n').map((line, i) => (
                <div key={i} className={line === '' ? 'h-4' : ''}>{line}</div>
              ))}
              {msg.buttons && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {msg.buttons.map((button, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (button.isLink) {
                          router.push(`/${button.value}`);
                          if (onClose) onClose();
                        } else {
                          // 사용자 메시지 추가
                          setConversation(prev => [...prev, { role: 'user', content: button.value }]);
                          // 바로 AI 응답 추가
                          if (button.response) {
                            setConversation(prev => [...prev, { 
                              role: 'ai', 
                              content: button.response!,
                              buttons: button.buttons || undefined
                            }]);
                          }
                        }
                      }}
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm text-white/90 transition-colors",
                        button.value === 'ai-comfort' 
                          ? "bg-green-600/20 hover:bg-green-600/30"
                          : "bg-blue-600/20 hover:bg-blue-600/30"
                      )}
                    >
                      {button.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className={cn(
        "border-t border-blue-500/20 p-4",
        isMobile && "fixed bottom-[4.5rem] left-0 right-0 bg-gray-900/30 backdrop-blur-lg"
      )}>
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}