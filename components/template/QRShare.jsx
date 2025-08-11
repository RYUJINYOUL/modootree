'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Share, Copy, Download } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';

const QRShare = ({ userId, username }) => {
  // 현재 도메인 가져오기
  const getPageUrl = () => {
    if (typeof window !== 'undefined') {
      const baseUrl = window.location.origin;
      return `${baseUrl}/user/${userId}`;
    }
    return '';
  };

  // QR 코드 이미지 다운로드
  const handleDownload = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${username || userId}_qr.png`;
      link.href = url;
      link.click();
    }
  };

  // 링크 복사
  const handleCopyLink = () => {
    const pageUrl = getPageUrl();
    navigator.clipboard.writeText(pageUrl);
    alert('링크가 복사되었습니다!');
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share className="w-4 h-4" />
          QR 공유
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>QR 코드로 공유하기</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 p-4">
          <div className="bg-white p-4 rounded-xl">
            <QRCodeSVG
              value={getPageUrl()}
              size={200}
              level="H"
              includeMargin
              imageSettings={{
                src: "/logo.png",  // 로고 이미지가 있다면 경로 수정
                height: 24,
                width: 24,
                excavate: true,
              }}
            />
          </div>
          <p className="text-sm text-center text-gray-500">
            QR 코드를 스캔하여 {username || userId}님의 페이지를 방문할 수 있습니다.
          </p>
          <div className="flex gap-2 w-full">
            <Button 
              variant="outline" 
              className="flex-1 gap-2"
              onClick={handleCopyLink}
            >
              <Copy className="w-4 h-4" />
              링크 복사
            </Button>
            <Button 
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4" />
              QR 저장
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRShare; 