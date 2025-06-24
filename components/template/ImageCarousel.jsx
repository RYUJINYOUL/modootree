'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import app from '@/firebase';
import { Button } from '@/components/ui/button';
import { useSelector } from 'react-redux';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Plus, X, Edit2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const db = getFirestore(app);
const storage = getStorage(app);

const ImageCarousel = ({ username, uid }) => {
  const pathname = usePathname();
  const isEditable = pathname.startsWith('/editor');
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [editingCaption, setEditingCaption] = useState(false);
  const [caption, setCaption] = useState('');
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const { currentUser } = useSelector((state) => state.user);
  const finalUid = uid ?? currentUser?.uid;
  const userRole = currentUser?.uid;
  const canEdit = isEditable ? finalUid : userRole === uid;

  useEffect(() => {
    if (!finalUid) return;

    const q = query(
      collection(db, 'users', finalUid, 'carousel'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const imageList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setImages(imageList);
    });

    return () => unsubscribe();
  }, [finalUid]);

  const handlePrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  // 이미지 크롭을 위한 캔버스 업데이트 함수
  const updateCanvasPreview = (crop, completedCrop, imgRef, previewCanvasRef) => {
    if (!completedCrop || !previewCanvasRef.current || !imgRef.current) return;

    const image = imgRef.current;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );
  };

  useEffect(() => {
    if (completedCrop) {
      updateCanvasPreview(crop, completedCrop, imgRef, previewCanvasRef);
    }
  }, [completedCrop]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !canEdit) return;

    if (images.length >= 10) {
      alert('최대 10장까지만 업로드할 수 있습니다.');
      return;
    }

    // 파일 크기 체크 (10MB 제한)
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB를 초과할 수 없습니다.');
      return;
    }

    // 파일 타입 체크
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result);
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async () => {
    if (!completedCrop || !previewCanvasRef.current) return;

    try {
      setUploading(true);

      // 캔버스를 Blob으로 변환
      const canvas = previewCanvasRef.current;
      const blob = await new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95);
      });

      if (!blob) throw new Error('캔버스를 이미지로 변환하는데 실패했습니다.');

      // 파일명 생성
      const fileName = selectedFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const storageRef = ref(storage, `carousel/${finalUid}/${Date.now()}_${fileName}`);

      // Storage에 업로드
      const snapshot = await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(snapshot.ref);

      // Firestore에 문서 추가
      await addDoc(collection(db, 'users', finalUid, 'carousel'), {
        url,
        caption: '',
        createdAt: new Date(),
        storagePath: snapshot.ref.fullPath,
      });

      // 상태 초기화
      setIsCropping(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setCrop(undefined);
      setCompletedCrop(null);
      setUploading(false);
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      alert('이미지 업로드에 실패했습니다. 다시 시도해주세요.');
      setUploading(false);
    }
  };

  const handleDelete = async (image) => {
    if (!canEdit) return;
    if (!window.confirm('이미지를 삭제하시겠습니까?')) return;

    try {
      // Firestore에서 문서 삭제
      await deleteDoc(doc(db, 'users', finalUid, 'carousel', image.id));
      
      // Storage에서 이미지 파일 삭제
      const imageRef = ref(storage, image.storagePath);
      await deleteObject(imageRef);

      // 현재 인덱스 조정
      if (currentIndex >= images.length - 1) {
        setCurrentIndex(Math.max(0, images.length - 2));
      }
    } catch (error) {
      console.error('이미지 삭제 실패:', error);
      alert('이미지 삭제에 실패했습니다.');
    }
  };

  const handleImageClick = (image) => {
    setSelectedImage(image);
    setCaption(image.caption || '');
    setModalOpen(true);
  };

  const handleCaptionSave = async () => {
    if (!selectedImage || !canEdit) return;

    try {
      const imageRef = doc(db, 'users', finalUid, 'carousel', selectedImage.id);
      await updateDoc(imageRef, {
        caption: caption,
      });
      setEditingCaption(false);
    } catch (error) {
      console.error('캡션 수정 실패:', error);
      alert('캡션 수정에 실패했습니다.');
    }
  };

  return (
    <div className="w-full max-w-[1000px] mx-auto p-4 space-y-4">
      {/* 메인 캐러셀 */}
      <div className="relative bg-gray-100 rounded-2xl overflow-hidden shadow-lg">
        {images.length > 0 ? (
          <div className="relative">
            <div className="w-full relative aspect-[16/9]">
              <Image
                src={images[currentIndex].url}
                alt={images[currentIndex].caption || '메인 이미지'}
                fill
                className="object-cover"
                onClick={() => handleImageClick(images[currentIndex])}
              />
              {images[currentIndex].caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2">
                  <p className="text-center text-sm truncate">{images[currentIndex].caption}</p>
                </div>
              )}
            </div>

            {/* 이전/다음 버튼 */}
            <button
              onClick={handlePrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* 인디케이터 */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === currentIndex
                      ? 'bg-white scale-125'
                      : 'bg-white/50 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="aspect-[16/9] flex items-center justify-center bg-gray-100 text-gray-400">
            이미지가 없습니다
          </div>
        )}
      </div>

      {/* 썸네일 목록 */}
      <div className="hidden md:flex gap-2 overflow-x-auto py-1">
        {images.map((image, idx) => (
          <div key={image.id} className="relative group">
            <button
              onClick={() => setCurrentIndex(idx)}
              className={`relative w-16 h-9 flex-shrink-0 rounded-lg overflow-hidden ${
                idx === currentIndex ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <Image
                src={image.url}
                alt={image.caption || `썸네일 ${idx + 1}`}
                fill
                className="object-cover"
              />
            </button>
            {canEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(image);
                }}
                className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 이미지 업로드 버튼 */}
      {canEdit && (
        <div className="flex justify-center pt-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="imageUpload"
            disabled={uploading}
          />
          <Button
            onClick={() => document.getElementById('imageUpload').click()}
            disabled={uploading}
            size="sm"
            className="cursor-pointer"
          >
            {uploading ? (
              '업로드 중...'
            ) : (
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                이미지 업로드
              </div>
            )}
          </Button>
        </div>
      )}

      {/* 이미지 상세 모달 */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>이미지 상세</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4">
              <div className="relative aspect-[16/9] w-full">
                <Image
                  src={selectedImage.url}
                  alt={selectedImage.caption || '상세 이미지'}
                  fill
                  className="object-contain"
                />
              </div>
              {canEdit ? (
                <div className="flex items-center gap-2">
                  {editingCaption ? (
                    <>
                      <input
                        type="text"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg"
                        placeholder="캡션을 입력하세요"
                      />
                      <Button onClick={handleCaptionSave}>저장</Button>
                      <Button
                        variant="outline"
                        onClick={() => setEditingCaption(false)}
                      >
                        취소
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="flex-1 text-gray-600">
                        {selectedImage.caption || '캡션 없음'}
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setEditingCaption(true)}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        캡션 수정
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          handleDelete(selectedImage);
                          setModalOpen(false);
                        }}
                      >
                        <X className="w-4 h-4 mr-2" />
                        삭제
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-gray-600">
                  {selectedImage.caption || '캡션 없음'}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 크롭 모달 */}
      <Dialog open={isCropping} onOpenChange={(open) => !open && setIsCropping(false)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>이미지 자르기</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {previewUrl && (
              <div className="relative max-h-[60vh] overflow-auto">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={16/9}
                >
                  <img
                    ref={imgRef}
                    src={previewUrl}
                    alt="크롭할 이미지"
                    className="max-w-full"
                  />
                </ReactCrop>
              </div>
            )}
            <canvas
              ref={previewCanvasRef}
              className="hidden"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCropping(false);
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
              >
                취소
              </Button>
              <Button
                onClick={handleCropComplete}
                disabled={!completedCrop?.width || !completedCrop?.height}
              >
                {uploading ? '업로드 중...' : '적용'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImageCarousel; 