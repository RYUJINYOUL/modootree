// components/EditButton.tsx
'use client';

import { Edit, Hand, Plus, Settings, Home, Mail, Bell, BellOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';

interface UserEditButtonProps {
  username: string;
  ownerUid: string;
  userEmail?: string;
}

interface Subscriber {
  email: string;
  subscribedAt: Date;
}

export default function UserEditButton({ username, ownerUid, userEmail }: UserEditButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSuggestionDialog, setShowSuggestionDialog] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { currentUser } = useSelector((state: any) => state.user);
  const [senderEmail, setSenderEmail] = useState('');
  const [subscribeDialogOpen, setSubscribeDialogOpen] = useState(false);
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // 구독 상태 확인
  useEffect(() => {
    if (!ownerUid) return;
    
    const checkSubscription = async () => {
      try {
        const subscribersRef = doc(db, 'users', ownerUid, 'settings', 'subscribers');
        const unsubscribe = onSnapshot(subscribersRef, (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            const emails = data.emails || [];
            // 현재 사용자의 이메일이 구독 목록에 있는지 확인
            setIsSubscribed(emails.includes(currentUser?.email));
          }
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('구독 상태 확인 실패:', error);
      }
    };

    checkSubscription();
  }, [ownerUid, currentUser?.email]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setSubscribeEmail(email);
    setIsEmailValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  };

  const handleSubscription = async () => {
    if (!isEmailValid) return;
    
    try {
      // 새로운 경로로 수정
      const subscribersRef = doc(db, 'users', ownerUid, 'settings', 'subscribers');
      
      // 현재 구독자 목록 확인
      const docSnap = await getDoc(subscribersRef);
      const currentEmails = docSnap.exists() ? docSnap.data().emails || [] : [];
      
      // 이미 구독 중인지 확인
      if (currentEmails.includes(subscribeEmail)) {
        alert('이미 구독 중인 이메일입니다.');
        return;
      }

      // 새 구독자 추가 (emails 배열 형태로 저장)
      await setDoc(subscribersRef, {
        emails: [...currentEmails, subscribeEmail],
        updatedAt: new Date()
      }, { merge: true });

      setSubscribeDialogOpen(false);
      setSubscribeEmail('');
      alert('구독이 완료되었습니다.');
    } catch (error) {
      console.error('구독 처리 중 오류:', error);
      alert('구독 처리 중 오류가 발생했습니다.');
    }
  };

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

          {/* 구독하기 버튼 - 본인이 아닐 때만 표시 */}
          {currentUser?.uid !== ownerUid && (
            <button
              onClick={() => {
                setSubscribeDialogOpen(true);
                setIsOpen(false);
              }}
              className="bg-white/30 backdrop-blur-sm text-white p-2.5 rounded-lg hover:bg-white/40 transition-all flex items-center justify-center"
              title={isSubscribed ? "구독 중" : "일정 알림 구독"}
            >
              {isSubscribed ? (
                <BellOff className="w-4 h-4 relative">
                  <line
                    x1="0"
                    y1="0"
                    x2="100%"
                    y2="100%"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="absolute"
                  />
                </BellOff>
              ) : (
                <Bell className="w-4 h-4" />
              )}
            </button>
          )}

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
            title="공감페이지"
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

      {/* 구독 다이얼로그 - 캘린더와 동일한 구현 */}
      <Dialog open={subscribeDialogOpen} onOpenChange={setSubscribeDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">알림 구독하기</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              새로운 일정이 등록되면 이메일로 알림을 받아보세요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-sm font-medium">
                  이메일 주소
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={subscribeEmail}
                  onChange={handleEmailChange}
                  className="w-full"
                />
              </div>
              <Button
                onClick={handleSubscription}
                disabled={!isEmailValid}
                className="w-full"
              >
                구독하기
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
