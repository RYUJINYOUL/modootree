'use client';

import React, { useState, useEffect } from 'react';
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !canEdit) return;

    if (images.length >= 10) {
      alert('최대 10장까지만 업로드할 수 있습니다.');
      return;
    }

    try {
      setUploading(true);
      const storageRef = ref(storage, `carousel/${finalUid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'users', finalUid, 'carousel'), {
        url,
        caption: '',
        createdAt: new Date().toISOString(),
        storagePath: storageRef.fullPath,
      });

      setUploading(false);
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      alert('이미지 업로드에 실패했습니다.');
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
    <div className="w-full max-w-[1000px] mx-auto p-4 space-y-6">
      {/* 메인 캐러셀 */}
      <div className="relative bg-gray-100 rounded-3xl overflow-hidden shadow-xl">
        {images.length > 0 ? (
          <div className="flex flex-col md:flex-row gap-4 md:gap-2">
            {/* 모바일: 1장 / PC: 3장 */}
            <div className="w-full md:w-1/3 relative aspect-[4/3]">
              <Image
                src={images[currentIndex].url}
                alt={images[currentIndex].caption || '메인 이미지'}
                fill
                className="object-cover"
                onClick={() => handleImageClick(images[currentIndex])}
              />
              {images[currentIndex].caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4">
                  <p className="text-center text-sm truncate">{images[currentIndex].caption}</p>
                </div>
              )}
            </div>
            
            {/* PC에서만 보이는 추가 이미지 2장 */}
            <div className="hidden md:flex w-2/3 gap-2">
              <div className="w-1/2 relative aspect-[4/3]">
                <Image
                  src={images[(currentIndex + 1) % images.length]?.url || images[currentIndex].url}
                  alt="추가 이미지 1"
                  fill
                  className="object-cover"
                  onClick={() => {
                    const nextIndex = (currentIndex + 1) % images.length;
                    setCurrentIndex(nextIndex);
                    handleImageClick(images[nextIndex]);
                  }}
                />
                {images[(currentIndex + 1) % images.length]?.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4">
                    <p className="text-center text-sm truncate">
                      {images[(currentIndex + 1) % images.length].caption}
                    </p>
                  </div>
                )}
              </div>
              <div className="w-1/2 relative aspect-[4/3]">
                <Image
                  src={images[(currentIndex + 2) % images.length]?.url || images[currentIndex].url}
                  alt="추가 이미지 2"
                  fill
                  className="object-cover"
                  onClick={() => {
                    const nextIndex = (currentIndex + 2) % images.length;
                    setCurrentIndex(nextIndex);
                    handleImageClick(images[nextIndex]);
                  }}
                />
                {images[(currentIndex + 2) % images.length]?.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4">
                    <p className="text-center text-sm truncate">
                      {images[(currentIndex + 2) % images.length].caption}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 이전/다음 버튼 - 모바일에서만 표시 */}
            <div className="md:hidden">
              <button
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* 인디케이터 - 모바일에서만 표시 */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 md:hidden">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentIndex
                      ? 'bg-white scale-125'
                      : 'bg-white/50 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="aspect-[4/3] flex items-center justify-center text-gray-400">
            등록된 이미지가 없습니다.
          </div>
        )}
      </div>

      {/* 썸네일 목록 */}
      <div className="overflow-x-auto">
        <div className="flex gap-4 p-2 min-w-max">
          {canEdit && images.length < 10 && (
            <label className="relative flex-none w-24 h-24 bg-gray-100 rounded-xl cursor-pointer hover:bg-gray-200 transition-all flex items-center justify-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploading}
              />
              {uploading ? (
                <div className="animate-pulse">업로드 중...</div>
              ) : (
                <div className="flex flex-col items-center">
                  <Plus className="w-6 h-6 text-gray-400" />
                  <span className="text-xs text-gray-500 mt-1">{images.length}/10</span>
                </div>
              )}
            </label>
          )}
          {images.map((image, idx) => (
            <div
              key={image.id}
              className={`relative flex-none w-24 h-24 rounded-xl overflow-hidden cursor-pointer transition-all ${
                idx === currentIndex
                  ? 'ring-2 ring-blue-500 ring-offset-2'
                  : 'hover:ring-2 hover:ring-blue-300 hover:ring-offset-2'
              }`}
              onClick={() => setCurrentIndex(idx)}
            >
              <Image
                src={image.url}
                alt={image.caption || '썸네일'}
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 이미지 상세 모달 */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl rounded-3xl shadow-2xl border border-blue-100">
          {selectedImage && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span className="text-xl font-bold text-gray-800">이미지 상세</span>
                  {canEdit && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setEditingCaption(!editingCaption)}
                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(selectedImage)}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="relative aspect-[16/9] mt-4">
                <Image
                  src={selectedImage.url}
                  alt={selectedImage.caption || '상세 이미지'}
                  fill
                  className="object-contain rounded-xl"
                />
              </div>
              {editingCaption ? (
                <div className="flex gap-2 mt-4">
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="이미지 설명을 입력하세요"
                    className="flex-1 p-2 border border-gray-200 rounded-lg"
                  />
                  <Button
                    onClick={handleCaptionSave}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    저장
                  </Button>
                </div>
              ) : (
                <p className="mt-4 text-gray-600">{selectedImage.caption || '설명이 없습니다.'}</p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImageCarousel; 