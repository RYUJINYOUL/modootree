'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { usePathname } from 'next/navigation';
import { setUser } from "@/store/userSlice";
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('ko');
import { Lock, Unlock, Pencil, Trash2, Image, ChevronLeft, ChevronRight, Heart, X } from 'lucide-react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// Firebase imports
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, GoogleAuthProvider, signInWithPopup, browserLocalPersistence } from "firebase/auth";
import app from '@/firebase';
import KakaoAuthButton from '@/components/auth/KakaoAuthButton';

const db = getFirestore(app);
const storage = getStorage(app);

const COLOR_PALETTE = [
  'transparent',
  '#000000', '#FFFFFF', '#F87171', '#FBBF24',
  '#34D399', '#60A5FA', '#A78BFA', '#F472B6',
];

const CATEGORIES = ['일상', '감정', '관계', '목표/취미', '특별한 날', '기타/자유'];

const TodayDiary = ({ username, uid, isEditable }) => {
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [likeModalOpen, setLikeModalOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedDiary, setSelectedDiary] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isLiking, setIsLiking] = useState(false);
  const [writeForm, setWriteForm] = useState({
    title: '',
    content: '',
    images: [],
    isPrivate: false,
    selectedDate: new Date().toISOString()
  });
  const [styleSettings, setStyleSettings] = useState({
    bgColor: '#60A5FA',
    textColor: '#FFFFFF',
    bgOpacity: 0.2,
    shadow: 'none',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    rounded: 'md'
  });
  const { currentUser } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const pathname = usePathname();
  const finalUid = uid ?? currentUser?.uid;
  
  // 상태 관리
  const [diaries, setDiaries] = useState([]);
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [loading, setLoading] = useState(true);
  const [imageViewer, setImageViewer] = useState({ 
    isOpen: false, 
    currentIndex: -1,
    startRect: null 
  });
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;
  const [permissions, setPermissions] = useState(null);

  // 데이터 불러오기
  // 스타일 설정 저장 함수
  const saveStyleSettings = async (newSettings) => {
    if (!finalUid) return;
    try {
      await setDoc(doc(db, 'users', finalUid, 'settings', 'todayDiary'), newSettings, { merge: true });
      setStyleSettings(newSettings);
    } catch (error) {
      console.error('스타일 설정 저장 실패:', error);
    }
  };

  // 스타일 설정 불러오기
  useEffect(() => {
    const loadStyleSettings = async () => {
      if (!finalUid) return;
      try {
        const docRef = doc(db, 'users', finalUid, 'settings', 'todayDiary');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setStyleSettings(docSnap.data());
        }
      } catch (error) {
        console.error('스타일 설정 불러오기 실패:', error);
      }
    };
    loadStyleSettings();
  }, [finalUid]);

  // 권한 설정 실시간 감시
  useEffect(() => {
    if (!finalUid) return;

    const permissionsRef = doc(db, 'users', finalUid, 'settings', 'permissions');
    
    // 실시간 리스너 설정
    const unsubscribe = onSnapshot(permissionsRef, (doc) => {
      if (doc.exists()) {
        setPermissions(doc.data());
      } else {
        setPermissions(null);
      }
    }, (error) => {
      console.error('권한 설정 감시 중 오류:', error);
    });

    // 컴포넌트 언마운트 시 리스너 해제
    return () => unsubscribe();
  }, [finalUid]);

  // 일기 데이터 불러오기
  useEffect(() => {
    if (!finalUid) return;

    const q = query(
      collection(db, 'users', finalUid, 'diary'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let diaryList = snapshot.docs.map((doc) => {
        const data = doc.data();
        
        // 비공개 일기는 작성자만 볼 수 있음
        if (data.isPrivate && data.author?.uid !== currentUser?.uid) {
          return null;
        }


        // author 정보 구성 (기존 방식과 새로운 방식 모두 지원)
        const author = {
          uid: data.author?.uid || data.authorUid,
          displayName: data.author?.displayName || data.authorName || '사용자',
          photoURL: data.author?.photoURL || data.authorPhotoURL || null,
          email: data.author?.email || data.authorEmail || null
        };

        return {
          id: doc.id,
          title: data.title || '',
          content: data.content || '',
          images: data.images || [],
          isPrivate: data.isPrivate || false,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
          author: author
        };
      });

      // null 값 제거하고 설정
      setDiaries(diaryList.filter(diary => diary !== null));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [finalUid]);

  // 월별 달력 뷰 컴포넌트
  const CalendarView = () => {
    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');
    const startDate = startOfMonth.startOf('week');
    const endDate = endOfMonth.endOf('week');
    
    const dates = [];
    let date = startDate;
    
    while (date.isBefore(endDate) || date.isSame(endDate, 'day')) {
      dates.push(date);
      date = date.add(1, 'day');
    }

    return (
      <div className="space-y-4">
        <div 
          className={cn(
            "flex items-center justify-between mb-4 p-4 backdrop-blur-sm",
            styleSettings.rounded === 'none' && 'rounded-none',
            styleSettings.rounded === 'sm' && 'rounded',
            styleSettings.rounded === 'md' && 'rounded-lg',
            styleSettings.rounded === 'lg' && 'rounded-xl',
            styleSettings.rounded === 'full' && 'rounded-full'
          )}
          style={{ 
            backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
            color: styleSettings.textColor,
            boxShadow: (() => {
              const shadowColor = styleSettings.shadowColor 
                ? `rgba(${parseInt(styleSettings.shadowColor.slice(1, 3), 16)}, ${parseInt(styleSettings.shadowColor.slice(3, 5), 16)}, ${parseInt(styleSettings.shadowColor.slice(5, 7), 16)}, ${styleSettings.shadowOpacity ?? 0.2})`
                : 'rgba(0, 0, 0, 0.2)';
              
              switch (styleSettings.shadow) {
                case 'none': return 'none';
                case 'sm': return `0 1px 2px ${shadowColor}`;
                case 'md': return `0 4px 6px ${shadowColor}`;
                case 'lg': return `0 10px 15px ${shadowColor}`;
                case 'retro': return `8px 8px 0px 0px ${shadowColor}`;
                case 'float': return `0 10px 20px -5px ${shadowColor}`;
                case 'glow': return `0 0 20px ${shadowColor}`;
                case 'inner': return `inset 0 2px 4px ${shadowColor}`;
                case 'sharp': return `-10px 10px 0px ${shadowColor}`;
                case 'soft': return `0 5px 15px ${shadowColor}`;
                default: return 'none';
              }
            })()
          }}
        >
          <Button 
            onClick={() => setCurrentDate(prev => prev.subtract(1, 'month'))}
            variant="ghost"
            size="icon"
            className="hover:bg-gray-100/10 w-8 h-8"
            style={{ color: styleSettings.textColor }}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold" style={{ color: styleSettings.textColor }}>
              {currentDate.format('YY년 MM월')}
            </h2>
            {/* 글쓰기 버튼 - 항상 표시하고 클릭 시 권한 체크 */}
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-gray-100/10 w-6 h-6"
              style={{ color: styleSettings.textColor }}
              onClick={() => {
                // 로그인 체크
                console.log('Current User:', currentUser);
                if (!currentUser || !currentUser.uid) {
                  console.log('Opening login modal');
                  setShowLoginModal(true);
                  return;
                }

                // 날짜 선택 체크
                if (!selectedDate) {
                  alert('먼저 날짜를 선택해주세요.');
                  return;
                }

                // 권한 체크
                const hasPermission = 
                  finalUid === currentUser.uid || // 페이지 소유자
                  (permissions?.allowedUsers?.some(user => user.email === currentUser.email)); // 허용된 사용자

                if (!hasPermission) {
                  alert('글쓰기 권한이 없습니다.\n페이지 소유자나 허용된 사용자만 글을 작성할 수 있습니다.');
                  return;
                }

                setWriteForm(prev => ({
                  ...prev,
                  selectedDate: selectedDate.toISOString()
                }));
                setShowWriteForm(true);
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
          <Button 
            onClick={() => setCurrentDate(prev => prev.add(1, 'month'))}
            variant="ghost"
            size="icon"
            className="hover:bg-gray-100/10 w-8 h-8"
            style={{ color: styleSettings.textColor }}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
        
        <div 
          className={cn(
            "p-4 backdrop-blur-sm",
            styleSettings.rounded === 'none' && 'rounded-none',
            styleSettings.rounded === 'sm' && 'rounded',
            styleSettings.rounded === 'md' && 'rounded-lg',
            styleSettings.rounded === 'lg' && 'rounded-xl',
            styleSettings.rounded === 'full' && 'rounded-full'
          )}
          style={{ 
            backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
            color: styleSettings.textColor,
            boxShadow: (() => {
              const shadowColor = styleSettings.shadowColor 
                ? `rgba(${parseInt(styleSettings.shadowColor.slice(1, 3), 16)}, ${parseInt(styleSettings.shadowColor.slice(3, 5), 16)}, ${parseInt(styleSettings.shadowColor.slice(5, 7), 16)}, ${styleSettings.shadowOpacity ?? 0.2})`
                : 'rgba(0, 0, 0, 0.2)';
              
              switch (styleSettings.shadow) {
                case 'none': return 'none';
                case 'sm': return `0 1px 2px ${shadowColor}`;
                case 'md': return `0 4px 6px ${shadowColor}`;
                case 'lg': return `0 10px 15px ${shadowColor}`;
                case 'retro': return `8px 8px 0px 0px ${shadowColor}`;
                case 'float': return `0 10px 20px -5px ${shadowColor}`;
                case 'glow': return `0 0 20px ${shadowColor}`;
                case 'inner': return `inset 0 2px 4px ${shadowColor}`;
                case 'sharp': return `-10px 10px 0px ${shadowColor}`;
                case 'soft': return `0 5px 15px ${shadowColor}`;
                default: return 'none';
              }
            })()
          }}>
          <div className="grid grid-cols-7 gap-1 text-center mb-4">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
              <div 
                key={day} 
                className="font-medium py-2"
                style={{
                  color: index === 0 ? '#FF4444' : index === 6 ? '#4444FF' : 'inherit'
                }}
              >
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {dates.map((date, i) => {
              const isToday = date.isSame(dayjs(), 'day');
              const isCurrentMonth = date.isSame(currentDate, 'month');
              const hasDiary = diaries.some(diary => 
                dayjs(diary.createdAt).isSame(date, 'day')
              );
              
              return (
                <div
                  key={date.format('YYYY-MM-DD')}
                  onClick={() => {
                    setSelectedDate(date);
                    if (hasDiary) {
                      const dayDiaries = diaries.filter(diary => 
                        dayjs(diary.createdAt).format('YYYY-MM-DD') === date.format('YYYY-MM-DD')
                      );
                      if (dayDiaries.length === 1) {
                        // 하나의 일기만 있는 경우 바로 상세보기
                        setSelectedDiary(dayDiaries[0]);
                        setShowDetailModal(true);
                      } else if (dayDiaries.length > 1) {
                        // 여러 일기가 있는 경우 목록으로 보여주기
                        setSelectedDiary({ 
                          date: date.format('YYYY년 MM월 DD일'),
                          diaries: dayDiaries 
                        });
                        setShowDetailModal(true);
                      }
                    }
                  }}
                  className={`
                    aspect-square flex flex-col items-center justify-center p-1 rounded-lg
                    transition-all hover:bg-gray-100/10 cursor-pointer
                    ${isToday ? 'bg-blue-500/20' : ''}
                    ${!isCurrentMonth ? 'opacity-40' : ''}
                    ${hasDiary ? 'font-bold hover:scale-[1.05]' : ''}
                    ${selectedDate && date.isSame(selectedDate, 'day') ? 'ring-2 ring-blue-500' : ''}
                  `}
                  style={{
                    color: date.day() === 0 ? '#FF4444' : 
                          date.day() === 6 ? '#4444FF' : 
                          !isCurrentMonth ? '#666666' : 'inherit'
                  }}
                >
                  <span className="text-lg">{date.format('D')}</span>
                  {hasDiary && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // 리스트 뷰 컴포넌트
  const ListView = () => {
    const visibleDiaries = diaries.slice(0, page * itemsPerPage);
    const totalPages = Math.ceil(diaries.length / itemsPerPage);

    return (
      <div className="space-y-4">
        {diaries.length === 0 && (
          <div className="text-center py-8" style={{ color: styleSettings.textColor }}>
            작성된 일기가 없습니다.
          </div>
        )}
        {visibleDiaries.map(diary => (
          <div
            key={diary.id}
            onClick={() => {
              setSelectedDiary(diary);
              setShowDetailModal(true);
            }}
            className={cn(
              "cursor-pointer hover:scale-[1.01] transition-transform",
              "p-4 backdrop-blur-sm",
              styleSettings.rounded === 'none' && 'rounded-none',
              styleSettings.rounded === 'sm' && 'rounded',
              styleSettings.rounded === 'md' && 'rounded-lg',
              styleSettings.rounded === 'lg' && 'rounded-xl',
              styleSettings.rounded === 'full' && 'rounded-full'
            )}
            style={{ 
              backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
              color: styleSettings.textColor,
              boxShadow: (() => {
                const shadowColor = styleSettings.shadowColor 
                  ? `rgba(${parseInt(styleSettings.shadowColor.slice(1, 3), 16)}, ${parseInt(styleSettings.shadowColor.slice(3, 5), 16)}, ${parseInt(styleSettings.shadowColor.slice(5, 7), 16)}, ${styleSettings.shadowOpacity ?? 0.2})`
                  : 'rgba(0, 0, 0, 0.2)';
                
                switch (styleSettings.shadow) {
                  case 'none': return 'none';
                  case 'sm': return `0 1px 2px ${shadowColor}`;
                  case 'md': return `0 4px 6px ${shadowColor}`;
                  case 'lg': return `0 10px 15px ${shadowColor}`;
                  case 'retro': return `8px 8px 0px 0px ${shadowColor}`;
                  case 'float': return `0 10px 20px -5px ${shadowColor}`;
                  case 'glow': return `0 0 20px ${shadowColor}`;
                  case 'inner': return `inset 0 2px 4px ${shadowColor}`;
                  case 'sharp': return `-10px 10px 0px ${shadowColor}`;
                  case 'soft': return `0 5px 15px ${shadowColor}`;
                  default: return 'none';
                }
              })()
            }}
          >
            <div className="flex flex-col h-full">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={diary.author?.photoURL || '/Image/defaultLogo.png'}
                    alt="프로필"
                    className="w-8 h-8 rounded-full"
                    onError={(e) => {
                      e.target.src = '/Image/defaultLogo.png';
                    }}
                  />
                  <div>
                    <h3 className="font-medium flex items-center gap-2">
                      {diary.isPrivate && <Lock className="w-4 h-4" />}
                      {diary.title || '제목 없음'}
                    </h3>
                    <span className="text-sm" style={{ color: styleSettings.textColor }}>
                      {diary.author?.displayName || '사용자'}
                    </span>
                  </div>
                </div>
                <p 
                  className="line-clamp-3 mb-4"
                  style={{ color: styleSettings.textColor }}
                >
                  {diary.content}
                </p>
                {diary.images && diary.images.length > 0 && (
                  <div className="mb-4">
                    <div className="hidden md:grid md:grid-cols-5 gap-2">
                      {diary.images.slice(0, 5).map((image, index) => (
                        <div key={index} className="aspect-[4/3] relative">
                          {index === 4 && diary.images.length > 5 ? (
                            <div 
                              className="absolute inset-0 bg-white/70 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/80 transition-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDiary(diary);
                                setShowDetailModal(true);
                              }}
                            >
                              <span className="text-gray-800 text-lg font-medium">+{diary.images.length - 4}</span>
                            </div>
                          ) : null}
                          <img
                            src={image}
                            alt={`${diary.title} 이미지 ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="grid md:hidden grid-cols-3 gap-2">
                      {diary.images.slice(0, 3).map((image, index) => (
                        <div key={index} className="aspect-square relative">
                          {index === 2 && diary.images.length > 3 ? (
                            <div 
                              className="absolute inset-0 bg-white/70 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/80 transition-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDiary(diary);
                                setShowDetailModal(true);
                              }}
                            >
                              <span className="text-gray-800 text-lg font-medium">+{diary.images.length - 2}</span>
                            </div>
                          ) : null}
                          <img
                            src={image}
                            alt={`${diary.title} 이미지 ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                <span className="text-sm" style={{ color: styleSettings.textColor }}>
                  {dayjs(diary.createdAt).format('YY.MM.DD')}
                </span>
                {/* 버튼 그룹 - 로그인 상태이고 (작성자이거나 페이지 소유자인 경우만 표시) */}
                {currentUser && (diary.author?.uid === currentUser.uid || finalUid === currentUser.uid) && (
                  <div className="flex items-center gap-1">
                    {/* 수정 버튼 */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 hover:bg-gray-100/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setWriteForm({
                          ...diary,
                          images: diary.images || []
                        });
                        setShowWriteForm(true);
                      }}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    {/* 삭제 버튼 */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 hover:bg-gray-100/10"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (window.confirm('정말 삭제하시겠습니까?')) {
                          try {
                            await deleteDoc(doc(db, 'users', finalUid, 'diary', diary.id));
                          } catch (error) {
                            console.error('일기 삭제 중 오류:', error);
                            alert('일기 삭제 중 오류가 발생했습니다.');
                          }
                        }
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                    {/* 공감하기 버튼 */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 hover:bg-gray-100/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDiary(diary);
                        setLikeModalOpen(true);
                      }}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="w-3 h-3" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
                        />
                      </svg>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {page < totalPages && (
          <Button
            className={cn(
              "w-full mt-6 backdrop-blur-sm",
              styleSettings.rounded === 'none' && 'rounded-none',
              styleSettings.rounded === 'sm' && 'rounded',
              styleSettings.rounded === 'md' && 'rounded-lg',
              styleSettings.rounded === 'lg' && 'rounded-xl',
              styleSettings.rounded === 'full' && 'rounded-full'
            )}
            variant="outline"
            onClick={() => setPage(prev => prev + 1)}
            style={{ 
              backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
              color: styleSettings.textColor,
              boxShadow: (() => {
                const shadowColor = styleSettings.shadowColor 
                  ? `rgba(${parseInt(styleSettings.shadowColor.slice(1, 3), 16)}, ${parseInt(styleSettings.shadowColor.slice(3, 5), 16)}, ${parseInt(styleSettings.shadowColor.slice(5, 7), 16)}, ${styleSettings.shadowOpacity ?? 0.2})`
                  : 'rgba(0, 0, 0, 0.2)';
                
                switch (styleSettings.shadow) {
                  case 'none': return 'none';
                  case 'sm': return `0 1px 2px ${shadowColor}`;
                  case 'md': return `0 4px 6px ${shadowColor}`;
                  case 'lg': return `0 10px 15px ${shadowColor}`;
                  case 'retro': return `8px 8px 0px 0px ${shadowColor}`;
                  case 'float': return `0 10px 20px -5px ${shadowColor}`;
                  case 'glow': return `0 0 20px ${shadowColor}`;
                  case 'inner': return `inset 0 2px 4px ${shadowColor}`;
                  case 'sharp': return `-10px 10px 0px ${shadowColor}`;
                  case 'soft': return `0 5px 15px ${shadowColor}`;
                  default: return 'none';
                }
              })()
            }}
          >
            더보기 ({page * itemsPerPage}/{diaries.length})
          </Button>
        )}
      </div>
    );
  };

  // 사진첩 뷰 컴포넌트
  const GalleryView = () => {
    // 모든 일기에서 이미지 추출

    const allImages = diaries.reduce((acc, diary) => {
      console.log('Processing diary images:', diary.images);
      if (diary.images && diary.images.length > 0) {
        const images = diary.images.map(image => {
          console.log('Processing image:', image);
          const imageUrl = typeof image === 'string' ? image : image.url;
          console.log('Image URL:', imageUrl);
          return {
            url: imageUrl,
            date: diary.createdAt,
            title: diary.title,
            content: diary.content,
            author: diary.author
          };
        });
        return [...acc, ...images];
      }
      return acc;
    }, []);
    console.log('All processed images:', allImages);
  

    return (
      <div>
        <div className="grid grid-cols-3 gap-2">
          {allImages.map((image, index) => (
            <div
              key={index}
              className={cn(
                "aspect-square relative cursor-pointer group backdrop-blur-sm",
                styleSettings.rounded === 'none' && 'rounded-none',
                styleSettings.rounded === 'sm' && 'rounded',
                styleSettings.rounded === 'md' && 'rounded-lg',
                styleSettings.rounded === 'lg' && 'rounded-xl',
                styleSettings.rounded === 'full' && 'rounded-full'
              )}
              style={{ 
                backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
                color: styleSettings.textColor,
                boxShadow: (() => {
                  const shadowColor = styleSettings.shadowColor 
                    ? `rgba(${parseInt(styleSettings.shadowColor.slice(1, 3), 16)}, ${parseInt(styleSettings.shadowColor.slice(3, 5), 16)}, ${parseInt(styleSettings.shadowColor.slice(5, 7), 16)}, ${styleSettings.shadowOpacity ?? 0.2})`
                    : 'rgba(0, 0, 0, 0.2)';
                  
                  switch (styleSettings.shadow) {
                    case 'none': return 'none';
                    case 'sm': return `0 1px 2px ${shadowColor}`;
                    case 'md': return `0 4px 6px ${shadowColor}`;
                    case 'lg': return `0 10px 15px ${shadowColor}`;
                    case 'retro': return `8px 8px 0px 0px ${shadowColor}`;
                    case 'float': return `0 10px 20px -5px ${shadowColor}`;
                    case 'glow': return `0 0 20px ${shadowColor}`;
                    case 'inner': return `inset 0 2px 4px ${shadowColor}`;
                    case 'sharp': return `-10px 10px 0px ${shadowColor}`;
                    case 'soft': return `0 5px 15px ${shadowColor}`;
                    default: return 'none';
                  }
                })()
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const index = allImages.findIndex(img => img.url === image.url);
                setImageViewer({ 
                  isOpen: true, 
                  currentIndex: index,
                  startRect: {
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height
                  }
                });
              }}
            >
              <div className="relative w-full h-full aspect-square">
                <img
                  src={image.url}
                  alt={image.title || '일기 이미지'}
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e) => {
                    console.error('Image load error:', e);
                    e.target.src = '/Image/defaultLogo.png';
                  }}
                  onLoad={() => console.log('Image loaded successfully:', image.url)}
                />
                <div className="absolute inset-0 bg-black-100 bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex flex-col items-center justify-center rounded-lg">
                  <div className="text-white opacity-0 group-hover:opacity-100 text-sm text-center p-2 space-y-1">
                    <div className="font-medium">{image.title || '제목 없음'}</div>
                    <div>{dayjs(image.date).format('YYYY.MM.DD')}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 이미지 상세보기 오버레이 */}
        {imageViewer.isOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 transition-all duration-500 ease-out"
            style={{
              opacity: 1,
              transform: 'scale(1)'
            }}
            initial={{
              opacity: 0,
              transform: imageViewer.startRect ? `
                translate(${imageViewer.startRect.x}px, ${imageViewer.startRect.y}px)
                scale(${imageViewer.startRect.width / window.innerWidth})
              ` : 'scale(0.8)'
            }}
          >
            <div className="absolute top-4 right-4 z-50">
              <Button
                variant="ghost"
                size="icon"
                className="bg-black/20 hover:bg-black/40 text-white"
                onClick={() => setImageViewer({ isOpen: false, currentIndex: -1 })}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="relative w-full h-full max-w-7xl mx-auto px-4">
              <div className="absolute left-4 top-38">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-white/20 hover:bg-white/40 text-white"
                  onClick={() => {
                    const prevIndex = (imageViewer.currentIndex - 1 + allImages.length) % allImages.length;
                    setImageViewer(prev => ({ ...prev, currentIndex: prevIndex }));
                  }}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
              </div>
              <div className="absolute right-4 top-38">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-white/20 hover:bg-white/40 text-white"
                  onClick={() => {
                    const nextIndex = (imageViewer.currentIndex + 1) % allImages.length;
                    setImageViewer(prev => ({ ...prev, currentIndex: nextIndex }));
                  }}
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </div>
              <div className="h-[80vh] flex flex-col">
                                <div className="h-full flex flex-col items-center justify-center pt-46">
                  <div className="text-white text-lg font-medium mb-4">
                    {allImages[imageViewer.currentIndex].title || ''}
                  </div>
                  <img
                    src={allImages[imageViewer.currentIndex].url}
                    alt={allImages[imageViewer.currentIndex].title || '이미지'}
                    className="max-w-full max-h-full object-contain transition-all duration-300 rounded-lg"
                  />
                </div>
               
                <div className="bg-black/50 text-white p-4 mt-0 rounded-b-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={allImages[imageViewer.currentIndex].author?.photoURL || '/Image/defaultLogo.png'}
                        alt="프로필"
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-sm">
                        {allImages[imageViewer.currentIndex].author?.displayName || '사용자'}
                      </span>
                    </div>
                    <span className="text-sm">
                      {dayjs(allImages[imageViewer.currentIndex].date).format('YY.MM.DD')}
                    </span>
                  </div>
            
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  // 스타일 설정 UI 렌더링
  const renderColorSettings = () => {
    if (!pathname?.startsWith('/editor')) return null;

    return (
      <div className="w-full max-w-[1200px] mb-4">
        <button
          onClick={() => setShowColorSettings(!showColorSettings)}
          className="w-full p-2 rounded-lg mb-2 hover:bg-opacity-30 transition-all"
          style={{ 
            backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
            color: styleSettings.textColor 
          }}
        >
          다이어리 스타일 설정 {showColorSettings ? '닫기' : '열기'}
        </button>

        {showColorSettings && (
          <div className="flex flex-col gap-4 bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-700">
            {/* 배경색 설정 */}
            <div className="flex flex-col gap-2 bg-gray-700/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">배경색</span>
                <div className="flex flex-wrap gap-1">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color}
                      onClick={() => saveStyleSettings({ ...styleSettings, bgColor: color })}
                      className={cn(
                        "w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110",
                        styleSettings.bgColor === color && "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">투명도</span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={styleSettings.bgOpacity ?? 0.2}
                  onChange={(e) => saveStyleSettings({ ...styleSettings, bgOpacity: parseFloat(e.target.value) })}
                  className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-100 w-12 text-right">
                  {(styleSettings.bgOpacity ?? 0.2).toFixed(1)}
                </span>
              </div>
            </div>

            {/* 텍스트 색상 설정 */}
            <div className="flex items-center gap-2 bg-gray-700/50 p-3 rounded-lg">
              <span className="text-sm font-medium text-gray-100 w-24">텍스트</span>
              <div className="flex flex-wrap gap-1">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={`text-${color}`}
                    onClick={() => saveStyleSettings({ ...styleSettings, textColor: color })}
                    className={cn(
                      "w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110",
                      styleSettings.textColor === color && "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* 그림자 설정 */}
            <div className="flex flex-col gap-4 bg-gray-700/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">모서리</span>
                <select
                  value={styleSettings.rounded || 'md'}
                  onChange={(e) => saveStyleSettings({ ...styleSettings, rounded: e.target.value })}
                  className="px-3 py-1.5 bg-gray-800 text-gray-100 rounded-lg border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="none">각진</option>
                  <option value="sm">약간 둥근</option>
                  <option value="md">둥근</option>
                  <option value="lg">많이 둥근</option>
                  <option value="full">완전 둥근</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">그림자</span>
                <select
                  value={styleSettings.shadow || 'none'}
                  onChange={(e) => saveStyleSettings({ ...styleSettings, shadow: e.target.value })}
                  className="px-3 py-1.5 bg-gray-800 text-gray-100 rounded-lg border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="none">없음</option>
                  <option value="sm">약한</option>
                  <option value="md">보통</option>
                  <option value="lg">강한</option>
                  <option value="retro">레트로</option>
                  <option value="float">플로팅</option>
                  <option value="glow">글로우</option>
                  <option value="inner">이너</option>
                  <option value="sharp">샤프</option>
                  <option value="soft">소프트</option>
                </select>
              </div>

              {/* 그림자 색상 설정 */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">그림자 색상</span>
                <div className="flex flex-wrap gap-1 max-w-[calc(100%-6rem)]">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={`shadow-${color}`}
                      onClick={() => saveStyleSettings({ ...styleSettings, shadowColor: color })}
                      className={cn(
                        "w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110",
                        styleSettings.shadowColor === color && "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* 그림자 투명도 설정 */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">그림자 투명도</span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={styleSettings.shadowOpacity ?? 0.2}
                  onChange={(e) => saveStyleSettings({ ...styleSettings, shadowOpacity: parseFloat(e.target.value) })}
                  className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-100 w-12 text-right">
                  {(styleSettings.shadowOpacity ?? 0.2).toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 공감하기 처리 함수
  const handleLike = async () => {
    if (!selectedDiary || !selectedCategory) return;

    // 권한 체크
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }

    // 비공개 일기인 경우 권한 체크
    if (selectedDiary.isPrivate && 
        selectedDiary.author?.uid !== currentUser.uid && 
        finalUid !== currentUser.uid) {
      alert('비공개 일기는 작성자와 페이지 소유자만 공감할 수 있습니다.');
      return;
    }

    setIsLiking(true);
    try {
      const likeRef = collection(db, 'likes');
      const likeData = {
        userId: finalUid,
        username: username,
        diaryId: selectedDiary.id,
        category: selectedCategory,
        createdAt: new Date(),
        title: selectedDiary.title,
        content: selectedDiary.content,
        images: selectedDiary.images || [],
        isPrivate: selectedDiary.isPrivate || false,
        authorUid: currentUser.uid,  // 공감한 사용자 ID 추가
        reactions: {
          awesome: 0,
          cheer: 0,
          good: 0,
          sad: 0,
          surprise: 0
        }
      };
      await addDoc(likeRef, likeData);

      setLikeModalOpen(false);
      setShowSuccessModal(true);
      setSelectedCategory('');
    } catch (error) {
      console.error('공감 저장 중 오류:', error);
      alert('공감 저장 중 오류가 발생했습니다.');
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div className='pt-5 md:flex md:flex-col md:items-center md:justify-center md:w-full px-2'>
      {/* 공감하기 모달 */}
      <Dialog open={likeModalOpen} onOpenChange={setLikeModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>공감하기</DialogTitle>
            <DialogDescription>
              이 일기에 공감하고 싶은 카테고리를 선택해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <p className="text-gray-700 whitespace-pre-wrap mb-6">
              {selectedDiary?.content}
            </p>
            {selectedDiary?.images && selectedDiary.images.length > 0 && (
              <div className="mb-6 grid grid-cols-2 gap-2">
                {selectedDiary.images.map((imageUrl, index) => (
                  <img
                    key={index}
                    src={imageUrl}
                    alt={`일기 이미지 ${index + 1}`}
                    className="w-full rounded-lg"
                  />
                ))}
              </div>
            )}
            <div className="flex items-center gap-4">
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleLike}
                disabled={isLiking || !selectedCategory}
                className="flex-1 bg-violet-500 hover:bg-violet-600 text-white"
              >
                {isLiking ? '저장 중...' : '공감하기'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 공감 완료 모달 */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-[400px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>공감이 저장되었습니다</DialogTitle>
            <DialogDescription>
              공감한 일기는 공감 한 조각 페이지에서 확인하실 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <p className="text-gray-600">
              공감 한 조각 페이지에서 확인하시겠습니까?
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowSuccessModal(false)}
              >
                닫기
              </Button>
              <Button
                className="bg-violet-500 hover:bg-violet-600 text-white"
                onClick={() => {
                  setShowSuccessModal(false);
                  window.location.href = '/likes/all';
                }}
              >
                공감 한 조각으로 이동
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 글쓰기 모달 */}
      <Dialog open={showWriteForm} onOpenChange={setShowWriteForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{dayjs(writeForm.selectedDate).format('YYYY년 MM월 DD일')} 일기 작성</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">제목</label>
              <input
                type="text"
                value={writeForm.title}
                onChange={(e) => setWriteForm({ ...writeForm, title: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="제목을 입력하세요"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">내용</label>
              <textarea
                value={writeForm.content}
                onChange={(e) => setWriteForm({ ...writeForm, content: e.target.value })}
                className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="오늘의 이야기를 적어보세요"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">사진</label>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('image-upload').click()}
                  >
                    사진 선택
                  </Button>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      const uploadedUrls = [];

                      for (const file of files) {
                        const fileRef = ref(storage, `diary/${finalUid}/${Date.now()}_${file.name}`);
                        await uploadBytes(fileRef, file);
                        const url = await getDownloadURL(fileRef);
                        uploadedUrls.push(url);
                      }

                      setWriteForm(prev => ({
                        ...prev,
                        images: [...prev.images, ...uploadedUrls]
                      }));
                    }}
                    className="hidden"
                  />
                </div>

                {/* 이미지 미리보기 */}
                {writeForm.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {writeForm.images.map((url, index) => (
                      <div key={index} className="aspect-square relative group">
                        <img
                          src={url}
                          alt={`업로드 이미지 ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          onClick={() => {
                            setWriteForm(prev => ({
                              ...prev,
                              images: prev.images.filter((_, i) => i !== index)
                            }));
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPrivate"
                checked={writeForm.isPrivate}
                onChange={(e) => setWriteForm({ ...writeForm, isPrivate: e.target.checked })}
                className="h-4 w-4"
              />
              <label htmlFor="isPrivate" className="text-sm font-medium">비공개</label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowWriteForm(false)}>
              취소
            </Button>
            <Button onClick={async () => {
              if (!writeForm.title.trim() || !writeForm.content.trim()) {
                alert('제목과 내용을 입력해주세요.');
                return;
              }

              try {
                const diaryRef = collection(db, 'users', finalUid, 'diary');
                const userInfo = {
                  uid: currentUser.uid,
                  displayName: currentUser.displayName || username || currentUser.email?.split('@')[0] || '익명',
                  photoURL: currentUser.photoURL || null,
                  email: currentUser.email || null
                };

                // undefined 값을 가진 필드 제거
                Object.keys(userInfo).forEach(key => {
                  if (userInfo[key] === undefined) {
                    delete userInfo[key];
                  }
                });

                                // 일기 데이터 준비
                const diaryData = {
                  ...writeForm,
                  createdAt: writeForm.selectedDate,
                  updatedAt: new Date().toISOString(),
                  author: userInfo,
                  authorUid: currentUser.uid,  // authorUid 필드는 규칙과 일치시키기 위해 필요
                  // 추가 필드
                  isPrivate: writeForm.isPrivate || false,
                  viewCount: 0,
                  likeCount: 0,
                  likedBy: []
                };

                await addDoc(diaryRef, diaryData);

                setShowWriteForm(false);
                setWriteForm({
                  title: '',
                  content: '',
                  images: [],
                  isPrivate: false,
                  selectedDate: new Date().toISOString()
                });
              } catch (error) {
                console.error('일기 저장 중 오류:', error);
                alert('일기 저장 중 오류가 발생했습니다.');
              }
            }}>
              저장
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 일기 상세보기 모달 */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDiary?.diaries ? (
                // 여러 일기가 있는 경우
                <span>{selectedDiary.date}의 일기</span>
              ) : (
                // 단일 일기인 경우
                  <div className="flex items-center gap-2">
                    {selectedDiary?.isPrivate && <Lock className="w-4 h-4" />}
                    <span className="font-medium">{selectedDiary?.title}</span>
                  </div>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {selectedDiary?.diaries ? (
              // 여러 일기 목록 표시
              <div className="space-y-4">
                {selectedDiary.diaries.map((diary) => (
                  <div 
                    key={diary.id}
                    className="p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex-1">
                        <h3 className="font-medium flex items-center gap-2 mb-2">
                          {diary.isPrivate && <Lock className="w-4 h-4" />}
                          {diary.title}
                        </h3>
                        <p className="text-gray-700 whitespace-pre-wrap mb-4">
                          {diary.content}
                        </p>
                        {diary.images && diary.images.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 mb-4">
                            {diary.images.map((imageUrl, index) => (
                              <img
                                key={index}
                                src={imageUrl}
                                alt={`일기 이미지 ${index + 1}`}
                                className="w-full rounded-lg cursor-pointer"
                                onClick={() => {
                                  setSelectedImage({
                                    url: imageUrl,
                                    title: diary.title,
                                    date: diary.createdAt
                                  });
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                        <div className="flex items-center gap-2">
                          <img
                            src={diary.author?.photoURL || '/Image/defaultLogo.png'}
                            alt="프로필"
                            className="w-6 h-6 rounded-full"
                            onError={(e) => {
                              e.target.src = '/Image/defaultLogo.png';
                            }}
                          />
                          <span className="text-sm text-gray-500">
                            {diary.author?.displayName || '사용자'}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {dayjs(diary.createdAt).format('YY.MM.DD')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // 단일 일기 표시
              <div className="flex flex-col h-full">
                <div className="flex-1">
                  <p className="text-gray-700 whitespace-pre-wrap mb-6">
                    {selectedDiary?.content}
                  </p>
                  {selectedDiary?.images && selectedDiary.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {selectedDiary.images.map((imageUrl, index) => (
                        <img
                          key={index}
                          src={imageUrl}
                          alt={`일기 이미지 ${index + 1}`}
                          className="w-full rounded-lg cursor-pointer"
                          onClick={() => {
                            setSelectedImage({
                              url: imageUrl,
                              title: selectedDiary.title,
                              date: selectedDiary.createdAt
                            });
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                  <div className="flex items-center gap-2">
                    <img
                      src={selectedDiary?.author?.photoURL || '/Image/defaultLogo.png'}
                      alt="프로필"
                      className="w-6 h-6 rounded-full"
                      onError={(e) => {
                        e.target.src = '/Image/defaultLogo.png';
                      }}
                    />
                    <span className="text-sm text-gray-500">
                      {selectedDiary?.author?.displayName || '사용자'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {selectedDiary?.createdAt && dayjs(selectedDiary.createdAt).format('YY.MM.DD')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 로그인 모달 */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md bg-white/10 backdrop-blur-sm border border-white/20">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-white text-center">로그인</DialogTitle>
            <p className="text-white/80 text-center mb-2">모두트리에 오신 것을 환영합니다!</p>
            {/KAKAOTALK/i.test(navigator?.userAgent) && (
              <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-yellow-200 text-sm text-center">
                  카카오톡 창 구글 로그인 미지원
                  <br />
                  아래 새창 열기 또는 카톡 로그인 이용하세요
                </p>
              </div>
            )}
          </DialogHeader>
          <div className="w-full flex flex-col gap-6 py-4">
            <button
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black font-semibold shadow hover:bg-gray-100 transition-all hover:scale-[1.02]"
              onClick={async () => {
                const auth = getAuth(app);
                const provider = new GoogleAuthProvider();
                try {
                  await auth.setPersistence(browserLocalPersistence);
                  const result = await signInWithPopup(auth, provider);
                  const user = result.user;

                  // Firestore에 사용자 정보 저장
                  const userRef = doc(db, "users", user.uid);
                  const userDoc = await getDoc(userRef);

                  if (!userDoc.exists()) {
                    await setDoc(userRef, {
                      email: user.email,
                      photoURL: user.photoURL,
                      provider: "google",
                      createdAt: serverTimestamp(),
                    });

                    // 기본 설정 저장
                    await setDoc(doc(db, "users", user.uid, "settings", "background"), {
                      type: 'image',
                      value: 'https://firebasestorage.googleapis.com/v0/b/mtree-e0249.firebasestorage.app/o/backgrounds%2F1752324410072_leaves-8931849_1920.jpg?alt=media&token=bda5d723-d54d-43d5-8925-16aebeec8cfa',
                      animation: true
                    });
                  }

                  // Redux store 업데이트
                  dispatch(setUser({
                    uid: user.uid,
                    email: user.email,
                    photoURL: user.photoURL,
                    displayName: user.displayName
                  }));

                  setShowLoginModal(false);
                } catch (error) {
                  console.error("Google login error", error);
                  alert("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
                }
              }}
            >
              <svg className="w-5 h-5" viewBox="0 0 533.5 544.3">
                <path
                  d="M533.5 278.4c0-18.5-1.5-37.1-4.7-55.3H272.1v104.8h147c-6.1 33.8-25.7 63.7-54.4 82.7v68h87.7c51.5-47.4 81.1-117.4 81.1-200.2z"
                  fill="#4285f4" />
                <path
                  d="M272.1 544.3c73.4 0 135.3-24.1 180.4-65.7l-87.7-68c-24.4 16.6-55.9 26-92.6 26-71 0-131.2-47.9-152.8-112.3H28.9v70.1c46.2 91.9 140.3 149.9 243.2 149.9z"
                  fill="#34a853" />
                <path
                  d="M119.3 324.3c-11.4-33.8-11.4-70.4 0-104.2V150H28.9c-38.6 76.9-38.6 167.5 0 244.4l90.4-70.1z"
                  fill="#fbbc04" />
                <path
                  d="M272.1 107.7c38.8-.6 76.3 14 104.4 40.8l77.7-77.7C405 24.6 339.7-.8 272.1 0 169.2 0 75.1 58 28.9 150l90.4 70.1c21.5-64.5 81.8-112.4 152.8-112.4z"
                  fill="#ea4335" />
              </svg>
              <span>Google로 로그인</span>
            </button>
            <KakaoAuthButton />
            <div className="w-full flex justify-end mt-2">
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  window.location.href = "/register";
                }}
                className="text-blue-300 hover:underline text-sm"
              >
                회원가입
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {renderColorSettings()}
      <Tabs defaultValue="calendar" className="w-full">
        <TabsList 
          className={cn(
            "grid w-full grid-cols-3 mb-8",
            styleSettings.rounded === 'none' && 'rounded-none',
            styleSettings.rounded === 'sm' && 'rounded',
            styleSettings.rounded === 'md' && 'rounded-lg',
            styleSettings.rounded === 'lg' && 'rounded-xl',
            styleSettings.rounded === 'full' && 'rounded-full'
          )}
          style={{ 
            backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
            color: styleSettings.textColor,
            boxShadow: (() => {
              const shadowColor = styleSettings.shadowColor 
                ? `rgba(${parseInt(styleSettings.shadowColor.slice(1, 3), 16)}, ${parseInt(styleSettings.shadowColor.slice(3, 5), 16)}, ${parseInt(styleSettings.shadowColor.slice(5, 7), 16)}, ${styleSettings.shadowOpacity ?? 0.2})`
                : 'rgba(0, 0, 0, 0.2)';
              
              switch (styleSettings.shadow) {
                case 'none': return 'none';
                case 'sm': return `0 1px 2px ${shadowColor}`;
                case 'md': return `0 4px 6px ${shadowColor}`;
                case 'lg': return `0 10px 15px ${shadowColor}`;
                case 'retro': return `8px 8px 0px 0px ${shadowColor}`;
                case 'float': return `0 10px 20px -5px ${shadowColor}`;
                case 'glow': return `0 0 20px ${shadowColor}`;
                case 'inner': return `inset 0 2px 4px ${shadowColor}`;
                case 'sharp': return `-10px 10px 0px ${shadowColor}`;
                case 'soft': return `0 5px 15px ${shadowColor}`;
                default: return 'none';
              }
            })()
          }}
        >
          <TabsTrigger 
            value="calendar" 
            className="data-[state=active]:bg-white/10"
            style={{ color: styleSettings.textColor }}
          >
            달력
          </TabsTrigger>
          <TabsTrigger 
            value="list"
            className="data-[state=active]:bg-white/10"
            style={{ color: styleSettings.textColor }}
          >
            목록
          </TabsTrigger>
          <TabsTrigger 
            value="gallery"
            className="data-[state=active]:bg-white/10"
            style={{ color: styleSettings.textColor }}
          >
            사진첩
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <CalendarView />
        </TabsContent>

        <TabsContent value="list">
          <ListView />
        </TabsContent>

        <TabsContent value="gallery">
          <GalleryView />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TodayDiary;
