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
} from 'firebase/firestore';
import app from '@/firebase';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSelector } from 'react-redux';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const db = getFirestore(app);

const COLOR_PALETTE = [
  "#000000", "#FFFFFF", "#F87171", "#FBBF24",
  "#34D399", "#60A5FA", "#A78BFA", "#F472B6",
];

const CalendarWithEvents = ({ username, uid, isEditable, isAllowed }) => {
  const pathname = usePathname();
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [styleSettings, setStyleSettings] = useState({
    bgColor: '#60A5FA',
    textColor: '#FFFFFF',
    bgOpacity: 0.2,
    shadow: 'none'  // 그림자 설정 추가
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
    if (isEditable || currentUser.uid === uid) return true;
    return isAllowed;  // isAllowed prop 사용
  }, [currentUser, isEditable, uid, isAllowed]);

  // canDelete 수정
  const canDelete = isEditable || userRole === uid;  // 소유자와 편집 모드만 삭제 가능

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

  const dates = [];
  let current = startDate;

  while (current.isBefore(endDate) || current.isSame(endDate)) {
    dates.push(current);
    current = current.add(1, 'day');
  }

  const handlePrevMonth = () => setCurrentDate(prev => prev.subtract(1, 'month'));
  const handleNextMonth = () => setCurrentDate(prev => prev.add(1, 'month'));

  useEffect(() => {
    if (!finalUid) return;
    
    const start = startOfMonth.format('YYYY-MM-DD');
    const end = endOfMonth.format('YYYY-MM-DD');

    const q = query(
      collection(db, 'users', finalUid, 'event'),
      where('date', '>=', start),
      where('date', '<=', end)
    );

    // 이벤트 리스너 등록
    const unsubscribe = onSnapshot(q, snapshot => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        confirmCount: doc.data().confirmCount || 0
      }));
      
      // 중복 제거를 위해 id 기준으로 필터링
      const uniqueEvents = list.reduce((acc, current) => {
        if (!acc.find(item => item.id === current.id)) {
          acc.push(current);
        }
        return acc;
      }, []);

      setEvents(uniqueEvents);
    });

    return () => unsubscribe();
  }, [currentDate, finalUid]);

  useEffect(() => {
    // 초기 로드 시 오늘 날짜의 일정을 보여줌
    const today = dayjs();
    setSelectedDate(today);
    const todayEvents = events
      .filter(e => e.date === today.format('YYYY-MM-DD'))
      .sort((a, b) => getSortableHour(a.startTime) - getSortableHour(b.startTime));
    setSelectedEvents(todayEvents);
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
    const dateStr = date.format('YYYY-MM-DD');
    const filtered = events
      .filter(e => e.date === dateStr)
      .sort((a, b) => getSortableHour(a.startTime) - getSortableHour(b.startTime));
    setSelectedEvents(filtered);
    setModalOpen(true);
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
    if (!newEvent.title || !newEvent.startTime || !newEvent.endTime || !currentUser) {
      alert("모든 필드를 채워주세요.");
      return;
    }

    try {
      // 현재 사용자의 username 가져오기
      const username = await fetchUsername(currentUser.uid);

      const eventToAdd = {
        date: selectedDate.format('YYYY-MM-DD'),
        title: newEvent.title,
        content: newEvent.content || '',
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        confirmCount: 0,
        authorUid: currentUser.uid,
        authorEmail: currentUser.email || '',
        authorName: username || currentUser.displayName || currentUser.email?.split('@')[0] || '사용자'
      };

      const docRef = await addDoc(collection(db, 'users', finalUid, 'event'), eventToAdd);
      const newEventWithId = { id: docRef.id, ...eventToAdd };

      setSelectedEvents(prev => [...prev, newEventWithId].sort((a, b) => 
        getSortableHour(a.startTime) - getSortableHour(b.startTime))
      );

      setNewEvent({ title: '', content: '', startTime: '', endTime: '' });
      alert("일정이 추가되었습니다.");
      setShowAddEventForm(false);
    } catch (error) {
      console.error("일정 추가 실패:", error);
      alert("일정 추가에 실패했습니다.");
    }
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
        lastModified: new Date().toISOString(),
        lastModifiedBy: currentUser.uid
      });

      setEditingEvent(null);
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
      endTime: event?.endTime || ''
    });

    const [authorUsername, setAuthorUsername] = useState('사용자');

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
          ...formState
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
            authorUid: currentUser.uid,
            authorEmail: currentUser.email || '',
            authorName: authorUsername
          };

          await addDoc(collection(db, 'users', finalUid, 'event'), eventToAdd);
          setFormState({
            title: '',
            content: '',
            startTime: '',
            endTime: ''
          });
          alert("일정이 추가되었습니다.");
          setShowAddEventForm(false);
        } catch (error) {
          console.error("일정 추가 실패:", error);
          alert("일정 추가에 실패했습니다.");
        }
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4 bg-blue-500/20 p-5 rounded-2xl shadow-lg">
        <div className="flex gap-4">
          <input
            type="text"
            name="title"
            placeholder="일정 제목"
            value={formState.title}
            onChange={handleChange}
            className="w-[70%] p-3.5 bg-blue-500/20 border-none rounded-xl focus:ring-2 focus:ring-blue-400 transition-all text-white placeholder-white/50"
          />
          <div className="w-[30%] p-3.5 bg-blue-500/20 rounded-xl text-white/50 text-center truncate">
            {authorUsername}
          </div>
        </div>

        <textarea
          name="content"
          placeholder="일정 내용"
          value={formState.content}
          onChange={handleChange}
          className="w-full p-3.5 bg-blue-500/20 border-none rounded-xl focus:ring-2 focus:ring-blue-400 transition-all text-white placeholder-white/50 min-h-[80px] resize-none"
        />

        <div className="flex gap-4">
          <select
            name="startTime"
            value={formState.startTime}
            onChange={handleChange}
            className="w-1/2 p-3.5 bg-blue-500/20 border-none rounded-xl focus:ring-2 focus:ring-blue-400 transition-all text-white"
          >
            <option value="" className="bg-blue-500">시작 시간</option>
            {predefinedTimes.map(time => (
              <option key={time} value={time} className="bg-blue-500">{time}</option>
            ))}
          </select>

          <select
            name="endTime"
            value={formState.endTime}
            onChange={handleChange}
            className="w-1/2 p-3.5 bg-blue-500/20 border-none rounded-xl focus:ring-2 focus:ring-blue-400 transition-all text-white"
          >
            <option value="" className="bg-blue-500">종료 시간</option>
            {predefinedTimes.map(time => (
              <option key={time} value={time} className="bg-blue-500">{time}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="w-full p-3.5 bg-blue-500/30 text-white rounded-xl font-semibold shadow-lg transition-all hover:bg-blue-500/40 hover:scale-[1.02] active:scale-98"
        >
          {event ? '일정 수정' : '일정 추가'}
        </button>

        {event && (
          <button
            type="button"
            onClick={() => setEditingEvent(null)}
            className="w-full p-3.5 bg-gray-500/30 text-white rounded-xl font-semibold shadow-lg transition-all hover:bg-gray-500/40 hover:scale-[1.02] active:scale-98"
          >
            취소
          </button>
        )}
      </form>
    );
  };

  // renderEventList 함수 수정
  const renderEventList = (events) => {
    if (!events || events.length === 0) {
      return (
        <div className="text-white/70 text-center py-4">
          등록된 일정이 없습니다.
        </div>
      );
    }

    return events.map(event => (
      <div
        key={event.id}
        className="bg-gray-600/50 rounded-lg p-4 text-white space-y-3"
      >
        {editingEvent?.id === event.id ? (
          <EventForm event={event} />
        ) : (
          <>
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-lg">{event.title}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleConfirm(event.id)}
                  className="text-xs bg-gray-500/50 hover:bg-gray-500/70 px-2 py-1 rounded transition-colors"
                >
                  확인 ({event.confirmCount || 0})
                </button>
                {(canDelete || event.authorUid === currentUser?.uid) && (
                  <>
                    <button
                      onClick={() => setEditingEvent(event)}
                      className="text-xs bg-blue-500/30 hover:bg-blue-500/50 px-2 py-1 rounded transition-colors"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="text-xs bg-red-500/30 hover:bg-red-500/50 px-2 py-1 rounded transition-colors"
                    >
                      삭제
                    </button>
                  </>
                )}
              </div>
            </div>

            <p className="text-sm text-white/90 min-h-[1.5em]">
              {event.content || '내용 없음'}
            </p>

            <div className="flex justify-between items-center text-sm text-white/70">
              <span>{event.startTime} - {event.endTime}</span>
              <span>{usernames[event.authorUid] || event.authorName || '사용자'}</span>
            </div>
          </>
        )}
      </div>
    ));
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

    const SHADOW_OPTIONS = [
      { value: 'none', label: '없음' },
      { value: 'sm', label: '약하게' },
      { value: 'md', label: '보통' },
      { value: 'lg', label: '강하게' },
      { value: 'retro', label: '레트로' },
      { value: 'retro-black', label: '레트로-블랙' },
      { value: 'retro-sky', label: '레트로-하늘' },
      { value: 'retro-gray', label: '레트로-회색' },
      { value: 'retro-white', label: '레트로-하얀' },
    ];

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
          <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
            <div>
              <label className="text-white text-sm mb-2 block">배경색</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={`bg-${color}`}
                    onClick={() => saveStyleSettings({ ...styleSettings, bgColor: color })}
                    className="w-8 h-8 rounded-full border border-white/20"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-white text-sm mb-2 block">텍스트 색상</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={`text-${color}`}
                    onClick={() => saveStyleSettings({ ...styleSettings, textColor: color })}
                    className="w-8 h-8 rounded-full border border-white/20"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-white text-sm mb-2 block">배경 투명도</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={styleSettings.bgOpacity ?? 0.2}
                onChange={(e) => saveStyleSettings({ ...styleSettings, bgOpacity: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-white text-sm mb-2 block">그림자 효과</label>
              <select
                value={styleSettings.shadow}
                onChange={(e) => saveStyleSettings({ ...styleSettings, shadow: e.target.value })}
                className="w-full p-2 rounded-lg bg-gray-700 text-white border border-gray-600"
              >
                {SHADOW_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center w-full space-y-6 mt-8 px-2">
      {renderColorSettings()}
      {/* 월 선택 헤더 */}
      <div 
        className={cn(
          "flex items-center justify-between w-full max-w-[1100px] rounded-2xl p-4 backdrop-blur-sm mt-8",
          styleSettings.shadow === 'none' && 'shadow-none',
          styleSettings.shadow === 'sm' && 'shadow-sm',
          styleSettings.shadow === 'md' && 'shadow',
          styleSettings.shadow === 'lg' && 'shadow-lg',
          styleSettings.shadow === 'retro' && 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
          styleSettings.shadow === 'retro-black' && 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
          styleSettings.shadow === 'retro-sky' && 'shadow-[8px_8px_0px_0px_rgba(2,132,199,1)]',
          styleSettings.shadow === 'retro-gray' && 'shadow-[8px_8px_0px_0px_rgba(107,114,128,1)]',
          styleSettings.shadow === 'retro-white' && 'shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]'
        )}
        style={{ 
          backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
          color: styleSettings.textColor,
          ...(styleSettings.shadow?.includes('retro') && { 
            border: styleSettings.shadow === 'retro-sky' ? '2px solid rgb(2 132 199)' :
                    styleSettings.shadow === 'retro-gray' ? '2px solid rgb(107 114 128)' :
                    styleSettings.shadow === 'retro-white' ? '2px solid rgb(255 255 255)' :
                    '2px solid rgb(0 0 0)'
          })
        }}
      >
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
        <h2 className="text-xl font-bold tracking-tight" style={{ color: styleSettings.textColor }}>
          {currentDate.format('YY년 MM월')}
        </h2>
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

      {/* 캘린더 테이블 */}
      <div className="w-full">
        <div className="mx-auto max-w-[1100px] w-full">
          <div 
            className={cn(
              "rounded-3xl overflow-hidden backdrop-blur-sm",
              styleSettings.shadow === 'none' && 'shadow-none',
              styleSettings.shadow === 'sm' && 'shadow-sm',
              styleSettings.shadow === 'md' && 'shadow',
              styleSettings.shadow === 'lg' && 'shadow-lg',
              styleSettings.shadow === 'retro' && 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
              styleSettings.shadow === 'retro-black' && 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
              styleSettings.shadow === 'retro-sky' && 'shadow-[8px_8px_0px_0px_rgba(2,132,199,1)]',
              styleSettings.shadow === 'retro-gray' && 'shadow-[8px_8px_0px_0px_rgba(107,114,128,1)]',
              styleSettings.shadow === 'retro-white' && 'shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]'
            )}
            style={{ 
              backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
              color: styleSettings.textColor,
              ...(styleSettings.shadow?.includes('retro') && { 
                border: styleSettings.shadow === 'retro-sky' ? '2px solid rgb(2 132 199)' :
                        styleSettings.shadow === 'retro-gray' ? '2px solid rgb(107 114 128)' :
                        styleSettings.shadow === 'retro-white' ? '2px solid rgb(255 255 255)' :
                        '2px solid rgb(0 0 0)'
              })
            }}
          >
            <table className="table-fixed w-full border-collapse">
              <thead>
                <tr style={{ backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.3) * 255).toString(16).padStart(2, '0')}` }}>
                  {days.map((day, idx) => (
                    <th
                      key={day}
                      className={`py-4 px-3 text-start font-bold text-sm tracking-wide
                        ${idx === 0 ? 'text-red-300' : idx === 6 ? 'text-blue-300' : ''}`}
                      style={{ color: idx === 0 ? '#FCA5A5' : idx === 6 ? '#93C5FD' : styleSettings.textColor }}
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.ceil(dates.length / 7) }).map((_, weekIdx) => (
                  <tr key={weekIdx}>
                    {dates.slice(weekIdx * 7, weekIdx * 7 + 7).map((date, idx) => {
                      const dateStr = date.format('YYYY-MM-DD');
                      const isCurrentMonth = date.month() === currentDate.month();
                      const isToday = date.isSame(dayjs(), 'day');
                      const isSelected = date.isSame(selectedDate, 'day');
                      const dayEvents = events.filter(e => e.date === dateStr);

                      return (
                        <td
                          key={dateStr}
                          onClick={() => handleDateClick(date)}
                          className={`align-top p-2 md:p-3 h-16 md:h-24 cursor-pointer transition-all duration-200 hover:bg-opacity-30
                            ${isToday ? 'rounded-xl' : ''}
                            ${isSelected ? 'bg-opacity-40' : ''}`}
                          style={{ 
                            backgroundColor: isToday || isSelected ? `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.3) * 255).toString(16).padStart(2, '0')}` : 'transparent',
                            color: isCurrentMonth ? styleSettings.textColor : `${styleSettings.textColor}80`
                          }}
                        >
                          <div className="flex flex-col h-full items-center gap-2">
                            <span className={`inline-block w-7 h-7 text-center leading-7`}
                              style={{ color: styleSettings.textColor }}>
                              {date.date()}
                            </span>
                            {dayEvents.length > 0 && (
                              <span 
                                className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold shadow-lg transition-colors hover:bg-opacity-60"
                                style={{ 
                                  backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.5) * 255).toString(16).padStart(2, '0')}`,
                                  color: styleSettings.textColor 
                                }}
                              >
                                {dayEvents.length}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 일정 리스트 섹션 */}
      <div className="w-full max-w-[1100px] mt-2">
        <div 
          className={cn(
            "p-6 rounded-3xl backdrop-blur-sm space-y-4",
            styleSettings.shadow === 'none' && 'shadow-none',
            styleSettings.shadow === 'sm' && 'shadow-sm',
            styleSettings.shadow === 'md' && 'shadow',
            styleSettings.shadow === 'lg' && 'shadow-lg',
            styleSettings.shadow === 'retro' && 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
            styleSettings.shadow === 'retro-black' && 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
            styleSettings.shadow === 'retro-sky' && 'shadow-[8px_8px_0px_0px_rgba(2,132,199,1)]',
            styleSettings.shadow === 'retro-gray' && 'shadow-[8px_8px_0px_0px_rgba(107,114,128,1)]',
            styleSettings.shadow === 'retro-white' && 'shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]'
          )}
          style={{ 
            backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
            color: styleSettings.textColor,
            ...(styleSettings.shadow?.includes('retro') && { 
              border: styleSettings.shadow === 'retro-sky' ? '2px solid rgb(2 132 199)' :
                      styleSettings.shadow === 'retro-gray' ? '2px solid rgb(107 114 128)' :
                      styleSettings.shadow === 'retro-white' ? '2px solid rgb(255 255 255)' :
                      '2px solid rgb(0 0 0)'
            })
          }}
        >
          {/* 헤더 영역 */}
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold pl-2" style={{ color: styleSettings.textColor }}>
              {selectedDate.format('M월 D일')}
            </h3>
            {canWrite && (
              <Button
                onClick={() => setShowAddEventForm(prev => !prev)}
                className="px-4 py-2.5 rounded-xl font-semibold shadow-lg transition-all hover:bg-opacity-40 hover:scale-105 active:scale-95"
                style={{ 
                  backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.3) * 255).toString(16).padStart(2, '0')}`,
                  color: styleSettings.textColor 
                }}
              >
                {showAddEventForm ? '닫기' : '일정 추가'}
              </Button>
            )}
          </div>

          {/* 구분선 */}
          <div className="border-t" style={{ borderColor: `${styleSettings.textColor}20` }}></div>

          {/* 일정 추가 폼 */}
          {canWrite && showAddEventForm && (
            <div className="py-4">
              <EventForm />
            </div>
          )}

          {/* 일정 목록 */}
          <div className="space-y-4">
            {renderEventList(selectedEvents)}
          </div>
        </div>
      </div>


    
     
    </div>
  );
};

export default CalendarWithEvents;