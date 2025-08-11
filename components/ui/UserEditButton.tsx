// components/EditButton.tsx
'use client';

import { Edit, Hand, Plus, Settings, Home, Mail } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface UserEditButtonProps {
  username: string;
  ownerUid: string;
  userEmail?: string;
}

export default function UserEditButton({ username, ownerUid, userEmail }: UserEditButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSuggestionDialog, setShowSuggestionDialog] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { currentUser } = useSelector((state: any) => state.user);
  const [senderEmail, setSenderEmail] = useState('');

  const handleSendSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim() || !userEmail || !senderEmail) return;

    setIsSending(true);
    try {
      const response = await fetch('/api/send-suggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toEmail: userEmail,
          toName: username,
          suggestion: suggestion.trim(),
          senderEmail: senderEmail.trim()  // 방문자 이메일 추가
        }),
      });

      if (!response.ok) throw new Error('전송 실패');

      alert('제안이 성공적으로 전송되었습니다!');
      setShowSuggestionDialog(false);
      setSuggestion('');
      setSenderEmail('');  // 폼 초기화에 이메일도 포함
    } catch (error) {
      alert('제안 전송에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50">
      <div className="relative">
        {/* 서브 버튼들 */}
        <div className={`absolute right-full mr-2 flex gap-1 transition-all duration-200 ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}`}>
          <Link
            href="/"
            className="bg-white/30 backdrop-blur-sm text-white p-2.5 rounded-lg hover:bg-white/40 transition-all flex items-center justify-center"
            onClick={() => setIsOpen(false)}
            title="홈으로"
          >
            <Home className="w-4 h-4" />
          </Link>

          {/* 제안하기 버튼 */}
          {userEmail && (
            <button
              onClick={() => {
                setShowSuggestionDialog(true);
                setIsOpen(false);
              }}
              className="bg-white/30 backdrop-blur-sm text-white p-2.5 rounded-lg hover:bg-white/40 transition-all flex items-center justify-center"
              title="제안하기"
            >
              <Mail className="w-4 h-4" />
            </button>
          )}

          {currentUser?.uid === ownerUid && (
            <>
              <Link
                href={`/editor/${username}`}
                className="bg-white/30 backdrop-blur-sm text-white p-2.5 rounded-lg hover:bg-white/40 transition-all flex items-center justify-center"
                onClick={() => setIsOpen(false)}
                title="편집하기"
              >
                <Edit className="w-4 h-4" />
              </Link>

              <Link
                href="/backgrounds"
                className="bg-white/30 backdrop-blur-sm text-white p-2.5 rounded-lg hover:bg-white/40 transition-all flex items-center justify-center"
                onClick={() => setIsOpen(false)}
                title="배경설정"
              >
                <Settings className="w-4 h-4" />
              </Link>
            </>
          )}

          <Link
            href="/likes/all"
            className="bg-white/30 backdrop-blur-sm text-white p-2.5 rounded-lg hover:bg-white/40 transition-all flex items-center justify-center"
            onClick={() => setIsOpen(false)}
            title="좋아요"
          >
            <Hand className="w-4 h-4" />
          </Link>
        </div>

        {/* 메인 토글 버튼 */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`bg-blue-500/70 backdrop-blur-sm text-white p-2.5 rounded-l-lg hover:bg-blue-600/80 transition-all ${isOpen ? 'rotate-45' : ''}`}
          title="메뉴 열기"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* 제안하기 다이얼로그 */}
      <Dialog open={showSuggestionDialog} onOpenChange={setShowSuggestionDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{username}님에게 제안하기</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSendSuggestion} className="space-y-4">
            <div className="space-y-2">
              <Label>보내는 사람 이메일</Label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="회신 이메일 주소를 입력해주세요"
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>제안 내용</Label>
              <Textarea
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                placeholder="제안 내용(공구, 광고, 기타)을 작성해주세요..."
                className="min-h-[150px]"
                disabled={isSending}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={isSending || !suggestion.trim() || !senderEmail.trim()}
              >
                {isSending ? '전송 중...' : '제안하기'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
