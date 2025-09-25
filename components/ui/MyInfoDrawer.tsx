'use client';

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "./drawer";
import { Bell } from 'lucide-react';

interface MyInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  ownerUid: string;
  ownerUsername: string;
}

export default function MyInfoDrawer({ isOpen, onClose }: MyInfoDrawerProps) {
  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="bg-black/70 border-t border-white/20">
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle className="text-2xl font-bold text-center text-white">알림</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Bell className="w-12 h-12 text-white/20 mb-4" />
            <p className="text-white/60 text-center">
              알림 기능은 현재 준비 중입니다.<br />
              조금만 기다려주세요.
            </p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}