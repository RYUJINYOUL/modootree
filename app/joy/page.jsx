'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import 'cropperjs/dist/cropper.css';
import { db } from '@/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, Upload } from 'lucide-react';
import CropperModal from '@/components/ui/CropperModal';
import Header from '@/components/Header';
import LoginOutButton from '@/components/ui/LoginOutButton';

const CATEGORIES = {
  all: { id: 'all', title: '전체' },
  calories: { 
    id: 'calories', 
    title: '오늘칼로리',
    uploadTitle: '칼로리 분석',
    description: '오늘 먹은 음식의 칼로리를 AI가 분석해드려요',
    maxImages: 3
  },
  pet: { 
    id: 'pet', 
    title: '오늘반려동물',
    uploadTitle: '반려동물 분석',
    description: '반려동물의 표정과 감정을 AI가 분석해드려요',
    maxImages: 3
  },
  relationship: { 
    id: 'relationship', 
    title: '오늘남친여친',
    uploadTitle: '이성친구 분석',
    description: 'AI가 분석하는 이성친구와의 관계',
    maxImages: 3
  },
  gathering: { 
    id: 'gathering', 
    title: '오늘모임후기',
    uploadTitle: '모임 분석',
    description: 'AI가 분석하는 오늘의 모임',
    maxImages: 3
  }
};

const UPLOAD_CATEGORIES = Object.values(CATEGORIES).filter(cat => cat.id !== 'all');
const VIEW_CATEGORIES = ['all', ...UPLOAD_CATEGORIES.map(cat => cat.id)];

