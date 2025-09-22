import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { X, UploadCloud, Loader2 } from 'lucide-react';
import { useUploadImage } from '@/hooks/useUploadImage';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'free';
  folder?: string;
  maxFileSizeMB?: number;
  maxWidth?: number;
  maxHeight?: number;
  targetFileSizeKB?: number;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  aspectRatio = 'free',
  folder = 'general',
  maxFileSizeMB = 2,
  maxWidth = 1600,
  maxHeight = 1600,
  targetFileSizeKB = 500,
}) => {
  const { loading, error, progress, uploadImage, deleteImage } = useUploadImage({
    maxFileSizeMB,
    maxWidth,
    maxHeight,
    targetFileSizeKB,
    folder,
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const uploadedUrl = await uploadImage(file);
    if (uploadedUrl) {
      onChange(uploadedUrl);
    }
  }, [uploadImage, onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.png', '.gif', '.webp', '.jpg'],
    },
    multiple: false,
  });

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (value) {
      await deleteImage(value);
      onChange(null);
    }
  };

  const aspectRatioClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]',
    free: 'h-48',
  };

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors",
          "border-gray-600 hover:border-blue-500 hover:bg-gray-800/30",
          isDragActive && "border-blue-500 bg-gray-800/50",
          aspectRatioClasses[aspectRatio]
        )}
      >
        <input {...getInputProps()} />
        {value && !loading ? (
          <>
            <img src={value} alt="Preview" className="absolute inset-0 w-full h-full object-cover rounded-lg" />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 z-10 rounded-full"
              onClick={handleDelete}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : loading ? (
          <div className="flex flex-col items-center text-blue-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="mt-2 text-sm">업로드 중 ({Math.round(progress)}%)</p>
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <UploadCloud className="mx-auto h-12 w-12" />
            <p className="mt-2 text-sm">
              {isDragActive ? '여기에 놓으세요...' : '파일을 드래그하거나 클릭하여 업로드'}
            </p>
            <p className="text-xs mt-1">최대 {maxFileSizeMB}MB, 권장 {targetFileSizeKB}KB</p>
          </div>
        )}
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
};

export default ImageUploader;