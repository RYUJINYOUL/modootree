'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { gsap } from 'gsap';
import { collection, query, orderBy, limit, getDocs, addDoc, doc, updateDoc, onSnapshot, setDoc, deleteDoc, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Heart, MessageCircle, Loader2 } from 'lucide-react';

export default function PersonaFallingImagesEffect({ userId, username }) {
  const { currentUser } = useSelector((state) => state.user);
  const router = useRouter();
  const containerRef = useRef(null);
  const imageRefs = useRef([]);
  const rowAdjustments = useRef({}); // 행별 최종 X 시작 위치 조정값 저장
  const [loaded, setLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [personaImages, setPersonaImages] = useState([]);
  const [personaEntries, setPersonaEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentContent, setCommentContent] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [likedEntries, setLikedEntries] = useState({});
  const [entryLikesCount, setEntryLikesCount] = useState({});
  const [healthScores, setHealthScores] = useState([]);
  const [combinedItems, setCombinedItems] = useState([]);
  const [isVisible, setIsVisible] = useState(true);

  // 기본 이미지 (PersonaFeed 이미지가 7개 미만일 때 사용)
  const defaultImages = [
    '/face/won.png',
    '/face/won.png',
    '/face/won.png',
    '/face/won.png',
    '/face/won.png',
    '/face/won.png',
    '/face/won.png',
  ];

  // PersonaFeed에서 최신 이미지 7개 가져오기
  useEffect(() => {
    const fetchPersonaImages = async () => {
      if (!userId) {
        setPersonaImages(defaultImages);
        return;
      }

      try {
        const q = query(
          collection(db, `users/${userId}/persona_entries`),
          orderBy('createdAt', 'desc'),
          limit(7)
        );

        const snapshot = await getDocs(q);
        const entries = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            uploadedImageUrl: data.uploadedImageUrl,
            personaImageUrl: data.personaImageUrl,
            originalDiaryContent: data.originalDiaryContent,
            emotionAnalysis: data.emotionAnalysis,
            createdAt: data.createdAt?.toDate() || new Date(),
            date: data.date?.toDate() || data.createdAt?.toDate() || new Date()
          };
        });

        // 이미지가 있는 항목만 필터링 (최종 결과 이미지 우선)
        const entriesWithImages = entries
          .filter(entry => entry.personaImageUrl || entry.uploadedImageUrl)
          .slice(0, 7);

        // 최종 결과 이미지 우선 (personaImageUrl > uploadedImageUrl)
        const imageUrls = entriesWithImages
          .map(entry => entry.personaImageUrl || entry.uploadedImageUrl);

        // 7개 미만이면 기본 이미지로 채우기
        const finalImages = [...imageUrls];
        while (finalImages.length < 7) {
          finalImages.push(defaultImages[finalImages.length % defaultImages.length]);
        }

        setPersonaImages(finalImages);
        setPersonaEntries(entriesWithImages);
        console.log('PersonaFeed 이미지 로드 완료:', finalImages.length, '개'); // 디버깅용
      } catch (error) {
        console.error('PersonaFeed 이미지 로드 실패:', error);
        setPersonaImages(defaultImages);
      }
    };

    fetchPersonaImages();
  }, [userId]);

  // 건강 점수 데이터 가져오기
  useEffect(() => {
    const fetchHealthScores = async () => {
      if (!userId) {
        setHealthScores([]);
        return;
      }

      try {
        const q = query(
          collection(db, 'health_records'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(5) // 최신 5개만
        );

        const snapshot = await getDocs(q);
        const fetchedScores = snapshot.docs.map(doc => {
          const data = doc.data();
          const dailySummary = data.analysis?.dailySummary;
          const averageScore = dailySummary ?
            Math.round((
              (dailySummary.balanceScore || 0) +
              (dailySummary.varietyScore || 0) +
              (dailySummary.effortScore || 0)
            ) / 3) : 0;

          return {
            id: `health_${doc.id}`,
            type: 'health',
            score: averageScore,
            date: data.createdAt?.toDate() || new Date(),
          };
        });

        // 점수가 0보다 큰 항목만 필터링
        const validScores = fetchedScores.filter(item => item.score > 0);
        setHealthScores(validScores);
        console.log('건강 점수 로드 완료:', validScores.length, '개');
      } catch (error) {
        console.error('건강 점수 로드 실패:', error);
        setHealthScores([]);
      }
    };

    fetchHealthScores();
  }, [userId]);

  // 이미지와 건강 점수 데이터 통합
  useEffect(() => {
    const imageItems = personaImages.map((imageUrl, index) => ({
      id: `image_${index}`,
      type: 'image',
      content: imageUrl,
      entryData: personaEntries[index] || null,
    }));

    const healthItems = healthScores.map(score => ({
      id: score.id,
      type: 'health',
      content: `${score.score}점`,
      score: score.score,
    }));

    // X 버튼 아이템을 마지막에 추가
    const closeItem = {
      id: 'close_button',
      type: 'close',
      content: '×',
    };

    // 이미지와 건강 점수를 먼저, X 버튼을 마지막에
    const combined = [...imageItems, ...healthItems, closeItem];
    setCombinedItems(combined);
  }, [personaImages, personaEntries, healthScores]);

  // 반응형 크기 설정을 컴포넌트 레벨로 이동
  const imageSize = isMobile ? 50 : 90;

  // 화면 크기 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // GSAP 애니메이션 로직
  useEffect(() => {
    if (!loaded || combinedItems.length === 0) return;

    const container = containerRef.current;
    if (!container) return;

    const bottomMargin = isMobile ? 10 : 30;
    const gap = 5; // 간격 고정
    // 회전 애니메이션 시 모서리가 잘리지 않도록 안전 여백 대폭 증가 (모바일 25px, PC 40px)
    const minScreenMargin = isMobile ? 25 : 40;
    const itemSizeWithGap = imageSize + gap;

    // 1. 화면 너비에 순수하게 들어갈 수 있는 최대 아이템 개수 계산
    const availableWidthForItems = window.innerWidth - (minScreenMargin * 2);
    let maxItemsPerLine = Math.floor((availableWidthForItems + gap) / itemSizeWithGap);

    // 2. 최종 imagesPerRow 결정
    let imagesPerRow = maxItemsPerLine;

    // 최소 3개는 보장 (디자인 요구사항)
    imagesPerRow = Math.max(3, imagesPerRow);

    // 전체 아이템 수보다 클 수 없음
    imagesPerRow = Math.min(combinedItems.length, imagesPerRow);

    // 모바일 2줄 제한 제거 - 이 제한이 오버플로우를 유발할 수 있음

    const totalRows = Math.ceil(combinedItems.length / imagesPerRow);
    const newAdjustments = {}; // 현재 애니메이션 프레임의 조정값

    for (let r = 0; r < totalRows; r++) {
      const startIndex = r * imagesPerRow;
      const imagesInCurrentRow = Math.min(imagesPerRow, combinedItems.length - startIndex);

      // 현재 행의 실제 너비
      const totalRowWidth = (imagesInCurrentRow * imageSize) + ((imagesInCurrentRow > 0 ? imagesInCurrentRow - 1 : 0) * gap);

      // 1. 중앙 정렬 시작 위치 (이상적인 위치)
      let rowStartX = (window.innerWidth - totalRowWidth) / 2;

      // 2. 왼쪽 오버플로우 방지: 왼쪽 안전 여백 보장
      let finalRowStartX = Math.max(minScreenMargin, rowStartX);

      // 3. 오른쪽 오버플로우 최종 검증: 
      // 마지막 아이템의 오른쪽 끝 위치
      const finalRowXEnd = finalRowStartX + totalRowWidth;
      const maxRightPosition = window.innerWidth - minScreenMargin;

      // 오른쪽 여백이 부족하면 (오버플로우 발생 시)
      const overflow = finalRowXEnd - maxRightPosition;
      if (overflow > 0) {
        // 오버플로우된 만큼 행 전체를 왼쪽으로 밀어줍니다.
        finalRowStartX -= overflow;
      }

      newAdjustments[r] = finalRowStartX;

      console.log(`Row ${r}: StartX=${newAdjustments[r]}, Width=${totalRowWidth}`); // 디버깅
    }

    rowAdjustments.current = newAdjustments; // 조정값 업데이트

    console.log('Layout Debug:', {
      isMobile,
      windowWidth: window.innerWidth,
      minScreenMargin,
      availableWidth: availableWidthForItems,
      imageSize,
      gap,
      totalItems: combinedItems.length,
      maxItemsPerLine,
      imagesPerRow,
      totalRows,
    });

    imageRefs.current.forEach((image, index) => {
      if (!image) return;

      const startY = -Math.random() * 200 - 100;
      const startX = Math.random() * (window.innerWidth * 0.8) + (window.innerWidth * 0.1);

      const rowIndex = Math.floor(index / imagesPerRow);
      const colIndex = index % imagesPerRow;

      // **미리 계산된 행의 시작 X 위치 사용**
      const finalRowStartX = rowAdjustments.current[rowIndex] || minScreenMargin;

      const finalX = finalRowStartX + (colIndex * (imageSize + gap));

      // 디버그 로그 (첫/마지막 아이템만)
      if (index === 0 || index === combinedItems.length - 1) {
        console.log(`Item ${index}:`, {
          rowIndex,
          colIndex,
          finalX,
          windowWidth: window.innerWidth,
        });
      }
      const finalY = window.innerHeight - bottomMargin - imageSize - (rowIndex * (imageSize + gap));

      const duration = Math.random() * 2 + 1;
      const delay = index * 0.2;

      gsap.set(image, {
        width: imageSize,
        height: imageSize,
      });

      gsap.fromTo(image, {
        y: startY,
        x: startX,
        rotation: Math.random() * 360,
        opacity: 0
      }, {
        x: finalX,
        y: finalY,
        opacity: 1,
        rotation: Math.random() * 360 + 720,
        duration: duration,
        delay: delay,
        ease: "power2.out",
        onComplete: () => {
          gsap.to(image, {
            y: finalY - 5,
            duration: 0.3,
            yoyo: true,
            repeat: 1,
            ease: "power1.inOut"
          });
        }
      });
    });
  }, [loaded, isMobile, combinedItems, imageSize]);

  // 컴포넌트 마운트 후 애니메이션 시작
  useEffect(() => {
    // 새로고침할 때마다 항상 보이도록 설정
    setIsVisible(true);

    const timer = setTimeout(() => {
      setLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // 아이템 클릭 핸들러 (이미지, 건강 점수, 또는 닫기)
  const handleItemClick = (item, index) => {
    if (item.type === 'close') {
      // X 버튼 클릭 시 닫기
      handleClose();
    } else if (item.type === 'image') {
      // 기존 이미지 클릭 로직 (다이얼로그 열기)
      const entry = item.entryData;
      if (entry) {
        setSelectedEntry(entry);
        setIsDialogOpen(true);
        loadComments(entry);
        checkLikedStatus(entry);
        loadLikesCount(entry);
      }
    } else if (item.type === 'health') {
      // 건강 점수 클릭 시 /health 페이지로 이동
      router.push('/health');
    }
  };

  // 떨어지는 효과 닫기 핸들러
  const handleClose = () => {
    setIsVisible(false);
  };

  // 답글 로드
  const loadComments = (entry) => {
    if (!entry || !userId) return;

    const commentsCollectionRef = collection(db, `users/${userId}/persona_entries/${entry.id}/comments`);
    const q = query(commentsCollectionRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt,
      }));
      setComments(loadedComments);
    });

    return unsubscribe;
  };

  // 좋아요 상태 확인
  const checkLikedStatus = async (entry) => {
    if (!entry || !currentUser?.uid || !userId) return;

    try {
      const postAuthorId = entry.authorId || userId;
      const likeDocRef = doc(db, `users/${postAuthorId}/persona_entries/${entry.id}/likes`, currentUser.uid);
      const likeDocSnap = await getDocs(collection(db, `users/${postAuthorId}/persona_entries/${entry.id}/likes`));
      const hasLiked = likeDocSnap.docs.some(d => d.id === currentUser.uid);

      setLikedEntries(prev => ({
        ...prev,
        [entry.id]: hasLiked
      }));
    } catch (error) {
      // doc이 없으면 좋아요 안 한 것
      setLikedEntries(prev => ({
        ...prev,
        [entry.id]: false
      }));
    }
  };

  // 좋아요 개수 로드
  const loadLikesCount = async (entry) => {
    if (!entry || !userId) return;

    try {
      const postAuthorId = entry.authorId || userId;
      const likesCollectionRef = collection(db, `users/${postAuthorId}/persona_entries/${entry.id}/likes`);
      const snapshot = await getDocs(likesCollectionRef);
      setEntryLikesCount(prev => ({
        ...prev,
        [entry.id]: snapshot.size
      }));
    } catch (error) {
      console.error('좋아요 개수 로드 실패:', error);
    }
  };

  // 좋아요 처리
  const handleLike = async (e, entry) => {
    e.stopPropagation();
    if (!currentUser?.uid || !userId) return;

    const currentUserId = currentUser.uid;
    const entryId = entry.id;
    const postAuthorId = entry.authorId || userId;
    const likeDocRef = doc(db, `users/${postAuthorId}/persona_entries/${entryId}/likes`, currentUserId);
    const entryRef = doc(db, `users/${postAuthorId}/persona_entries`, entryId);

    try {
      if (likedEntries[entryId]) {
        // 이미 좋아요를 눌렀다면 좋아요 취소
        await deleteDoc(likeDocRef);
        await updateDoc(entryRef, { likesCount: (entry.likesCount || 1) - 1 });
        setLikedEntries(prev => ({ ...prev, [entryId]: false }));
        setEntryLikesCount(prev => ({ ...prev, [entryId]: (prev[entryId] || 1) - 1 }));
      } else {
        // 좋아요 추가
        await setDoc(likeDocRef, {
          userId: currentUserId,
          userName: currentUser.displayName || currentUser.email || '익명 사용자',
          createdAt: new Date()
        });
        await updateDoc(entryRef, { likesCount: (entry.likesCount || 0) + 1 });
        setLikedEntries(prev => ({ ...prev, [entryId]: true }));
        setEntryLikesCount(prev => ({ ...prev, [entryId]: (prev[entryId] || 0) + 1 }));
      }
    } catch (error) {
      console.error('좋아요 처리 실패:', error);
    }
  };

  // 답글 제출
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!currentUser?.uid || !selectedEntry || !commentContent.trim() || !userId) return;

    setIsSubmittingComment(true);
    try {
      const commentsCollectionRef = collection(db, `users/${userId}/persona_entries/${selectedEntry.id}/comments`);
      await addDoc(commentsCollectionRef, {
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email,
        userPhotoURL: currentUser.photoURL,
        content: commentContent.trim(),
        createdAt: new Date()
      });
      setCommentContent('');
    } catch (error) {
      console.error('답글 제출 실패:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // 보이지 않으면 렌더링하지 않음
  if (!isVisible) return null;

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden pointer-events-none z-[50]">
      {combinedItems.map((item, index) => (
        <div
          key={item.id}
          className="absolute pointer-events-auto"
          style={{
            left: '-100px',
            top: '-100px',
          }}
          ref={(el) => (imageRefs.current[index] = el)}
        >
          {item.type === 'close' ? (
            // X 닫기 버튼 아이템 렌더링
            <div
              className="relative p-1 rounded-full bg-gradient-to-r from-red-500 via-red-600 to-red-700 shadow-lg hover:scale-110 transition-transform duration-200 cursor-pointer flex items-center justify-center"
              style={{ width: imageSize, height: imageSize }}
              onClick={() => handleItemClick(item, index)}
              title="떨어지는 효과 닫기"
            >
              <div className="w-full h-full rounded-full bg-white border-2 border-white flex items-center justify-center">
                <span className="text-2xl font-bold text-red-600 text-center leading-none">
                  ×
                </span>
              </div>
            </div>
          ) : item.type === 'image' ? (
            // 이미지 아이템 렌더링
            <div
              className="relative p-1 rounded-full bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 shadow-lg hover:scale-110 transition-transform duration-200 cursor-pointer"
              style={{ width: imageSize, height: imageSize }}
              onClick={() => handleItemClick(item, index)}
            >
              <Image
                src={item.content}
                alt={`Persona image ${index}`}
                width={imageSize}
                height={imageSize}
                className="rounded-full object-cover border-2 border-white"
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
                onError={(e) => {
                  const target = e.target;
                  const entry = item.entryData;
                  if (entry?.uploadedImageUrl && target.src !== entry.uploadedImageUrl) {
                    target.src = entry.uploadedImageUrl;
                  } else {
                    target.src = defaultImages[index % defaultImages.length];
                  }
                }}
              />
            </div>
          ) : (
            // 건강 점수 아이템 렌더링 (텍스트)
            <div
              className="relative p-1 rounded-full bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 shadow-lg hover:scale-110 transition-transform duration-200 cursor-pointer flex items-center justify-center"
              style={{ width: imageSize, height: imageSize }}
              onClick={() => handleItemClick(item, index)}
            >
              <div className="w-full h-full rounded-full bg-white border-2 border-white flex items-center justify-center">
                <span className="text-sm md:text-lg font-bold text-gray-800 text-center">
                  {item.content}
                </span>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* 게시물 상세 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setComments([]);
          setCommentContent('');
        }
      }}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto bg-white">
          <DialogTitle className="sr-only">매거진 엔트리 상세보기</DialogTitle>
          {selectedEntry && (
            <div className="flex flex-col gap-6">
              {/* 헤더 - 날짜와 감정 평가 */}
              <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-green-100">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-semibold text-green-800">
                    {format(new Date(selectedEntry.date), 'yy년 MM월 dd일', { locale: ko })}
                  </h3>
                  {selectedEntry.emotionAnalysis && (
                    <span
                      className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200"
                    >
                      {selectedEntry.emotionAnalysis.emotion}
                    </span>
                  )}
                </div>
              </div>

              {/* 이미지 섹션 - 전체 너비로 최대 크기 */}
              <div className="relative flex justify-center px-4">
                {selectedEntry.personaImageUrl ? (
                  <img
                    src={selectedEntry.personaImageUrl}
                    alt="Persona Image"
                    className="w-auto max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                    onError={(e) => {
                      const target = e.target;
                      if (selectedEntry.uploadedImageUrl && target.src !== selectedEntry.uploadedImageUrl) {
                        target.src = selectedEntry.uploadedImageUrl;
                        target.className = "w-auto max-w-full max-h-[60vh] object-contain rounded-lg opacity-60";
                      } else {
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="flex items-center justify-center h-64 bg-gray-100 rounded-lg w-full"><svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                        }
                      }
                    }}
                  />
                ) : selectedEntry.uploadedImageUrl ? (
                  <img
                    src={selectedEntry.uploadedImageUrl}
                    alt="Uploaded Image"
                    className="w-auto max-w-full max-h-[60vh] object-contain rounded-lg opacity-60"
                    onError={(e) => {
                      const target = e.target;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="flex items-center justify-center h-64 bg-gray-100 rounded-lg w-full"><svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg w-full">
                    <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                )}
              </div>

              {/* 내용 섹션 */}
              <div className="space-y-6 px-4 pb-6">
                {/* 감정 분석 결과 */}
                {selectedEntry.emotionAnalysis && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-green-700">감정 분석</h4>
                    <p className="text-gray-600">{selectedEntry.emotionAnalysis.summary}</p>
                    {selectedEntry.emotionAnalysis.keywords && selectedEntry.emotionAnalysis.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedEntry.emotionAnalysis.keywords.map((keyword, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-sm"
                          >
                            #{keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 상호작용 버튼들 */}
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    className={`flex items-center gap-2 ${likedEntries[selectedEntry.id] ? 'text-red-500 border-red-300' : 'text-gray-600 border-gray-300 hover:bg-red-50'}`}
                    onClick={(e) => handleLike(e, selectedEntry)}
                  >
                    <Heart className="w-4 h-4" fill={likedEntries[selectedEntry.id] ? '#EF4444' : 'none'} />
                    <span>{entryLikesCount[selectedEntry.id] ?? selectedEntry.likesCount ?? 0}</span>
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    <span>{comments.length}</span>
                  </Button>
                </div>
              </div>

              {/* 답글 섹션 - Apple 스타일 */}
              <div className="px-4 pb-6 border-t border-gray-100 pt-4">
                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">답글 {comments.length > 0 && `(${comments.length})`}</h4>

                  {/* 답글 입력 필드 - Apple 스타일 */}
                  {currentUser?.uid ? (
                    <form onSubmit={handleSubmitComment} className="mb-4">
                      <div className="flex items-start gap-3">
                        <img
                          src={currentUser.photoURL || '/default-avatar.png'}
                          alt="User Avatar"
                          className="w-8 h-8 rounded-full flex-shrink-0"
                        />
                        <div className="flex-1">
                          <input
                            type="text"
                            value={commentContent}
                            onChange={(e) => setCommentContent(e.target.value)}
                            placeholder="답글 추가..."
                            className="w-full p-3 bg-gray-50 border-0 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500 transition-all"
                            disabled={isSubmittingComment}
                          />
                          {commentContent.trim() && (
                            <div className="flex justify-end mt-2">
                              <Button
                                type="submit"
                                size="sm"
                                className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-4 py-1 text-sm font-medium"
                                disabled={isSubmittingComment}
                              >
                                {isSubmittingComment ? <Loader2 className="w-3 h-3 animate-spin" /> : '게시'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </form>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500 text-sm">답글을 작성하려면 로그인해주세요.</p>
                    </div>
                  )}

                  {/* 답글 목록 - Apple 스타일 */}
                  <div className="space-y-3">
                    {comments.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">아직 답글이 없습니다.</p>
                      </div>
                    ) : (
                      comments.map(comment => (
                        <div key={comment.id} className="flex items-start gap-3">
                          <img
                            src={comment.userPhotoURL || '/default-avatar.png'}
                            alt="User Avatar"
                            className="w-8 h-8 rounded-full flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="bg-gray-50 rounded-2xl px-4 py-3 relative group">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-900 text-sm">{comment.userName || '익명'}</span>
                                  <span className="text-xs text-gray-500">
                                    {format(new Date(comment.createdAt?.toDate ? comment.createdAt.toDate() : comment.createdAt), 'MM월 dd일', { locale: ko })}
                                  </span>
                                </div>
                              </div>
                              <p className="text-gray-800 text-sm leading-relaxed">{comment.content}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