export default function JoyPage() {
  const currentUser = useSelector((state) => state.user.currentUser) || {};
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedUploadCategory, setSelectedUploadCategory] = useState(UPLOAD_CATEGORIES[0]);
  const [selectedViewCategory, setSelectedViewCategory] = useState('all');
  const [uploadForm, setUploadForm] = useState({
    description: '',
    imageFiles: [],
    imageUrls: [],
    category: null
  });
  const [showCropper, setShowCropper] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [analyzingPosts, setAnalyzingPosts] = useState({});
  const [isDeleting, setIsDeleting] = useState(false);

  // 게시물 삭제 처리
  const handleDelete = async (post, e) => {
    e.stopPropagation();
    
    if (!currentUser?.uid || (currentUser.uid !== post.userId && currentUser.uid !== "vW1OuC6qMweyOqu73N0558pv4b03")) {
      alert('삭제 권한이 없습니다.');
      return;
    }

    if (!window.confirm('정말 삭제하시겠습니까?')) {
      return;
    }

    setIsDeleting(true);
    try {
      // Firestore 문서 삭제
      await deleteDoc(doc(db, 'joy', post.id));

      // Storage 이미지 삭제
      const storage = getStorage();
      const imageRef = ref(storage, post.imageUrl);
      await deleteObject(imageRef);

      // 선택된 게시물이 삭제된 게시물이면 모달 닫기
      if (selectedPost?.id === post.id) {
        setSelectedPost(null);
      }

      alert('삭제되었습니다.');
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  // 게시물 실시간 로드
  useEffect(() => {
    const postsQuery = query(
      collection(db, 'joy'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(postsQuery, async (snapshot) => {
      const newPosts = [];
      
      for (const doc of snapshot.docs) {
        const postData = doc.data();
        console.log('게시물 데이터:', {
          id: doc.id,
          ...postData
        });
        
        // 이미지 URL 확인 및 정규화
        let normalizedPost = {
          id: doc.id,
          ...postData
        };

        // images 배열이 없고 imageUrl이 있는 경우, images 배열로 변환
        if (!normalizedPost.images && normalizedPost.imageUrl) {
          normalizedPost.images = [normalizedPost.imageUrl];
        }

        // 카테고리가 없거나 이전 형식인 경우 자동 변환
        if (!normalizedPost.category || !CATEGORIES[normalizedPost.category]) {
          let newCategory = 'gathering'; // 기본값
          
          // 내용 기반으로 카테고리 추측
          const description = normalizedPost.description?.toLowerCase() || '';
          if (description.includes('칼로리') || description.includes('음식') || description.includes('먹')) {
            newCategory = 'calories';
          } else if (description.includes('반려') || description.includes('강아지') || description.includes('고양이') || description.includes('펫')) {
            newCategory = 'pet';
          } else if (description.includes('친구') || description.includes('남자') || description.includes('여자') || description.includes('연인')) {
            newCategory = 'relationship';
          }

          normalizedPost.category = newCategory;

          // Firestore 문서 업데이트
          try {
            await setDoc(doc.ref, {
              category: newCategory,
              images: normalizedPost.images
            }, { merge: true });
            
            console.log('게시물 업데이트:', {
              postId: doc.id,
              category: newCategory,
              imagesCount: normalizedPost.images?.length
            });
          } catch (error) {
            console.error('게시물 업데이트 실패:', error);
          }
        }

        // 초기 이미지 인덱스 추가
        normalizedPost.currentImageIndex = 0;
        newPosts.push(normalizedPost);
      }
      
      console.log('전체 게시물:', newPosts.length);
      setPosts(newPosts);
    });

    return () => unsubscribe();
  }, []);

  // AI 분석 요청 처리
    const handleAnalyze = async (post, e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (analyzingPosts[post.id]) {
        console.log('이미 분석 중인 게시물');
        return;
      }
      if (post.aiResponse) {
        console.log('이미 분석 완료된 게시물');
        alert('이미 분석이 완료된 사진입니다.');
        return;
      }
      
      console.log('분석 시작:', post.id);
      setAnalyzingPosts(prev => ({ ...prev, [post.id]: true }));
    try {
      console.log('AI 분석 시작:', {
        category: post.category,
        hasImages: !!post.images?.length,
        imageUrl: post.imageUrl
      });
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrls: post.images || [post.imageUrl],
          description: post.description,
          category: post.category || 'gathering'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API 오류 응답:', errorData);
        throw new Error(errorData.error || '분석 요청이 실패했습니다.');
      }

      const data = await response.json();
      console.log('분석 결과:', data);

      const aiResponse = typeof data.response === 'object' 
        ? JSON.stringify(data.response, null, 2)
        : data.response;
      
      // Firestore 업데이트
      const postRef = doc(db, 'joy', post.id);
      await setDoc(postRef, {
        aiResponse
      }, { merge: true });

      // 상태 업데이트
      setPosts(prevPosts => 
        prevPosts.map(p => 
          p.id === post.id ? { ...p, aiResponse } : p
        )
      );

      // 선택된 게시물이 현재 분석 중인 게시물이면 상태 업데이트
      if (selectedPost?.id === post.id) {
        setSelectedPost(prev => ({
          ...prev,
          aiResponse
        }));
      }

      alert('분석이 완료되었습니다!');
    } catch (error) {
      console.error('AI 분석 실패:', error);
      alert(error.message || 'AI 분석 중 오류가 발생했습니다.');
    } finally {
      setAnalyzingPosts(prev => {
        const newState = { ...prev };
        delete newState[post.id];
        return newState;
      });
    }
  };
  // ... (이전 코드와 동일)

  return (
    <>
      <LoginOutButton />
      <Header />
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-gray-900 text-white/90 relative">
        <div className="container mx-auto px-4 py-10">
          {/* 제목과 업로드 버튼 */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex-1" />
              <div className="flex-1 text-center">
                <h1 className="text-2xl font-bold text-white mb-2">
                  모두트리 AI
                </h1>
              </div>
              <div className="flex-1 flex justify-end">
                {currentUser?.uid && (
                  <Button
                    onClick={() => setShowUploadForm(true)}
                    variant="default"
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    업로드
                  </Button>
                )}
              </div>
            </div>

            {/* 카테고리 필터 */}
            <div className="flex flex-wrap gap-2 justify-center">
              {VIEW_CATEGORIES.map((categoryId) => (
                <button
                  key={categoryId}
                  onClick={() => setSelectedViewCategory(categoryId)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedViewCategory === categoryId
                      ? 'bg-white/20 text-white'
                      : 'bg-black/50 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {CATEGORIES[categoryId].title}
                </button>
              ))}
            </div>
          </div>

          

          {/* 업로드 폼 다이얼로그 */}
          <Dialog 
            open={showUploadForm} 
            onOpenChange={(open) => {
              if (!open) {
                // 업로드 폼이 닫힐 때 크롭 모달도 함께 닫기
                setShowCropper(false);
                setCropImage(null);
              }
              setShowUploadForm(open);
            }}
          >
            <DialogContent 
              className="bg-gray-900 text-white border border-gray-700 max-h-[90vh] overflow-y-auto"
              aria-describedby="upload-description"
              onClick={(e) => e.stopPropagation()}
            >
              <DialogHeader className="sticky top-0 bg-gray-900 z-10 pb-4">
                <DialogTitle className="text-white">사진 업로드</DialogTitle>
                <p id="upload-description" className="text-sm text-gray-400">
                  분석하고 싶은 카테고리를 선택하고 사진을 업로드하세요
                </p>
              </DialogHeader>
              <div className="space-y-4">
                {/* 카테고리 선택 */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {UPLOAD_CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedUploadCategory(category)}
                      className={`p-3 rounded-lg cursor-pointer transition-all text-left w-full h-full
                        ${selectedUploadCategory?.id === category.id 
                          ? 'bg-blue-600 text-white ring-2 ring-blue-400' 
                          : 'bg-gray-800 hover:bg-gray-700'}`}
                    >
                      <div className="h-full flex flex-col">
                        <h3 className="font-medium text-sm mb-1">{category.uploadTitle}</h3>
                        <p className={`text-xs ${
                          selectedUploadCategory?.id === category.id 
                            ? 'text-blue-50' 
                            : 'text-gray-300'
                        }`}>{category.description}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-lg p-6 cursor-pointer"
                    onClick={() => document.getElementById('imageInput').click()}>
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">업로드 (최대 3장, 각 2MB 이하)</p>
                    </div>
                  </div>

                  {uploadForm.imageUrls.length > 0 && (
                    <div className="w-full">
                      <div className="grid grid-cols-3 gap-2">
                        {uploadForm.imageUrls.map((url, index) => (
                          <div key={index} className="relative aspect-square">
                            <img
                              src={url}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover rounded-lg"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('이미지 삭제:', index);
                                setUploadForm(prev => ({
                                  ...prev,
                                  imageFiles: prev.imageFiles.filter((_, i) => i !== index),
                                  imageUrls: prev.imageUrls.filter((_, i) => i !== index)
                                }));
                              }}
                              className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-gray-400 text-center">
                        {3 - uploadForm.imageUrls.length}장 더 선택 가능 (각 2MB 이하)
                      </p>
                    </div>
                  )}
                </div>
                <input
                  id="imageInput"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  multiple
                  onChange={e => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;

                    console.log('선택된 파일:', files);

                    // 현재 선택된 파일 수 + 새로 선택된 파일 수 체크
                    const totalFiles = uploadForm.imageFiles.length + files.length;
                    if (totalFiles > 3) {
                      alert('최대 3장까지만 업로드할 수 있습니다.');
                      return;
                    }

                    // 파일 크기 체크 (2MB = 2 * 1024 * 1024 bytes)
                    const oversizedFiles = files.filter(file => file.size > 2 * 1024 * 1024);
                    if (oversizedFiles.length > 0) {
                      alert('각 이미지는 2MB 이하여야 합니다.');
                      return;
                    }

                    // 이미지 리사이징 함수
                    const resizeImage = (file) => {
                      return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          const img = new Image();
                          img.onload = () => {
                            const MAX_FILE_SIZE = 500 * 1024; // 500KB
                            const MAX_WIDTH = 1600;           // 최대 너비
                            const MIN_WIDTH = 800;           // 최소 너비
                            let quality = 0.7;               // 초기 품질
                            let width = img.width;
                            let height = img.height;

                            // 이미지 크기 초기 설정
                            if (width > MAX_WIDTH) {
                              height *= MAX_WIDTH / width;
                              width = MAX_WIDTH;
                            }

                            const canvas = document.createElement('canvas');
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');

                            // 이미지 스무딩 설정
                            ctx.imageSmoothingEnabled = true;
                            ctx.imageSmoothingQuality = 'high';
                            ctx.drawImage(img, 0, 0, width, height);

                            // 반복적으로 크기 조절 시도
                            const tryResize = (currentQuality) => {
                              return new Promise((resolve) => {
                                canvas.toBlob((blob) => {
                                  resolve(blob);
                                }, 'image/jpeg', currentQuality);
                              });
                            };

                            // 크기 조절 반복 함수
                            const adjustSize = async () => {
                              let blob = await tryResize(quality);
                              console.log('첫 시도:', {
                                size: blob.size,
                                quality,
                                width,
                                height
                              });

                              // 파일 크기가 목표보다 크면 품질 또는 크기 조절
                              while (blob.size > MAX_FILE_SIZE && width > MIN_WIDTH) {
                                if (quality > 0.3) {
                                  // 먼저 품질 낮추기 시도
                                  quality -= 0.1;
                                } else {
                                  // 품질을 더 낮출 수 없으면 크기 줄이기
                                  width *= 0.9;
                                  height *= 0.9;
                                  canvas.width = width;
                                  canvas.height = height;
                                  ctx.drawImage(img, 0, 0, width, height);
                                  quality = 0.7; // 품질 리셋
                                }

                                blob = await tryResize(quality);
                                console.log('재시도:', {
                                  size: blob.size,
                                  quality,
                                  width,
                                  height
                                });
                              }

                              const resizedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                              });

                              console.log('최종 결과:', {
                                originalSize: file.size,
                                resizedSize: resizedFile.size,
                                width,
                                height,
                                quality,
                                reduction: Math.round((1 - resizedFile.size / file.size) * 100) + '%'
                              });

                              resolve({
                                file: resizedFile,
                                url: URL.createObjectURL(blob)
                              });
                            };

                            adjustSize();
                          };
                          img.src = e.target.result;
                        };
                        reader.readAsDataURL(file);
                      });
                    };

                    // 모든 이미지 리사이징 처리
                    Promise.all(files.map(resizeImage))
                      .then(resizedImages => {
                        console.log('이미지 추가:', {
                          totalFiles,
                          newFiles: resizedImages.length
                        });

                        // 상태 업데이트
                        setUploadForm(prev => ({
                          ...prev,
                          imageFiles: [...prev.imageFiles, ...resizedImages.map(img => img.file)],
                          imageUrls: [...prev.imageUrls, ...resizedImages.map(img => img.url)]
                        }));
                      });
                  }}
                />
                <textarea
                  placeholder="사진에 대한 설명을 입력해주세요..."
                  className="w-full p-2 border rounded-lg bg-gray-800 text-white border-gray-700 placeholder-gray-400"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={async () => {
                    if (!selectedUploadCategory) {
                      alert('분석 카테고리를 선택해주세요.');
                      return;
                    }
                    if (uploadForm.imageFiles.length === 0 || !uploadForm.description) {
                      alert('사진과 설명을 모두 입력해주세요.');
                      return;
                    }

                    setIsUploading(true);
                    try {
                      const storage = getStorage();
                      const uploadedUrls = [];

                      console.log('업로드할 파일들:', uploadForm.imageFiles);
                      
                      if (!uploadForm.imageFiles?.length) {
                        throw new Error('업로드할 이미지가 없습니다.');
                      }

                      // 모든 이미지 업로드
                      for (const file of uploadForm.imageFiles) {
                        const timestamp = Date.now();
                        const filename = `${timestamp}_${file.name}`;
                        const imageRef = ref(storage, `joy/${currentUser.uid}/${filename}`);
                        
                        console.log('이미지 업로드 시작:', {
                          filename,
                          path: imageRef.fullPath,
                          size: file.size,
                          type: file.type
                        });
                        
                        await uploadBytes(imageRef, file);
                        console.log('이미지 업로드 완료:', imageRef.fullPath);
                        
                        const imageUrl = await getDownloadURL(imageRef);
                        console.log('이미지 URL 획득:', imageUrl);
                        
                        uploadedUrls.push(imageUrl);
                      }

                      console.log('모든 이미지 업로드 완료:', uploadedUrls);

                      // Firestore에 데이터 저장
                      const docRef = await addDoc(collection(db, 'joy'), {
                        userId: currentUser.uid,
                        imageUrl: uploadedUrls[0], // 이전 버전 호환성
                        images: uploadedUrls,      // 새로운 다중 이미지
                        description: uploadForm.description,
                        category: selectedUploadCategory.id,
                        createdAt: serverTimestamp(),
                        aiResponse: null,
                        author: {
                          uid: currentUser.uid,
                          displayName: currentUser.displayName || currentUser.email?.split('@')[0],
                          email: currentUser.email,
                          photoURL: currentUser.photoURL
                        }
                      });

                      console.log('Firestore 문서 생성 완료:', docRef.id);

                      // 폼 초기화
                      setUploadForm({
                        description: '',
                        imageFiles: [],
                        imageUrls: []
                      });
                      setShowUploadForm(false);
                    } catch (error) {
                      console.error('업로드 실패:', error);
                      alert(error.message || '업로드 중 오류가 발생했습니다.');
                    } finally {
                      setIsUploading(false);
                    }
                  }}
                  disabled={isUploading}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {isUploading ? '업로드 중...' : '업로드'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 업로드된 사진들 표시 영역 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {posts
              .filter(post => selectedViewCategory === 'all' || post.category === selectedViewCategory)
              .map(post => (
              <div
                key={post.id}
                className="bg-white/10 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => {
                  setShowCropper(false);
                  setCropImage(null);
                  setSelectedPost(post);
                }}
              >
                {/* 이미지 영역 */}
                <div className="relative aspect-square group">
                  {Array.isArray(post.images) && post.images.length > 0 ? (
                    <>
                      {/* 이미지 캐러셀 */}
                      <div className="relative w-full h-full">
                        {post.images.map((imageUrl, index) => (
                          <div
                            key={index}
                            className={`absolute inset-0 transition-opacity duration-300
                              ${post.currentImageIndex === index ? 'opacity-100' : 'opacity-0'}`}
                          >
                            <img
                              src={imageUrl}
                              alt={`${post.description} ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>

                      {/* 이미지가 2장 이상일 때만 네비게이션 표시 */}
                      {post.images.length > 1 && (
                        <>
                          {/* 좌우 버튼 */}
                          <button
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white p-1 rounded-full 
                              opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newIndex = ((post.currentImageIndex || 0) - 1 + post.images.length) % post.images.length;
                              setPosts(prev => prev.map(p => 
                                p.id === post.id ? { ...p, currentImageIndex: newIndex } : p
                              ));
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white p-1 rounded-full 
                              opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newIndex = ((post.currentImageIndex || 0) + 1) % post.images.length;
                              setPosts(prev => prev.map(p => 
                                p.id === post.id ? { ...p, currentImageIndex: newIndex } : p
                              ));
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>

                          {/* 하단 인디케이터 */}
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1">
                            {post.images.map((_, index) => (
                              <button
                                key={index}
                                className={`w-1.5 h-1.5 rounded-full transition-colors
                                  ${post.currentImageIndex === index ? 'bg-white' : 'bg-white/50'}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPosts(prev => prev.map(p => 
                                    p.id === post.id ? { ...p, currentImageIndex: index } : p
                                  ));
                                }}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <img
                      src={post.imageUrl}
                      alt={post.description}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {/* 삭제 버튼 */}
                  {(currentUser?.uid === post.userId || currentUser?.uid === "vW1OuC6qMweyOqu73N0558pv4b03") && (
                    <button
                      onClick={(e) => handleDelete(post, e)}
                      disabled={isDeleting}
                      className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 rounded-full text-white shadow-lg transition-colors"
                      title={currentUser?.uid === "vW1OuC6qMweyOqu73N0558pv4b03" ? "관리자 삭제" : "삭제"}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* 설명 및 AI 분석 영역 */}
                <div className="p-3 space-y-2">
                  {/* 사용자 설명 */}
                  <div className="border-b border-gray-700 pb-2">
                    <h3 className="text-xs font-medium text-gray-400 mb-1">사용자 설명</h3>
                    <p className="text-sm text-gray-200 line-clamp-2">{post.description}</p>
                  </div>

                  {/* AI 분석 결과 또는 분석 요청 버튼 */}
                  <div>
                    <h3 className="text-xs font-medium text-gray-400 mb-1">AI 분석</h3>
                    {post.aiResponse ? (
                      <div className="p-2 bg-blue-500/20 rounded border border-blue-500/30">
                        <p className="text-sm text-blue-200 line-clamp-3 leading-snug">{post.aiResponse}</p>
                      </div>
                    ) : currentUser?.uid === post.userId && (
                      <Button
                        onClick={(e) => handleAnalyze(post, e)}
                        className="w-full bg-blue-500 hover:bg-blue-600 h-8 text-sm font-medium"
                        disabled={analyzingPosts[post.id]}
                      >
                        {analyzingPosts[post.id] ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>분석 중...</span>
                          </div>
                        ) : (
                          'AI 분석 요청'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 선택된 게시물 상세 보기 */}
          <Dialog open={!!selectedPost} onOpenChange={(open) => {
            setSelectedPost(open ? selectedPost : null);
            // 게시물 다이얼로그가 닫힐 때 크롭 상태도 초기화
            if (!open) {
              setShowCropper(false);
              setCropImage(null);
            }
          }}>
            <DialogContent className="max-w-2xl bg-gray-900 text-white border border-gray-700 max-h-[90vh] overflow-y-auto">
              <DialogHeader className="sticky top-0 bg-gray-900 z-10 pb-4">
                <DialogTitle className="text-white">AI 관심도 분석</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative aspect-video group">
                  {selectedPost && Array.isArray(selectedPost.images) ? (
                    <>
                      {/* 이미지 캐러셀 */}
                      <div className="relative w-full h-full rounded-lg overflow-hidden">
                        {selectedPost.images.map((imageUrl, index) => (
                          <div
                            key={index}
                            className={`absolute inset-0 transition-opacity duration-300
                              ${selectedPost.currentImageIndex === index ? 'opacity-100' : 'opacity-0'}`}
                          >
                            <img
                              src={imageUrl}
                              alt={`${selectedPost.description} ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>

                      {/* 이미지가 2장 이상일 때만 네비게이션 표시 */}
                      {selectedPost.images.length > 1 && (
                        <>
                          {/* 좌우 버튼 */}
                          <button
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 text-white p-2 rounded-full 
                              opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newIndex = ((selectedPost.currentImageIndex || 0) - 1 + selectedPost.images.length) % selectedPost.images.length;
                              setSelectedPost(prev => ({ ...prev, currentImageIndex: newIndex }));
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 text-white p-2 rounded-full 
                              opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newIndex = ((selectedPost.currentImageIndex || 0) + 1) % selectedPost.images.length;
                              setSelectedPost(prev => ({ ...prev, currentImageIndex: newIndex }));
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>

                          {/* 하단 인디케이터 */}
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                            {selectedPost.images.map((_, index) => (
                              <button
                                key={index}
                                className={`w-2 h-2 rounded-full transition-colors
                                  ${selectedPost.currentImageIndex === index ? 'bg-white' : 'bg-white/50'}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPost(prev => ({ ...prev, currentImageIndex: index }));
                                }}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <img
                      src={selectedPost?.imageUrl}
                      alt={selectedPost?.description}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400">설명</h3>
                    <p className="text-gray-300">{selectedPost?.description}</p>
                  </div>
                  {selectedPost?.aiResponse && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-2">AI 분석 결과</h3>
                      <div className="p-4 bg-blue-500/20 rounded-lg">
                        <p className="text-blue-200">{selectedPost.aiResponse}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <CropperModal
        isOpen={showCropper}
        imageUrl={cropImage?.url}
        onClose={() => {
          setShowCropper(false);
          setCropImage(null);
        }}
        onSave={async (croppedBlob) => {
          try {
            console.log('크롭된 이미지 처리 시작');
            
            // 크롭된 이미지를 File 객체로 변환
            const croppedFile = new File([croppedBlob], cropImage.file.name, {
              type: 'image/jpeg'
            });
            console.log('크롭된 파일 생성:', {
              name: croppedFile.name,
              size: croppedFile.size,
              type: croppedFile.type
            });

            // 크롭된 이미지 URL 생성
            const croppedUrl = URL.createObjectURL(croppedBlob);
            console.log('크롭된 이미지 URL 생성');

            // 업로드 폼에 크롭된 이미지 추가
            setUploadForm(prev => {
              const newState = {
                ...prev,
                imageFiles: [...(prev.imageFiles || []), croppedFile],
                imageUrls: [...(prev.imageUrls || []), croppedUrl]
              };
              console.log('폼 상태 업데이트:', {
                totalFiles: newState.imageFiles.length,
                totalUrls: newState.imageUrls.length
              });
              return newState;
            });

            // 남은 이미지가 있으면 다음 이미지 크롭
            if (cropImage.remainingFiles?.length > 0) {
              console.log('다음 이미지 준비:', {
                remainingCount: cropImage.remainingFiles.length
              });
              const nextFile = cropImage.remainingFiles[0];
              const nextUrl = URL.createObjectURL(nextFile);
              setCropImage({
                file: nextFile,
                remainingFiles: cropImage.remainingFiles.slice(1),
                url: nextUrl
              });
            } else {
              console.log('모든 이미지 크롭 완료');
              setShowCropper(false);
              setCropImage(null);
            }
          } catch (error) {
            console.error('크롭 처리 중 오류:', error);
            alert('이미지 처리 중 오류가 발생했습니다.');
            setShowCropper(false);
            setCropImage(null);
          }
        }}
      />
    </>
  );
}
