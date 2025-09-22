import { useState, useCallback } from 'react';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useSelector } from 'react-redux';

interface ImageUploadOptions {
  maxFileSizeMB?: number;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  targetFileSizeKB?: number;
  folder?: string;
}

const resizeImage = (file: File, options: ImageUploadOptions): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        let width = img.width;
        let height = img.height;

        // Calculate new dimensions to fit within maxWidth/maxHeight while maintaining aspect ratio
        if (options.maxWidth && width > options.maxWidth) {
          height *= options.maxWidth / width;
          width = options.maxWidth;
        }
        if (options.maxHeight && height > options.maxHeight) {
          width *= options.maxHeight / height;
          height = options.maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        ctx?.drawImage(img, 0, 0, width, height);

        // Try to achieve target file size by adjusting quality
        let currentQuality = options.quality || 0.8;
        const targetFileSize = (options.targetFileSizeKB || 500) * 1024;

        const compress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to create blob from canvas.'));
                return;
              }

              if (blob.size > targetFileSize && currentQuality > 0.1) {
                currentQuality -= 0.1;
                compress();
              } else {
                resolve(blob);
              }
            },
            'image/jpeg',
            currentQuality
          );
        };
        compress();
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const useUploadImage = (options?: ImageUploadOptions) => {
  const currentUser = useSelector((state: any) => state.user.currentUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const uploadImage = useCallback(async (file: File) => {
    if (!currentUser?.uid) {
      setError('로그인이 필요합니다.');
      return null;
    }

    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      // Validate file size before resizing
      const maxFileSize = (options?.maxFileSizeMB || 2) * 1024 * 1024;
      if (file.size > maxFileSize) {
        throw new Error(`파일 크기가 ${options?.maxFileSizeMB || 2}MB를 초과합니다.`);
      }

      const resizedBlob = await resizeImage(file, options || {});
      const storage = getStorage();
      const folder = options?.folder || 'uploads';
      const storageRef = ref(storage, `${folder}/${currentUser.uid}/${Date.now()}_${file.name}`);

      setProgress(30);
      await uploadBytes(storageRef, resizedBlob);
      setProgress(70);

      const downloadURL = await getDownloadURL(storageRef);
      setProgress(100);
      return downloadURL;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid, options]);

  const deleteImage = useCallback(async (urlToDelete: string) => {
    if (!urlToDelete) return;
    setLoading(true);
    setError(null);
    try {
      const storage = getStorage();
      const imageRef = ref(storage, urlToDelete);
      await deleteObject(imageRef);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, progress, uploadImage, deleteImage };
};