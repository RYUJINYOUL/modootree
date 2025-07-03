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
  setDoc,
  getDoc,
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
  DialogDescription,
  DialogFooter,
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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [carouselTitle, setCarouselTitle] = useState('대표 사진');
  const [editingCarouselTitle, setEditingCarouselTitle] = useState(false);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

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
        title: '',
        description: '',
        link: '',
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
    setTitle(image.title || '');
    setDescription(image.description || '');
    setLink(image.link || '');
    setModalOpen(true);
  };

  const handleCaptionSave = () => {
    setSaveDialogOpen(true);
  };

  const confirmSave = async () => {
    if (!selectedImage || !canEdit) return;

    try {
      await updateDoc(doc(db, 'users', finalUid, 'carousel', selectedImage.id), {
        caption: caption,
        title: title,
        description: description,
        link: link
      });
      setEditingCaption(false);
      setSaveDialogOpen(false);
      setModalOpen(false);
    } catch (error) {
      console.error('정보 수정 실패:', error);
      alert('정보 수정에 실패했습니다.');
      setSaveDialogOpen(false);
    }
  };

  // 대표사진 문구 저장 함수
  const handleCarouselTitleSave = async () => {
    if (!canEdit) return;
    try {
      const docRef = doc(db, 'users', finalUid, 'info', 'carouselSettings');
      await setDoc(docRef, { title: carouselTitle }, { merge: true });
      setEditingCarouselTitle(false);
    } catch (error) {
      console.error('제목 저장 실패:', error);
      alert('제목 저장에 실패했습니다.');
    }
  };

  // 대표사진 문구 불러오기
  useEffect(() => {
    if (!finalUid) return;
    
    const fetchCarouselTitle = async () => {
      try {
        const docRef = doc(db, 'users', finalUid, 'info', 'carouselSettings');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().title) {
          setCarouselTitle(docSnap.data().title);
        }
      } catch (error) {
        console.error('제목 불러오기 실패:', error);
      }
    };

    fetchCarouselTitle();
  }, [finalUid]);

  return (
    <div className="w-full max-w-[1000px] mx-auto p-4 space-y-4 mt-8">
      {/* 상단 컨트롤 */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          {editingCarouselTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={carouselTitle}
                onChange={(e) => setCarouselTitle(e.target.value)}
                className="text-xl font-semibold text-white bg-blue-500/20 backdrop-blur-sm rounded-xl px-3 py-2"
                onBlur={handleCarouselTitleSave}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCarouselTitleSave();
                  }
                }}
                autoFocus
              />
              <button
                onClick={handleCarouselTitleSave}
                className="p-2 bg-blue-500/20 backdrop-blur-sm rounded-xl text-white hover:bg-blue-500/30 transition-all"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="px-3 py-2 bg-blue-500/20 backdrop-blur-sm rounded-xl text-white hover:bg-blue-500/30 transition-all">
                <h2 className="text-xl font-semibold">
                  {carouselTitle}
                </h2>
              </div>
              {canEdit && (
                <button
                  onClick={() => setEditingCarouselTitle(true)}
                  className="p-2 bg-blue-500/20 backdrop-blur-sm rounded-xl text-white hover:bg-blue-500/30 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="p-2 bg-blue-500/20 backdrop-blur-sm rounded-xl text-white hover:bg-blue-500/30 transition-all cursor-pointer"
              >
                <Plus className="w-5 h-5" />
              </label>
            </>
          )}
          <button
            onClick={handlePrevious}
            className="p-2 bg-blue-500/20 backdrop-blur-sm rounded-xl text-white hover:bg-blue-500/30 transition-all"
            disabled={images.length < 2}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="p-2 bg-blue-500/20 backdrop-blur-sm rounded-xl text-white hover:bg-blue-500/30 transition-all"
            disabled={images.length < 2}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 메인 캐러셀 */}
      <div className="w-full mb-8">
        {/* 모바일 뷰 - 한 장씩 */}
        <div className="md:hidden w-full space-y-4">
          {images.length > 0 ? (
            <div className="space-y-4">
              <div className="relative bg-black/20 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg aspect-[4/3]">
                <Image
                  src={images[currentIndex]?.url}
                  alt={images[currentIndex]?.caption || '이미지'}
                  fill
                  className="object-cover"
                  onClick={() => handleImageClick(images[currentIndex])}
                />
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <h3 className="text-lg font-semibold text-white">
                    {images[currentIndex]?.title || '제목 없음'}
                  </h3>
                  <p className="text-sm text-white/80">
                    {images[currentIndex]?.description || '설명 없음'}
                  </p>
                </div>
                {canEdit && (
                  <button
                    onClick={() => handleDelete(images[currentIndex])}
                    className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="relative bg-black/20 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg aspect-[4/3]">
              <div className="absolute inset-0 flex items-center justify-center text-white/60">
                이미지를 추가해주세요
              </div>
            </div>
          )}
        </div>

        {/* 데스크톱 뷰 - 3장씩 */}
        <div className="hidden md:grid md:grid-cols-3 gap-4">
          {[0, 1, 2].map((offset) => {
            const imageIndex = (currentIndex + offset) % images.length;
            const image = images[imageIndex];
            
            return (
              <div key={offset} className="relative bg-black/20 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg aspect-[4/3] group">
                {image ? (
                  <>
                    <Image
                      src={image.url}
                      alt={image.caption || '이미지'}
                      fill
                      className="object-cover cursor-pointer"
                      onClick={() => handleImageClick(image)}
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <h3 className="text-sm font-semibold text-white truncate">
                        {image.title || '제목 없음'}
                      </h3>
                      <p className="text-xs text-white/80 line-clamp-2">
                        {image.description || '설명 없음'}
                      </p>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => handleDelete(image)}
                        className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white/60">
                    이미지를 추가해주세요
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 크롭 모달 */}
      {isCropping && (
        <Dialog open={isCropping} onOpenChange={setIsCropping}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>이미지 자르기</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={4/3}
              >
                <img
                  ref={imgRef}
                  src={previewUrl}
                  alt="크롭할 이미지"
                  style={{ maxWidth: '100%' }}
                />
              </ReactCrop>
              <canvas
                ref={previewCanvasRef}
                style={{ display: 'none' }}
              />
              <div className="flex justify-end gap-2 mt-4">
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
                  disabled={!completedCrop || uploading}
                >
                  {uploading ? '업로드 중...' : '확인'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 이미지 상세 모달 */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>이미지 상세</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4">
              <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                <Image
                  src={selectedImage.url}
                  alt={selectedImage.caption || '이미지'}
                  fill
                  className="object-cover"
                />
              </div>
              {canEdit ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full p-2 rounded border"
                      placeholder="대표 문구를 입력하세요"
                    />
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full p-2 rounded border"
                      placeholder="설명을 입력하세요"
                      rows={3}
                    />
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      className="w-full p-2 rounded border"
                      placeholder="링크를 입력하세요"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button onClick={handleCaptionSave}>저장</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">{selectedImage.title || '제목 없음'}</h3>
                  <p className="text-sm text-gray-600">{selectedImage.description || '설명 없음'}</p>
                  {selectedImage.link && (
                    <a
                      href={selectedImage.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:text-blue-600"
                    >
                      자세히 보기
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 저장 확인 다이얼로그 */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent 
          className="sm:max-w-[425px]"
          aria-describedby="save-dialog-description"
        >
          <DialogHeader>
            <DialogTitle>이미지 설명 저장</DialogTitle>
            <DialogDescription id="save-dialog-description">
              변경된 이미지 설명을 저장하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              onClick={confirmSave}
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImageCarousel; 