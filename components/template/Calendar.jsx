'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  increment,
  getDoc,
  setDoc,
  arrayUnion,
} from 'firebase/firestore';
import app from '@/firebase';
import { ChevronLeft, ChevronRight, Bell, BellOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSelector } from 'react-redux';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { sendNotification } from '@/lib/utils/notification-manager';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Input } from "@/components/ui/input";
import { VisuallyHidden } from '@/components/ui/visually-hidden';

const db = getFirestore(app);

const COLOR_PALETTE = [
  'transparent',
  '#000000', '#FFFFFF', '#F87171', '#FBBF24',
  '#34D399', '#60A5FA', '#A78BFA', '#F472B6',
];

const CalendarWithEvents = ({ username, uid, isEditable, isAllowed }) => {
  const pathname = usePathname();
  const router = useRouter();
  
  // 오늘 날짜 계산
  const today = dayjs();
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [isMonthView, setIsMonthView] = useState(false);
  const [styleSettings, setStyleSettings] = useState({
    bgColor: '#60A5FA',
    textColor: '#FFFFFF',
    bgOpacity: 0.2,
    shadow: 'none',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    rounded: 'md'
  });
  const [events, setEvents] = useState([]);
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmCount, setConfirmCount] = useState(0);
  const [newEvent, setNewEvent] = useState({
    title: '',
    content: '',
    startTime: '',
    endTime: ''
  });
  const [isMobile, setIsMobile] = useState(false);
  const [showAddEventForm, setShowAddEventForm] = useState(false);
  const [allowedUsers, setAllowedUsers] = useState([]);
  const [usernames, setUsernames] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [crop, setCrop] = useState({ unit: '%', width: 100, height: 100, x: 0, y: 0 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [zoomDialogOpen, setZoomDialogOpen] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);
  const imgRef = useRef(null);
  const [showReplyForm, setShowReplyForm] = useState(null); // 답글 폼 표시 상태
  const [replyContent, setReplyContent] = useState(''); // 답글 내용
  const [showEventList, setShowEventList] = useState(true); // 일정 목록 표시 상태 추가
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribeDialogOpen, setSubscribeDialogOpen] = useState(false);
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null); // 수정할 이벤트
  const [isAddingEvent, setIsAddingEvent] = useState(false); // 새 이벤트 추가 모드
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 3;

  const predefinedTimes = [
    '9:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00',
    '17:00', '18:00', '19:00', '20:00',
    '21:00', '22:00', '23:00', '24:00',
    '1:00', '2:00', '3:00', '4:00',
    '5:00', '6:00', '7:00', '8:00',
  ];

  const days = ['일', '월', '화', '수', '목', '금', '토'];

  const startOfMonth = currentDate.startOf('month');
  const endOfMonth = currentDate.endOf('month');
  const startDate = startOfMonth.startOf('week');
  const endDate = endOfMonth.endOf('week');

  const { currentUser } = useSelector((state) => state.user);
  const finalUid = uid ?? currentUser?.uid;
  const userRole = currentUser?.uid;

  // 권한 체크 함수 수정
  const canWrite = useMemo(() => {
    if (!currentUser) return false;
    if (isEditable || currentUser.uid === uid || currentUser.uid === finalUid) return true;
    return isAllowed;  // isAllowed prop 사용
  }, [currentUser, isEditable, uid, finalUid, isAllowed]);

  // canDelete 수정
  const canDelete = isEditable || userRole === uid || currentUser?.uid === finalUid;  // 소유자, 작성자, 편집 모드 삭제 가능

  // 허용된 사용자 목록 가져오기
  useEffect(() => {
    if (!finalUid) return;
    
    const unsubscribe = onSnapshot(
      doc(db, 'users', finalUid, 'settings', 'permissions'),
      (doc) => {
        if (doc.exists()) {
          setAllowedUsers(doc.data().allowedUsers || []);
        }
      }
    );

    return () => unsubscribe();
  }, [finalUid]);

  // 주 단위 날짜 계산
  const getWeekDates = () => {
    const startOfWeek = currentDate.startOf('week');
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      weekDates.push(startOfWeek.add(i, 'day'));
    }
    return weekDates;
  };

  // 월 이동 함수 수정
  const handlePrevMonth = () => {
    if (isMonthView) {
      const newDate = currentDate.subtract(1, 'month');
      setCurrentDate(newDate);
    } else {
      setIsMonthView(true);
    }
  };

  const handleNextMonth = () => {
    if (isMonthView) {
      const newDate = currentDate.add(1, 'month');
      setCurrentDate(newDate);
    } else {
      setIsMonthView(true);
    }
  };

  // 주 이동
  const handlePrevWeek = () => {
    const newDate = currentDate.subtract(1, 'week');
    setCurrentDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = currentDate.add(1, 'week');
    setCurrentDate(newDate);
  };

  // 날짜 배열 계산
  const dates = isMonthView ? (() => {
    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');
    const startDate = startOfMonth.startOf('week');
    const endDate = endOfMonth.endOf('week');

  const dates = [];
  let current = startDate;
  while (current.isBefore(endDate) || current.isSame(endDate)) {
    dates.push(current);
    current = current.add(1, 'day');
  }
    return dates;
  })() : (() => {
    // 주 보기일 때 현재 날짜 기준
    const baseDate = currentDate;
    const startOfWeek = baseDate.startOf('week');
    const dates = [];
    for (let i = 0; i < 7; i++) {
      dates.push(startOfWeek.add(i, 'day'));
    }
    return dates;
  })();

  // 이벤트 로드
  useEffect(() => {
    if (!finalUid) return;
    
    const eventsRef = collection(db, 'users', finalUid, 'event');
    const unsubscribe = onSnapshot(eventsRef, (snapshot) => {
      const eventList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEvents(eventList);
    });

    return () => unsubscribe();
  }, [finalUid]);

  // 초기 로드 시 오늘 날짜의 이벤트 필터링
  useEffect(() => {
    if (!events.length) return;

    const filtered = events.filter(event => 
      dayjs(event.date).format('YYYY-MM-DD') === today.format('YYYY-MM-DD')
    ).sort((a, b) => getSortableHour(a.startTime) - getSortableHour(b.startTime));
    
    setSelectedEvents(filtered);
  }, [events]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getSortableHour = (timeStr) => {
    const hour = parseInt(timeStr.split(':')[0], 10);
    return hour < 9 ? hour + 24 : hour;
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    const filtered = events.filter(event => 
      dayjs(event.date).format('YYYY-MM-DD') === date.format('YYYY-MM-DD')
    ).sort((a, b) => getSortableHour(a.startTime) - getSortableHour(b.startTime));
    
    setSelectedEvents(filtered);
    setShowEventList(true);
    setCurrentPage(1); // 페이지 초기화
  };

  // username 캐시 객체
  const usernameCache = {};

  // username을 가져오는 함수
  const fetchUsername = async (uid) => {
    if (!uid) return '사용자';
    
    // 캐시에 있으면 캐시된 값 반환
    if (usernameCache[uid]) return usernameCache[uid];
    
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const username = userDoc.data().username;
        // 캐시에 저장
        usernameCache[uid] = username;
        return username;
      }
      return '사용자';
    } catch (error) {
      console.error('username 가져오기 실패:', error);
      return '사용자';
    }
  };

  // 이벤트 목록이 변경될 때마다 username 가져오기
  useEffect(() => {
    const loadUsernames = async () => {
      const uniqueUids = [...new Set(events.map(event => event.authorUid))];
      for (const uid of uniqueUids) {
        await fetchUsername(uid);
      }
      // 상태 업데이트를 통해 리렌더링 트리거
      setUsernames({...usernameCache});
    };

    loadUsernames();
  }, [events]);

  // 이메일 마스킹 함수
  const maskEmail = (email) => {
    if (!email) return '';
    if (!email.includes('@')) return email;
    
    const [username, domain] = email.split('@');
    const domainParts = domain.split('.');
    const lastPart = domainParts[domainParts.length - 1];
    
    if (lastPart.length >= 2) {
      domainParts[domainParts.length - 1] = lastPart.slice(0, -2) + '**';
    }
    
    return `${username}@${domainParts.join('.')}`;
  };

  // 작성자 정보 표시 함수
  const renderAuthorInfo = async (event) => {
    if (!event.authorUid) return '사용자';
    
    try {
      const username = await fetchUsername(event.authorUid);
      if (username) return username;
      
      if (event.authorName) return event.authorName;
      if (event.authorEmail) return maskEmail(event.authorEmail);
      return '사용자';
    } catch (error) {
      console.error('작성자 정보 가져오기 실패:', error);
      return '사용자';
    }
  };

  const handleAddEvent = async () => {
    if (!currentUser) return;
    setSelectedEvent(null); // 새 이벤트 추가 모드로 전환
    setIsAddingEvent(true);
  };

  const handleDelete = async (id) => {
    if (!userRole) return;
    try {
      await deleteDoc(doc(db, 'users', finalUid, 'event', id));
      setEvents(prev => prev.filter(e => e.id !== id));
      setSelectedEvents(prev => prev.filter(e => e.id !== id));
      alert("일정이 삭제되었습니다.");
    } catch {
      alert("일정 삭제에 실패했습니다.");
    }
  };

  const handleImageClick = (image) => {
    setZoomImage(image);
    setZoomDialogOpen(true);
  };

  const handleImageSelect = async (e) => {
    if (e.target.files?.length) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setCurrentImage(reader.result);
        setCropDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async () => {
    if (!completedCrop || !imgRef.current) return;

    const canvas = document.createElement('canvas');
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    const croppedImage = canvas.toDataURL('image/jpeg');
    
    // 현재 편집 중인 이벤트가 있다면 해당 이벤트의 이미지를 업데이트
    if (editingEvent) {
      const newImages = [...(editingEvent.images || [])];
      if (imageIndex < 3) {
        newImages[imageIndex] = croppedImage;
      }
      setEditingEvent({
        ...editingEvent,
        images: newImages
      });
    }

    setCropDialogOpen(false);
    setCurrentImage(null);
    setCompletedCrop(null);
  };

  const handleConfirm = async (eventId) => {
    try {
      const eventRef = doc(db, 'users', finalUid, 'event', eventId);
      const currentEvent = events.find(e => e.id === eventId);
      
      if (currentEvent) {
        const newCount = (currentEvent.confirmCount || 0) + 1;
        await updateDoc(eventRef, {
          confirmCount: newCount
        });

        // 로컬 상태도 즉시 업데이트
        setEvents(prev => prev.map(e => 
          e.id === eventId ? { ...e, confirmCount: newCount } : e
        ));
        setSelectedEvents(prev => prev.map(e => 
          e.id === eventId ? { ...e, confirmCount: newCount } : e
        ));
      }
    } catch (error) {
      console.error("확인 횟수 업데이트 실패:", error);
      alert("확인 횟수 업데이트에 실패했습니다.");
    }
  };

  // 수정 핸들러 함수 추가
  const handleEdit = async (updatedEvent) => {
    if (!currentUser) return;
    
    try {
      const eventRef = doc(db, 'users', finalUid, 'event', updatedEvent.id);
      await updateDoc(eventRef, {
        title: updatedEvent.title,
        content: updatedEvent.content,
        startTime: updatedEvent.startTime,
        endTime: updatedEvent.endTime,
        images: updatedEvent.images || [],  // 이미지 배열 추가
        lastModified: new Date().toISOString(),
        lastModifiedBy: currentUser.uid,
        author: {
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || authorUsername,
          photoURL: currentUser.photoURL || '/Image/defaultLogo.png'
        }
      });

      setSelectedEvent(null); // 수정 완료 후 편집 모드 해제
      alert("일정이 수정되었습니다.");
    } catch (error) {
      console.error("일정 수정 실패:", error);
      alert("일정 수정에 실패했습니다.");
    }
  };

  // EventForm 컴포넌트 수정
  const EventForm = ({ event }) => {
    const [formState, setFormState] = useState({
      title: event?.title || '',
      content: event?.content || '',
      startTime: event?.startTime || '',
      endTime: event?.endTime || '',
      images: event?.images || []
    });

    const [authorUsername, setAuthorUsername] = useState('사용자');
    const [cropDialogOpen, setCropDialogOpen] = useState(false);
    const [currentImage, setCurrentImage] = useState(null);
    const [imageIndex, setImageIndex] = useState(0);
    const [crop, setCrop] = useState({ unit: '%', width: 100, height: 100, x: 0, y: 0 });
    const [completedCrop, setCompletedCrop] = useState(null);
    const [zoomDialogOpen, setZoomDialogOpen] = useState(false);
    const [zoomImage, setZoomImage] = useState(null);
    const imgRef = useRef(null);

    const handleImageSelect = async (e) => {
      if (e.target.files?.length) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = () => {
          setCurrentImage(reader.result);
          setCropDialogOpen(true);
        };
        reader.readAsDataURL(file);
      }
    };

    const handleCropComplete = async () => {
      if (!completedCrop || !imgRef.current) return;

      const canvas = document.createElement('canvas');
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
      canvas.width = completedCrop.width;
      canvas.height = completedCrop.height;
      const ctx = canvas.getContext('2d');

      ctx.drawImage(
        imgRef.current,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        completedCrop.width,
        completedCrop.height
      );

      const croppedImage = canvas.toDataURL('image/jpeg');
      
      setFormState(prev => {
        const newImages = [...(prev.images || [])];
        if (imageIndex < 3) {
          newImages[imageIndex] = croppedImage;
        }
        return { ...prev, images: newImages };
      });

      setCropDialogOpen(false);
      setCurrentImage(null);
      setCompletedCrop(null);
    };

    const handleImageClick = (image) => {
      setZoomImage(image);
      setZoomDialogOpen(true);
    };

    useEffect(() => {
      const fetchCurrentUsername = async () => {
        if (!currentUser?.uid) return;
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const username = userDoc.data().username;
            setAuthorUsername(username || '사용자');
          }
        } catch (error) {
          console.error('username 가져오기 실패:', error);
        }
      };

      fetchCurrentUsername();
    }, [currentUser?.uid]);

    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormState(prev => ({
        ...prev,
        [name]: value
      }));
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!formState.title || !formState.startTime || !formState.endTime || !currentUser) {
        alert("모든 필드를 채워주세요.");
        return;
      }

      if (event) {
        // 수정 모드
        await handleEdit({
          id: event.id,
          ...formState,
          images: formState.images  // 이미지 배열 추가
        });
      } else {
        // 새로운 일정 추가 모드
        try {
          const eventToAdd = {
            date: selectedDate.format('YYYY-MM-DD'),
            title: formState.title,
            content: formState.content || '',
            startTime: formState.startTime,
            endTime: formState.endTime,
            confirmCount: 0,
            author: {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: authorUsername,
              photoURL: currentUser.photoURL || '/Image/defaultLogo.png'
            },
            authorUid: currentUser.uid,
            authorEmail: currentUser.email || '',
            authorName: authorUsername,
            images: formState.images  // 이미지 배열 추가
          };

          // 1. 일정 추가
          const eventRef = await addDoc(collection(db, 'users', finalUid, 'event'), eventToAdd);

          // 2. 알림 생성
          await sendNotification(finalUid, {
            type: 'calendar',
            title: '새로운 일정이 등록되었습니다',
            content: `${eventToAdd.title} (${eventToAdd.date})`,
            sourceTemplate: 'calendar',
            metadata: {
              authorName: currentUser.displayName || authorUsername || '사용자',
              authorEmail: currentUser.email || '',
              postId: eventRef.id,
              eventDate: eventToAdd.date
            }
          }
          );
          setFormState({
            title: '',
            content: '',
            startTime: '',
            endTime: '',
            images: []
          });
          alert("일정이 추가되었습니다.");
          setIsAddingEvent(false);
        } catch (error) {
          console.error("일정 추가 실패:", error);
          alert("일정 추가에 실패했습니다.");
        }
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-2xl shadow-lg p-6">
        <div className="flex gap-4">
          <input
            type="text"
            name="title"
            placeholder="일정 제목"
            value={formState.title}
            onChange={handleChange}
            className="w-[70%] p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
          />
          <div className="w-[30%] p-3.5 bg-gray-50 rounded-xl text-gray-900 text-center truncate border border-gray-200">
            {authorUsername}
          </div>
        </div>

        <textarea
          name="content"
          placeholder="일정 내용"
          value={formState.content}
          onChange={handleChange}
          className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all text-gray-900 placeholder-gray-500 min-h-[80px] resize-none"
        />

        <div className="flex gap-4">
          <div className="w-1/2 space-y-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">시작 시간</label>
            <div className="relative">
          <select
            name="startTime"
            value={formState.startTime}
            onChange={handleChange}
                className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all text-gray-900 appearance-none"
          >
                <option value="" className="text-gray-500">선택</option>
            {predefinedTimes.map(time => (
                  <option 
                    key={time} 
                    value={time} 
                    className="text-gray-900"
                    disabled={formState.endTime && getSortableHour(time) >= getSortableHour(formState.endTime)}
                  >
                    {time}
                  </option>
            ))}
          </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="w-1/2 space-y-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">종료 시간</label>
            <div className="relative">
          <select
            name="endTime"
            value={formState.endTime}
            onChange={handleChange}
                className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all text-gray-900 appearance-none"
          >
                <option value="" className="text-gray-500">선택</option>
            {predefinedTimes.map(time => (
                  <option 
                    key={time} 
                    value={time} 
                    className="text-gray-900"
                    disabled={formState.startTime && getSortableHour(time) <= getSortableHour(formState.startTime)}
                  >
                    {time}
                  </option>
            ))}
          </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 이미지 업로드 섹션 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">이미지 (최대 3장)</label>
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((index) => (
              <div key={index} className="relative aspect-square">
                {formState.images?.[index] ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={formState.images[index]}
                      alt={`이미지 ${index + 1}`}
                      fill
                      className="object-cover rounded-lg cursor-pointer"
                      onClick={() => handleImageClick(formState.images[index])}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormState(prev => ({
                          ...prev,
                          images: prev.images.filter((_, i) => i !== index)
                        }));
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center w-full h-full border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        setImageIndex(index);
                        handleImageSelect(e);
                      }}
                    />
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full p-3.5 bg-blue-500 text-white rounded-xl font-semibold shadow-lg transition-all hover:bg-blue-600 hover:scale-[1.02] active:scale-98"
        >
          {event ? '일정 수정' : '일정 추가'}
        </button>

        {event && (
          <button
            type="button"
            onClick={() => setSelectedEvent(null)}
            className="w-full p-3.5 bg-gray-200 text-gray-700 rounded-xl font-semibold shadow-lg transition-all hover:bg-gray-300 hover:scale-[1.02] active:scale-98"
          >
            취소
          </button>
        )}

        {/* 이미지 크롭 다이얼로그 */}
        <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
          <DialogContent className="w-[95vw] md:w-[800px] p-4 max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold mb-2">이미지 크롭</DialogTitle>
            </DialogHeader>
            <div className="relative w-full overflow-auto max-h-[calc(70vh-100px)]">
              {currentImage && (
                <div className="min-h-[300px] flex items-center justify-center">
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={1}
                    className="w-full flex items-center justify-center"
                  >
                    <img
                      ref={imgRef}
                      src={currentImage}
                      alt="크롭할 이미지"
                      className="w-full h-[50vh] object-contain"
                      style={{
                        maxHeight: '50vh'
                      }}
                    />
                  </ReactCrop>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-gray-200">
              <Button 
                onClick={() => setCropDialogOpen(false)}
                className="px-4 py-2 text-sm"
                style={{ 
                  backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.3) * 255).toString(16).padStart(2, '0')}`,
                  color: styleSettings.textColor 
                }}
              >
                취소
              </Button>
              <Button 
                onClick={handleCropComplete}
                className="px-4 py-2 text-sm"
                style={{ 
                  backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.3) * 255).toString(16).padStart(2, '0')}`,
                  color: styleSettings.textColor 
                }}
              >
                적용
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 이미지 확대 다이얼로그 */}
        <Dialog open={zoomDialogOpen} onOpenChange={setZoomDialogOpen}>
          <DialogContent className="w-[90vw] md:w-[500px] max-h-[80vh] p-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold mb-2">이미지 보기</DialogTitle>
            </DialogHeader>
            <div className="relative w-full aspect-square">
              {zoomImage && (
                <Image
                  src={zoomImage}
                  alt="확대된 이미지"
                  fill
                  className="object-contain rounded-lg"
                  sizes="(max-width: 768px) 90vw, 500px"
                  priority
                />
              )}
            </div>
            <div className="flex justify-end mt-4">
              <Button 
                onClick={() => setZoomDialogOpen(false)}
                className="px-4 py-2 text-sm"
              >
                닫기
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </form>
    );
  };

  // 답글 버튼(토글) 클릭 핸들러
  const handleReplyClick = (eventId) => {
    if (!currentUser) {
      alert('답글을 작성하려면 로그인이 필요합니다.');
      window.location.href = '/login';
      return;
    }
    setShowReplyForm(showReplyForm === eventId ? null : eventId);
  };

  // 답글 저장 함수
  const handleAddReply = async (eventId) => {
    // 로그인 체크는 이미 버튼 클릭 핸들러에서 처리됨
    if (!replyContent.trim()) {
      alert('답글 내용을 입력해주세요.');
      return;
    }

    try {
      // 사용자 정보 가져오기
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      let authorName = '사용자';
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        authorName = userData.username || userData.displayName || currentUser.email?.split('@')[0] || '사용자';
      }

      const replyData = {
        content: replyContent,
        authorUid: currentUser.uid,
        authorName: authorName,
        createdAt: new Date().toISOString()
      };

      const eventRef = doc(db, 'users', finalUid, 'event', eventId);
      await updateDoc(eventRef, {
        replies: arrayUnion(replyData)
      });

      setReplyContent('');
      setShowReplyForm(null);
      alert('답글이 등록되었습니다.');
    } catch (error) {
      console.error('답글 등록 실패:', error);
      alert('답글 등록에 실패했습니다.');
    }
  };

  // 답글 등록 버튼 클릭 핸들러
  const handleReplySubmit = (e, eventId) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUser) {
      alert('답글을 작성하려면 로그인이 필요합니다.');
      window.location.href = '/login';
      return;
    }
    
    handleAddReply(eventId);
  };

  // 일정 목록 렌더링 함수 수정
  const renderEventList = (events) => {
    return events.map(event => (
      <div
        key={event.id}
        className={cn(
          "w-full rounded-xl p-5 transition-all hover:bg-opacity-30",
          styleSettings.rounded === 'none' && 'rounded-none',
          styleSettings.rounded === 'sm' && 'rounded',
          styleSettings.rounded === 'md' && 'rounded-lg',
          styleSettings.rounded === 'lg' && 'rounded-xl',
          styleSettings.rounded === 'full' && 'rounded-full',
        )}
        style={{ 
          backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
          color: styleSettings.textColor,
          boxShadow: (() => {
            const shadowColor = styleSettings.shadowColor 
              ? `rgba(${parseInt(styleSettings.shadowColor.slice(1, 3), 16)}, ${parseInt(styleSettings.shadowColor.slice(3, 5), 16)}, ${parseInt(styleSettings.shadowColor.slice(5, 7), 16)}, ${styleSettings.shadowOpacity ?? 0.2})`
              : 'rgba(0, 0, 0, 0.2)';
            
            switch (styleSettings.shadow) {
              case 'none':
                return 'none';
              case 'sm':
                return `0 1px 2px ${shadowColor}`;
              case 'md':
                return `0 4px 6px ${shadowColor}`;
              case 'lg':
                return `0 10px 15px ${shadowColor}`;
              case 'xl':
                return `0 20px 25px ${shadowColor}`;
              case 'retro':
                return `8px 8px 0px 0px ${shadowColor}`;
              case 'float':
                return `0 10px 20px -5px ${shadowColor}`;
              case 'glow':
                return `0 0 20px ${shadowColor}`;
              case 'inner':
                return `inset 0 2px 4px ${shadowColor}`;
              case 'sharp':
                return `-10px 10px 0px ${shadowColor}`;
              case 'soft':
                return `0 5px 15px ${shadowColor}`;
              case 'stripe':
                return `4px 4px 0 ${shadowColor}, 8px 8px 0 ${shadowColor}, 12px 12px 0 ${shadowColor}`;
              case 'cross':
                return `4px 4px 0 ${shadowColor}, -4px -4px 0 ${shadowColor}, 4px -4px 0 ${shadowColor}, -4px 4px 0 ${shadowColor}`;
              case 'diagonal':
                return `4px 4px 0 ${shadowColor}, 8px 8px 0 ${shadowColor}, 12px 12px 0 ${shadowColor}, -4px -4px 0 ${shadowColor}, -8px -8px 0 ${shadowColor}, -12px -12px 0 ${shadowColor}`;
              default:
                return `0 4px 6px ${shadowColor}`;
            }
          })(),
          borderColor: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(styleSettings.shadow || '') ? styleSettings.shadowColor || '#000000' : undefined,
          borderWidth: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(styleSettings.shadow || '') ? '2px' : undefined,
          borderStyle: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(styleSettings.shadow || '') ? 'solid' : undefined,
        }}
      >
        <div className="flex flex-col gap-3">
          {/* 제목과 버튼 */}
          <div className="flex items-start justify-between">
            <div className="text-lg font-semibold">{event.title}</div>
              <div className="flex items-center gap-2">
                <button
                onClick={() => handleReplyClick(event.id)}
                className="text-xs px-2 py-1 rounded transition-colors"
                style={{ 
                  backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.3) * 255).toString(16).padStart(2, '0')}`,
                  color: styleSettings.textColor 
                }}
              >
                답글 {event.replies?.length > 0 && `(${event.replies.length})`}
                </button>
              {(isEditable || event.authorUid === currentUser?.uid || currentUser?.uid === finalUid) && (
                  <>
                    <button
                    onClick={() => setSelectedEvent(event)}
                    className="text-xs px-2 py-1 rounded transition-colors"
                    style={{ 
                      backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.3) * 255).toString(16).padStart(2, '0')}`,
                      color: styleSettings.textColor 
                    }}
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                    className="text-xs px-2 py-1 rounded transition-colors"
                    style={{ 
                      backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.3) * 255).toString(16).padStart(2, '0')}`,
                      color: styleSettings.textColor 
                    }}
                    >
                      삭제
                    </button>
                  </>
                )}
              </div>
            </div>

          {/* 내용 */}
          {event.content && (
            <div className="text-sm whitespace-pre-wrap opacity-90">
              {event.content}
            </div>
          )}

          {/* 이미지 */}
          {event.images && event.images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto md:flex-wrap pb-2">
              {event.images.map((image, index) => (
                <div
                  key={index}
                  className="relative cursor-pointer flex-shrink-0 w-[100px] h-[100px]"
                  onClick={() => setZoomImage(image)}
                >
                  <Image
                    src={image}
                    alt={`Event image ${index + 1}`}
                    fill
                    sizes="100px"
                    className="rounded-lg object-cover"
                    unoptimized
                  />
            </div>
              ))}
            </div>
          )}

          {/* 답글 폼 */}
          {showReplyForm === event.id && (
            <div className="mt-3 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="로그인 후 답글 입력하세요"
                  className="flex-1 px-3 py-2 rounded-lg text-sm"
                  style={{ 
                    backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.3) * 255).toString(16).padStart(2, '0')}`,
                    color: styleSettings.textColor
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => handleReplySubmit(e, event.id)}
                  className="px-4 py-2 rounded-lg text-sm transition-colors"
                  style={{ 
                    backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.3) * 255).toString(16).padStart(2, '0')}`,
                    color: styleSettings.textColor 
                  }}
                >
                  등록
                </button>
              </div>

              {/* 답글 목록 */}
              {event.replies?.map((reply, idx) => (
                <div 
                  key={idx} 
                  className="rounded-lg p-3 text-sm"
                  style={{ 
                    backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.15) * 255).toString(16).padStart(2, '0')}`,
                    color: styleSettings.textColor 
                  }}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">{reply.authorName}</span>
                    <span className="opacity-70">
                      {dayjs(reply.createdAt).format('YY.MM.DD HH:mm')}
                    </span>
                  </div>
                  <p>{reply.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* 시간과 작성자 정보 */}
          <div className="flex justify-between items-center text-sm opacity-70 mt-auto pt-2 border-t" style={{ borderColor: `${styleSettings.textColor}20` }}>
            <div>{event.startTime} - {event.endTime}</div>
            <div className="flex items-center gap-2">
              <img
                src={event.author?.photoURL || '/Image/defaultLogo.png'}
                alt={event.author?.displayName || event.authorName || '사용자'}
                className="w-5 h-5 rounded-full object-cover"
                onError={(e) => { e.target.src = '/Image/defaultLogo.png' }}
              />
              <span>{event.author?.displayName || event.authorName || '사용자'}</span>
            </div>
          </div>
        </div>
      </div>
    ));
  };

  // 페이지네이션 처리된 이벤트 목록
  const paginatedEvents = useMemo(() => {
    const startIndex = 0;
    const endIndex = currentPage * eventsPerPage;
    return selectedEvents.slice(startIndex, endIndex);
  }, [selectedEvents, currentPage]);

  // 더보기 버튼 클릭 핸들러
  const handleLoadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  // 모달 내용 컴포넌트
  const ModalContent = () => (
    <div className="space-y-4">
      {selectedImage && (
        <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
          <Image
            src={selectedImage.url}
            alt={selectedImage.caption || '이미지'}
            fill
            sizes="(max-width: 768px) 100vw, 600px"
            className="object-cover"
          />
        </div>
      )}
      {canWrite ? (
        <EventForm />
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
  );

  // 스타일 설정 저장 함수
  const saveStyleSettings = async (newSettings) => {
    if (!finalUid) return;
    try {
      await setDoc(doc(db, 'users', finalUid, 'settings', 'calendar'), newSettings, { merge: true });
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
        const docRef = doc(db, 'users', finalUid, 'settings', 'calendar');
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

  const renderColorSettings = () => {
    if (!pathname?.startsWith('/editor')) return null;

    return (
      <div className="w-full max-w-[1100px] mb-4">
        <button
          onClick={() => setShowColorSettings(!showColorSettings)}
          className="w-full p-2 rounded-lg mb-2 hover:bg-opacity-30 transition-all"
          style={{ 
            backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
            color: styleSettings.textColor 
          }}
        >
          캘린더 스타일 설정 {showColorSettings ? '닫기' : '열기'}
        </button>

        {showColorSettings && (
          <div className="flex flex-col gap-4 bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-700">
            {/* 1. 배경색 설정 */}
            <div className="flex flex-col gap-2 bg-gray-700/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">배경색</span>
                <div className="flex flex-wrap gap-1 max-w-[calc(100%-6rem)]">
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

            {/* 2. 텍스트 색상 설정 */}
            <div className="flex items-center gap-2 bg-gray-700/50 p-3 rounded-lg">
              <span className="text-sm font-medium text-gray-100 w-24">텍스트</span>
              <div className="flex flex-wrap gap-1 max-w-[calc(100%-6rem)]">
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

            {/* 3. 그림자 색상 설정 */}
            <div className="flex flex-col gap-2 bg-gray-700/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">그림자</span>
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
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">투명도</span>
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

            {/* 4. 모서리와 그림자 스타일 설정 */}
            <div className="flex flex-col gap-4 bg-gray-700/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">모서리</span>
                <select
                  value={styleSettings.rounded || 'md'}
                  onChange={(e) => saveStyleSettings({ ...styleSettings, rounded: e.target.value })}
                  className="px-3 py-1.5 bg-gray-800 text-gray-100 rounded-lg border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32 overflow-y-auto"
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
                  className="px-3 py-1.5 bg-gray-800 text-gray-100 rounded-lg border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32 overflow-y-auto"
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
                  <option value="stripe">스트라이프</option>
                  <option value="cross">크로스</option>
                  <option value="diagonal">대각선</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 구독 상태 확인
  useEffect(() => {
    const checkSubscription = async () => {
      if (!currentUser || !finalUid) return;
      
      try {
        const subscriptionDoc = await getDoc(
          doc(db, 'users', finalUid, 'settings', 'subscribers')
        );
        
        if (subscriptionDoc.exists()) {
          const subscribers = subscriptionDoc.data().users || {};
          setIsSubscribed(!!subscribers[currentUser.uid]);
        }
      } catch (error) {
        console.error('구독 상태 확인 실패:', error);
      }
    };

    checkSubscription();
  }, [currentUser, finalUid]);

  // 이메일 유효성 검사
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // 이메일 입력 핸들러
  const handleEmailChange = (e) => {
    const email = e.target.value;
    setSubscribeEmail(email);
    setIsEmailValid(validateEmail(email));
  };

  const handleSubscription = async () => {
    if (!finalUid) {
      console.error('페이지 소유자 ID를 찾을 수 없습니다.');
      return;
    }

    try {
      const subscriptionRef = doc(db, 'users', finalUid, 'settings', 'subscribers');
      const subscriptionDoc = await getDoc(subscriptionRef);
      
      let subscribers = {};
      if (subscriptionDoc.exists()) {
        subscribers = subscriptionDoc.data().users || {};
      }

      // 이메일 유효성 검사
      if (!subscribeEmail || !validateEmail(subscribeEmail)) {
        alert('유효한 이메일 주소를 입력해주세요.');
        return;
      }

      // 이미 구독 중인 이메일인지 확인
      const isEmailSubscribed = Object.values(subscribers).some(
        subscriber => subscriber.email === subscribeEmail
      );

      if (isEmailSubscribed) {
        alert('이미 구독 중인 이메일입니다.');
        return;
      }

      // 새 구독 추가
      const subscriberId = `email_${Date.now()}`;
      const subscriberData = {
        email: subscribeEmail,
        subscribedAt: new Date().toISOString(),
        username: subscribeEmail.split('@')[0],
        uid: currentUser?.uid || null // 로그인한 사용자의 경우 uid 저장
      };

      subscribers[subscriberId] = subscriberData;
      await setDoc(subscriptionRef, { users: subscribers }, { merge: true });
      setIsSubscribed(true);
      setSubscribeDialogOpen(false);
      setSubscribeEmail('');
      alert('알림 구독이 완료되었습니다.');
    } catch (error) {
      console.error('구독 처리 실패:', error);
      alert('구독 처리에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  // 날짜 표시 함수 추가
  const formatDisplayDate = () => {
    return `${currentDate.year() - 2000}년 ${currentDate.month() + 1}월`;
  };

  // 특정 날짜의 이벤트 개수 계산
  const getEventCount = (date) => {
    return events.filter(event => 
      dayjs(event.date).format('YYYY-MM-DD') === date.format('YYYY-MM-DD')
    ).length;
  };

  return (
    <div className="flex flex-col items-center w-full space-y-6 mt-8 px-2">
      {renderColorSettings()}
      
      {/* 월 선택 헤더 */}
      <div className={cn(
          "flex items-center justify-between w-full max-w-[1100px] rounded-2xl p-4 backdrop-blur-sm mt-8",
          styleSettings.rounded === 'none' && 'rounded-none',
          styleSettings.rounded === 'sm' && 'rounded',
          styleSettings.rounded === 'md' && 'rounded-lg',
          styleSettings.rounded === 'lg' && 'rounded-xl',
          styleSettings.rounded === 'full' && 'rounded-full',
        )}
        style={{ 
          backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
          color: styleSettings.textColor,
          boxShadow: (() => {
            const shadowColor = styleSettings.shadowColor 
              ? `rgba(${parseInt(styleSettings.shadowColor.slice(1, 3), 16)}, ${parseInt(styleSettings.shadowColor.slice(3, 5), 16)}, ${parseInt(styleSettings.shadowColor.slice(5, 7), 16)}, ${styleSettings.shadowOpacity ?? 0.2})`
              : 'rgba(0, 0, 0, 0.2)';
            
            switch (styleSettings.shadow) {
              case 'none':
                return 'none';
              case 'sm':
                return `0 1px 2px ${shadowColor}`;
              case 'md':
                return `0 4px 6px ${shadowColor}`;
              case 'lg':
                return `0 10px 15px ${shadowColor}`;
            case 'xl':
              return `0 20px 25px ${shadowColor}`;
              case 'retro':
                return `8px 8px 0px 0px ${shadowColor}`;
              case 'float':
                return `0 10px 20px -5px ${shadowColor}`;
              case 'glow':
                return `0 0 20px ${shadowColor}`;
              case 'inner':
                return `inset 0 2px 4px ${shadowColor}`;
              case 'sharp':
                return `-10px 10px 0px ${shadowColor}`;
              case 'soft':
                return `0 5px 15px ${shadowColor}`;
              case 'stripe':
                return `4px 4px 0 ${shadowColor}, 8px 8px 0 ${shadowColor}, 12px 12px 0 ${shadowColor}`;
              case 'cross':
                return `4px 4px 0 ${shadowColor}, -4px -4px 0 ${shadowColor}, 4px -4px 0 ${shadowColor}, -4px 4px 0 ${shadowColor}`;
              case 'diagonal':
                return `4px 4px 0 ${shadowColor}, 8px 8px 0 ${shadowColor}, 12px 12px 0 ${shadowColor}, -4px -4px 0 ${shadowColor}, -8px -8px 0 ${shadowColor}, -12px -12px 0 ${shadowColor}`;
              default:
              return `0 4px 6px ${shadowColor}`;
            }
          })(),
          borderColor: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(styleSettings.shadow || '') ? styleSettings.shadowColor || '#000000' : undefined,
          borderWidth: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(styleSettings.shadow || '') ? '2px' : undefined,
          borderStyle: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(styleSettings.shadow || '') ? 'solid' : undefined,
      }}>
        {/* 왼쪽 화살표 */}
        <button 
          onClick={handlePrevMonth} 
          className="p-2.5 rounded-xl font-semibold text-center shadow-md transition-all hover:bg-opacity-30"
          style={{ 
            backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
            color: styleSettings.textColor 
          }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* 중앙 컨텐츠 */}
        <div className="flex items-center justify-center gap-4">
          {/* 날짜와 월/주 전환 */}
          <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold tracking-tight" style={{ color: styleSettings.textColor }}>
              {formatDisplayDate()}
        </h2>
            <button
              onClick={() => setIsMonthView(!isMonthView)}
              className="px-3 py-1.5 rounded-lg font-medium text-sm transition-all hover:bg-opacity-30"
              style={{ 
                backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
                color: styleSettings.textColor 
              }}
            >
              {isMonthView ? '주' : '월'}
            </button>
          </div>

          {/* 알림 버튼 */}
          {finalUid !== currentUser?.uid && (
            <button
              onClick={() => setSubscribeDialogOpen(true)}
              className="p-2 rounded-full transition-all hover:bg-opacity-30"
              style={{ 
                backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
                color: styleSettings.textColor 
              }}
              title={isSubscribed ? '알림 설정 변경' : '알림 구독하기'}
            >
              {isSubscribed ? (
                <Bell className="w-5 h-5" />
              ) : (
                <BellOff className="w-5 h-5" />
              )}
            </button>
          )}
        </div>

        {/* 오른쪽 화살표 */}
        <button 
          onClick={handleNextMonth} 
          className="p-2.5 rounded-xl font-semibold text-center shadow-md transition-all hover:bg-opacity-30"
          style={{ 
            backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
            color: styleSettings.textColor 
          }}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className={cn(
        "w-full max-w-[1100px] rounded-2xl p-4",
              styleSettings.rounded === 'none' && 'rounded-none',
              styleSettings.rounded === 'sm' && 'rounded',
              styleSettings.rounded === 'md' && 'rounded-lg',
              styleSettings.rounded === 'lg' && 'rounded-xl',
              styleSettings.rounded === 'full' && 'rounded-full',
            )}
            style={{ 
              backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
              color: styleSettings.textColor,
              boxShadow: (() => {
                const shadowColor = styleSettings.shadowColor 
                  ? `rgba(${parseInt(styleSettings.shadowColor.slice(1, 3), 16)}, ${parseInt(styleSettings.shadowColor.slice(3, 5), 16)}, ${parseInt(styleSettings.shadowColor.slice(5, 7), 16)}, ${styleSettings.shadowOpacity ?? 0.2})`
                  : 'rgba(0, 0, 0, 0.2)';
                
                switch (styleSettings.shadow) {
                  case 'none':
                    return 'none';
                  case 'sm':
                    return `0 1px 2px ${shadowColor}`;
                  case 'md':
                    return `0 4px 6px ${shadowColor}`;
                  case 'lg':
                    return `0 10px 15px ${shadowColor}`;
            case 'xl':
              return `0 20px 25px ${shadowColor}`;
                  case 'retro':
                    return `8px 8px 0px 0px ${shadowColor}`;
                  case 'float':
                    return `0 10px 20px -5px ${shadowColor}`;
                  case 'glow':
                    return `0 0 20px ${shadowColor}`;
                  case 'inner':
                    return `inset 0 2px 4px ${shadowColor}`;
                  case 'sharp':
                    return `-10px 10px 0px ${shadowColor}`;
                  case 'soft':
                    return `0 5px 15px ${shadowColor}`;
                  case 'stripe':
                    return `4px 4px 0 ${shadowColor}, 8px 8px 0 ${shadowColor}, 12px 12px 0 ${shadowColor}`;
                  case 'cross':
                    return `4px 4px 0 ${shadowColor}, -4px -4px 0 ${shadowColor}, 4px -4px 0 ${shadowColor}, -4px 4px 0 ${shadowColor}`;
                  case 'diagonal':
                    return `4px 4px 0 ${shadowColor}, 8px 8px 0 ${shadowColor}, 12px 12px 0 ${shadowColor}, -4px -4px 0 ${shadowColor}, -8px -8px 0 ${shadowColor}, -12px -12px 0 ${shadowColor}`;
                  default:
              return `0 4px 6px ${shadowColor}`;
                }
              })(),
              borderColor: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(styleSettings.shadow || '') ? styleSettings.shadowColor || '#000000' : undefined,
              borderWidth: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(styleSettings.shadow || '') ? '2px' : undefined,
              borderStyle: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(styleSettings.shadow || '') ? 'solid' : undefined,
      }}>
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
            <div
              key={day}
              className="text-center py-2 font-medium"
              style={{
                color: index === 0 ? '#FF4444' : index === 6 ? '#4444FF' : styleSettings.textColor
              }}
                    >
                      {day}
            </div>
          ))}
        </div>

        {/* 달력 그리드 */}
        <div className="grid grid-cols-7 gap-2">
          {isMonthView ? (
            // 월간 보기
            Array.from({ length: 42 }, (_, i) => {
              const date = currentDate.startOf('month').startOf('week').add(i, 'day');
                      const isCurrentMonth = date.month() === currentDate.month();
              const isToday = date.format('YYYY-MM-DD') === today.format('YYYY-MM-DD');
              const isSelected = date.format('YYYY-MM-DD') === selectedDate.format('YYYY-MM-DD');
              const eventCount = getEventCount(date);

                      return (
                <div
                  key={date.format('YYYY-MM-DD')}
                  className={cn(
                    "md:min-h-[100px] min-h-[60px] p-2 rounded-lg transition-all relative cursor-pointer",
                    isToday && "bg-blue-500/10",
                    isSelected && "ring-2 ring-blue-500",
                    !isCurrentMonth && "opacity-50"
                  )}
                          style={{ 
                    backgroundColor: isToday ? undefined : `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.1) * 255).toString(16).padStart(2, '0')}`,
                    color: date.day() === 0 ? '#FF4444' : date.day() === 6 ? '#4444FF' : styleSettings.textColor
                  }}
                  onClick={() => handleDateClick(date)}
                >
                  <div className="flex flex-col items-center">
                    <div className="font-medium mb-2">{date.date()}</div>
                    {eventCount > 0 && (
                      <div 
                        className="w-6 h-6 flex items-center justify-center text-sm font-medium rounded-full"
                                style={{ 
                          backgroundColor: `${styleSettings.bgColor}${Math.round(0.7 * 255).toString(16).padStart(2, '0')}`,
                          color: styleSettings.textColor,
                          boxShadow: `0 2px 4px ${styleSettings.bgColor}40`
                                }}
                              >
                        {eventCount}
                      </div>
                            )}
                          </div>
                </div>
              );
            })
          ) : (
            // 주간 보기
            dates.map(date => {
              const eventCount = getEventCount(date);
              const isToday = date.format('YYYY-MM-DD') === today.format('YYYY-MM-DD');
              const isSelected = date.format('YYYY-MM-DD') === selectedDate.format('YYYY-MM-DD');

              return (
                <div
                  key={date.format('YYYY-MM-DD')}
                  className={cn(
                    "md:min-h-[100px] min-h-[60px] p-2 rounded-lg transition-all relative cursor-pointer",
                    isToday && "bg-blue-500/10",
                    isSelected && "ring-2 ring-blue-500"
                  )}
                  style={{ 
                    backgroundColor: isToday ? undefined : `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.1) * 255).toString(16).padStart(2, '0')}`,
                    color: date.day() === 0 ? '#FF4444' : date.day() === 6 ? '#4444FF' : styleSettings.textColor
                  }}
                  onClick={() => handleDateClick(date)}
                >
                  <div className="flex flex-col items-center">
                    <div className="font-medium mb-2">{date.date()}</div>
                    {eventCount > 0 && (
                      <div 
                        className="w-6 h-6 flex items-center justify-center text-sm font-medium rounded-full"
                        style={{ 
                          backgroundColor: `${styleSettings.bgColor}${Math.round(0.7 * 255).toString(16).padStart(2, '0')}`,
                          color: styleSettings.textColor,
                          boxShadow: `0 2px 4px ${styleSettings.bgColor}40`
                        }}
                      >
                        {eventCount}
          </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 일정 관리 버튼들 */}
      <div className={cn(
        "flex items-center justify-between w-full max-w-[1100px] rounded-2xl p-4 backdrop-blur-sm",
            styleSettings.rounded === 'none' && 'rounded-none',
            styleSettings.rounded === 'sm' && 'rounded',
            styleSettings.rounded === 'md' && 'rounded-lg',
            styleSettings.rounded === 'lg' && 'rounded-xl',
            styleSettings.rounded === 'full' && 'rounded-full',
          )}
          style={{ 
            backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
            color: styleSettings.textColor,
            boxShadow: (() => {
              const shadowColor = styleSettings.shadowColor 
                ? `rgba(${parseInt(styleSettings.shadowColor.slice(1, 3), 16)}, ${parseInt(styleSettings.shadowColor.slice(3, 5), 16)}, ${parseInt(styleSettings.shadowColor.slice(5, 7), 16)}, ${styleSettings.shadowOpacity ?? 0.2})`
                : 'rgba(0, 0, 0, 0.2)';
              
              switch (styleSettings.shadow) {
                case 'none':
                  return 'none';
                case 'sm':
                  return `0 1px 2px ${shadowColor}`;
                case 'md':
                  return `0 4px 6px ${shadowColor}`;
                case 'lg':
                  return `0 10px 15px ${shadowColor}`;
            case 'xl':
              return `0 20px 25px ${shadowColor}`;
                case 'retro':
                  return `8px 8px 0px 0px ${shadowColor}`;
                case 'float':
                  return `0 10px 20px -5px ${shadowColor}`;
                case 'glow':
                  return `0 0 20px ${shadowColor}`;
                case 'inner':
                  return `inset 0 2px 4px ${shadowColor}`;
                case 'sharp':
                  return `-10px 10px 0px ${shadowColor}`;
                case 'soft':
                  return `0 5px 15px ${shadowColor}`;
                case 'stripe':
                  return `4px 4px 0 ${shadowColor}, 8px 8px 0 ${shadowColor}, 12px 12px 0 ${shadowColor}`;
                case 'cross':
                  return `4px 4px 0 ${shadowColor}, -4px -4px 0 ${shadowColor}, 4px -4px 0 ${shadowColor}, -4px 4px 0 ${shadowColor}`;
                case 'diagonal':
                  return `4px 4px 0 ${shadowColor}, 8px 8px 0 ${shadowColor}, 12px 12px 0 ${shadowColor}, -4px -4px 0 ${shadowColor}, -8px -8px 0 ${shadowColor}, -12px -12px 0 ${shadowColor}`;
                default:
              return `0 4px 6px ${shadowColor}`;
              }
            })(),
            borderColor: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(styleSettings.shadow || '') ? styleSettings.shadowColor || '#000000' : undefined,
            borderWidth: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(styleSettings.shadow || '') ? '2px' : undefined,
            borderStyle: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(styleSettings.shadow || '') ? 'solid' : undefined,
      }}>
        {/* 왼쪽: 선택된 날짜 */}
        <div className="text-lg font-semibold" style={{ color: styleSettings.textColor }}>
              {selectedDate.format('M월 D일')}
        </div>

        {/* 오른쪽: 일정 관리 버튼들 */}
        <div className="flex items-center gap-3">
          {/* 본인(페이지 소유자)이거나 허용된 사용자만 일정 추가 가능 */}
          {(currentUser?.uid === finalUid || isAllowed) && (
            <button
              onClick={handleAddEvent}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-all hover:bg-opacity-30"
                style={{ 
                backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
                  color: styleSettings.textColor 
                }}
              >
              일정+
            </button>
          )}

          <button
            onClick={() => setShowEventList(!showEventList)}
            className="px-4 py-2 rounded-lg font-medium text-sm transition-all hover:bg-opacity-30"
            style={{ 
              backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
              color: styleSettings.textColor 
            }}
          >
            {showEventList ? '닫기' : '열기'}
          </button>
        </div>
          </div>

      {/* 일정 추가/수정 폼 */}
      <Dialog open={!!selectedEvent || isAddingEvent} onOpenChange={() => {
        if (!currentUser?.uid === finalUid && !isAllowed) return;
        setSelectedEvent(null);
        setIsAddingEvent(false);
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {selectedEvent ? '일정 수정' : '새 일정 추가'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <EventForm event={selectedEvent} />
          </div>
        </DialogContent>
      </Dialog>

      {/* 일정 목록 */}
      {showEventList && (
        <div className="w-full max-w-[1100px] space-y-4">
          {selectedEvents.length > 0 ? (
            <>
              {renderEventList(paginatedEvents)}
              {paginatedEvents.length < selectedEvents.length && (
                <button
                  onClick={handleLoadMore}
                  className="w-full p-4 rounded-xl font-medium text-center transition-all hover:bg-opacity-30"
                  style={{ 
                    backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
                    color: styleSettings.textColor,
                    boxShadow: (() => {
                      const shadowColor = styleSettings.shadowColor 
                        ? `rgba(${parseInt(styleSettings.shadowColor.slice(1, 3), 16)}, ${parseInt(styleSettings.shadowColor.slice(3, 5), 16)}, ${parseInt(styleSettings.shadowColor.slice(5, 7), 16)}, ${styleSettings.shadowOpacity ?? 0.2})`
                        : 'rgba(0, 0, 0, 0.2)';
                      return `0 4px 6px ${shadowColor}`;
                    })()
                  }}
                >
                  더보기 ({paginatedEvents.length}/{selectedEvents.length})
                </button>
              )}
            </>
          ) : (
            <div 
              className={cn(
                "w-full rounded-xl p-6 text-center",
                styleSettings.rounded === 'none' && 'rounded-none',
                styleSettings.rounded === 'sm' && 'rounded',
                styleSettings.rounded === 'md' && 'rounded-lg',
                styleSettings.rounded === 'lg' && 'rounded-xl',
                styleSettings.rounded === 'full' && 'rounded-full',
              )}
              style={{ 
                backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
                color: styleSettings.textColor,
                boxShadow: (() => {
                  const shadowColor = styleSettings.shadowColor 
                    ? `rgba(${parseInt(styleSettings.shadowColor.slice(1, 3), 16)}, ${parseInt(styleSettings.shadowColor.slice(3, 5), 16)}, ${parseInt(styleSettings.shadowColor.slice(5, 7), 16)}, ${styleSettings.shadowOpacity ?? 0.2})`
                    : 'rgba(0, 0, 0, 0.2)';
                  
                  switch (styleSettings.shadow) {
                    case 'none':
                      return 'none';
                    case 'sm':
                      return `0 1px 2px ${shadowColor}`;
                    case 'md':
                      return `0 4px 6px ${shadowColor}`;
                    case 'lg':
                      return `0 10px 15px ${shadowColor}`;
                    case 'xl':
                      return `0 20px 25px ${shadowColor}`;
                    case 'retro':
                      return `8px 8px 0px 0px ${shadowColor}`;
                    case 'float':
                      return `0 10px 20px -5px ${shadowColor}`;
                    case 'glow':
                      return `0 0 20px ${shadowColor}`;
                    case 'inner':
                      return `inset 0 2px 4px ${shadowColor}`;
                    case 'sharp':
                      return `-10px 10px 0px ${shadowColor}`;
                    case 'soft':
                      return `0 5px 15px ${shadowColor}`;
                    case 'stripe':
                      return `4px 4px 0 ${shadowColor}, 8px 8px 0 ${shadowColor}, 12px 12px 0 ${shadowColor}`;
                    case 'cross':
                      return `4px 4px 0 ${shadowColor}, -4px -4px 0 ${shadowColor}, 4px -4px 0 ${shadowColor}, -4px 4px 0 ${shadowColor}`;
                    case 'diagonal':
                      return `4px 4px 0 ${shadowColor}, 8px 8px 0 ${shadowColor}, 12px 12px 0 ${shadowColor}, -4px -4px 0 ${shadowColor}, -8px -8px 0 ${shadowColor}, -12px -12px 0 ${shadowColor}`;
                    default:
                      return `0 4px 6px ${shadowColor}`;
                  }
                })(),
                borderColor: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(styleSettings.shadow || '') ? styleSettings.shadowColor || '#000000' : undefined,
                borderWidth: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(styleSettings.shadow || '') ? '2px' : undefined,
                borderStyle: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(styleSettings.shadow || '') ? 'solid' : undefined,
              }}
            >
              <p className="text-lg font-medium">
                {selectedDate.format('M월 D일')}의 일정은 준비 중입니다.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Email subscription dialog */}
      <Dialog open={subscribeDialogOpen} onOpenChange={setSubscribeDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">알림 구독하기</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              새로운 일정이 등록되면 이메일로 알림을 받아보세요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-sm font-medium">
                  이메일 주소
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={subscribeEmail}
                  onChange={handleEmailChange}
                  className="w-full"
                />
          </div>
              <Button
                onClick={handleSubscription}
                disabled={!isEmailValid}
                className="w-full"
              >
                구독하기
              </Button>
        </div>
      </div>
        </DialogContent>
      </Dialog>

      {/* 이미지 확대 다이얼로그 */}
      <Dialog open={!!zoomImage} onOpenChange={() => setZoomImage(null)}>
        <DialogContent className="sm:max-w-[800px] p-0">
          <DialogHeader>
            <VisuallyHidden>
              <DialogTitle>이미지 상세보기</DialogTitle>
            </VisuallyHidden>
          </DialogHeader>
          <div className="relative aspect-square w-full">
            {zoomImage && (
              <Image
                src={zoomImage}
                alt="Zoomed image"
                fill
                sizes="(max-width: 768px) 100vw, 800px"
                priority
                unoptimized
                className="object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarWithEvents;