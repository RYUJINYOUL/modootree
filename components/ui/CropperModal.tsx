'use client'

import React, { useRef, useState, useEffect } from 'react'
import Cropper from 'react-cropper'
import 'cropperjs/dist/cropper.css'

// 타입 정의
import { ReactCropperElement } from 'react-cropper';

interface CropperInstance extends ReactCropperElement {
  cropper: Cropper;
}

type Props = {
  isOpen: boolean
  imageUrl: string
  onClose: () => void
  onSave: (croppedBlob: Blob) => Promise<void>
}

export default function CropperModal({ isOpen, imageUrl, onClose, onSave }: Props) {
  const cropperRef = useRef<CropperInstance>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (isOpen && imageUrl) {
      console.log('CropperModal opened with image:', imageUrl);
    }
  }, [isOpen, imageUrl]);

  if (!isOpen || !imageUrl) {
    console.log('CropperModal not showing:', { isOpen, hasImageUrl: !!imageUrl });
    return null;
  }

  const handleApply = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('크롭 적용 시작');
    
    // 타입 안전성을 위해 Cropper 인스턴스 체크
    const cropperInstance = cropperRef.current?.cropper;
    if (!cropperInstance) {
      console.error('Cropper instance not found');
      return;
    }

    setIsUploading(true);
    try {
      // 크롭 데이터 확인
      const cropData = cropperInstance.getData();
      console.log('크롭 데이터:', cropData);

      // 캔버스 생성
      console.log('캔버스 생성 시작');
      const canvas = cropperInstance.getCroppedCanvas({
        width: Math.min(cropData.width, 1200),    // 최대 너비 제한
        height: Math.min(cropData.height, 1200),  // 최대 높이 제한
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
        fillColor: '#fff'
      });

      if (!canvas) {
        throw new Error('캔버스 생성 실패');
      }
      console.log('캔버스 생성 완료:', {
        width: canvas.width,
        height: canvas.height
      });

      // Blob 생성
      console.log('Blob 생성 시작');
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              console.log('Blob 생성 성공:', {
                size: blob.size,
                type: blob.type
              });
              resolve(blob);
            } else {
              reject(new Error('Blob 생성 실패'));
            }
          },
          'image/jpeg',
          0.92  // 약간 낮춘 품질로 파일 크기 최적화
        );
      });

      // 결과 저장
      console.log('onSave 호출');
      await onSave(blob);
      console.log('크롭 완료');
    } catch (error) {
      console.error('크롭 처리 중 에러:', error);
      alert(error instanceof Error ? error.message : '이미지 처리 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center"
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="bg-gray-900 p-4 rounded-md shadow-md w-full max-w-2xl relative text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-2">
          이미지 자르기
        </h2>

        <Cropper
          src={imageUrl}
          style={{ height: 400, width: '100%' }}
          aspectRatio={1}
          guides={true}
          viewMode={1}
          ref={cropperRef}
          zoomable={true}
          cropBoxResizable={true}
          cropBoxMovable={true}
          autoCropArea={1}
          responsive={true}
          background={true}
          dragMode="crop"
          toggleDragModeOnDblclick={false}
          minCropBoxWidth={50}
          minCropBoxHeight={50}
          onInitialized={(instance) => {
            console.log('Cropper initialized:', instance);
          }}
          onError={(e) => {
            console.error('Cropper error:', e);
          }}
        />

        <div className="mt-4 flex justify-end gap-2">
          <button 
            onClick={onClose} 
            className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            취소
          </button>
          <button 
            onClick={handleApply} 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
          >
            적용
          </button>
        </div>

        {isUploading && (
          <div className="absolute inset-0 bg-gray-900/80 flex flex-col items-center justify-center text-sm z-10">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
            처리 중...
          </div>
        )}
      </div>
    </div>
  )
}