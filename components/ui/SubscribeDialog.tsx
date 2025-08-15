import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SubscribeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubscribe: (email: string) => Promise<void>;
  title?: string;
  description?: string;
}

export function SubscribeDialog({
  open,
  onOpenChange,
  onSubscribe,
  title = "알림 구독하기",
  description = "새로운 소식을 이메일로 받아보세요."
}: SubscribeDialogProps) {
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [isEmailValid, setIsEmailValid] = useState(false);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setSubscribeEmail(email);
    setIsEmailValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  };

  const handleSubscription = async () => {
    if (!isEmailValid) return;
    
    try {
      await onSubscribe(subscribeEmail);
      setSubscribeEmail('');
      onOpenChange(false);
    } catch (error) {
      console.error('구독 처리 중 오류:', error);
      alert('구독 처리 중 오류가 발생했습니다.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {description}
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
  );
} 