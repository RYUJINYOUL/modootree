import { useState, ChangeEvent } from 'react';
import { Dialog } from '@headlessui/react';
import { storage } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';

interface BackgroundSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { imageUrl: string }) => void;
}

export default function BackgroundSettings({ isOpen, onClose, onSave }: BackgroundSettingsProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('이미지 크기는 5MB 이하여야 합니다.');
      return;
    }

    // 파일 타입 체크
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setError('');

    // 프리뷰 생성
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setImageFile(file);
  };

  const handleSave = async () => {
    try {
      setIsUploading(true);
      setError('');

      if (!imageFile) {
        setError('이미지를 선택해주세요.');
        return;
      }

      // 이미지 업로드
      const imageRef = ref(storage, `backgrounds/${Date.now()}_image.jpg`);
      await uploadBytes(imageRef, imageFile);
      const imageUrl = await getDownloadURL(imageRef);

      onSave({ imageUrl });
      onClose();
    } catch (error) {
      console.error('업로드 실패:', error);
      setError('업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
      
      <Dialog.Panel className="bg-blue-900/90 p-8 rounded-2xl shadow-lg z-50 max-w-md w-full relative border border-blue-500/30 backdrop-blur-lg">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-blue-200 hover:text-white text-xl transition-colors"
          aria-label="닫기"
        >
          &times;
        </button>

        <h2 className="text-blue-100 text-xl font-bold mb-6 text-center">배경 이미지 설정</h2>

        <div className="space-y-6">
          {/* 파일 업로드 */}
          <div className="space-y-4">
            <label className="block">
              <div className="bg-blue-800/30 border-2 border-dashed border-blue-400/30 rounded-xl p-8 text-center cursor-pointer hover:bg-blue-800/40 transition-colors">
                <div className="text-blue-200 mb-2">
                  이미지 파일을 선택하세요
                </div>
                <div className="text-blue-300/70 text-sm">
                  (최대 5MB)
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </label>

            {/* 프리뷰 */}
            {previewUrl && (
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black/50">
                <Image
                  src={previewUrl}
                  alt="미리보기"
                  fill
                  className="object-contain"
                />
              </div>
            )}
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          {/* 저장 버튼 */}
          <button
            onClick={handleSave}
            disabled={isUploading || !imageFile}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            {isUploading ? '업로드 중...' : '저장'}
          </button>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
} 