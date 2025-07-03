'use client';

import React, { useEffect, useState, useRef } from 'react';
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
import Script from 'next/script';

const db = getFirestore(app);

const CalendarWithEvents = ({ username, uid }) => {
  const pathname = usePathname();
  const isEditable = pathname.startsWith('/editor');
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [events, setEvents] = useState([]);
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmCount, setConfirmCount] = useState(0);
  const [newEvent, setNewEvent] = useState({
    title: '',
    startTime: '',
    endTime: ''
  });
  const [isMobile, setIsMobile] = useState(false);
  const [showAddEventForm, setShowAddEventForm] = useState(false);

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
  const canDelete = isEditable ? finalUid : userRole === uid;

  const dates = [];
  let current = startDate;

  while (current.isBefore(endDate) || current.isSame(endDate)) {
    dates.push(current);
    current = current.add(1, 'day');
  }

  const handlePrevMonth = () => setCurrentDate(prev => prev.subtract(1, 'month'));
  const handleNextMonth = () => setCurrentDate(prev => prev.add(1, 'month'));

  const fetchEventsForMonth = () => {
    const start = startOfMonth.format('YYYY-MM-DD');
    const end = endOfMonth.format('YYYY-MM-DD');

    const q = query(
      collection(db, 'users', finalUid, 'event'),
      where('date', '>=', start),
      where('date', '<=', end)
    );
    return onSnapshot(q, snapshot => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        confirmCount: doc.data().confirmCount || 0
      }));
      setEvents(list);
    });
  };

  useEffect(() => {
    const unsubscribe = fetchEventsForMonth();
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

  useEffect(() => {
    // 기존 Google 번역 요소들 제거
    const removeExistingElements = () => {
      const elements = document.querySelectorAll('.goog-te-banner-frame, .skiptranslate');
      elements.forEach(el => el.remove());
      
      const scripts = document.querySelectorAll('script[src*="translate.google.com"]');
      scripts.forEach(script => script.remove());
    };

    // Google 번역 위젯 초기화
    const initTranslate = () => {
      if (!window.google?.translate?.TranslateElement) return;
      
      try {
        removeExistingElements();
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'ko',
            includedLanguages: 'ko,zh-CN,vi,ne,uz,km,id,tl,my,th,en,ja,mn',
            layout: google.translate.TranslateElement.InlineLayout.VERTICAL,
            autoDisplay: false,
            multilanguagePage: true,
            uiLanguage: "en"
          },
          'google_translate_element'
        );

        // 스타일 조정
        setTimeout(() => {
          const selectElement = document.querySelector('.goog-te-combo');
          if (selectElement) {
            selectElement.style.backgroundColor = '#ffffff';
            selectElement.style.color = '#000000';
            selectElement.style.border = 'none';
            selectElement.style.borderRadius = '4px';
            selectElement.style.padding = '4px 8px';
            selectElement.style.fontSize = '14px';
            selectElement.style.outline = 'none';
            selectElement.style.width = '120px';
          }

          // 컨테이너 스타일 조정
          const container = document.querySelector('.goog-te-gadget');
          if (container) {
            container.style.fontSize = '12px';
            container.style.whiteSpace = 'nowrap';
          }
        }, 1000);
      } catch (error) {
        console.error('Google 번역 위젯 초기화 실패:', error);
      }
    };

    // 스크립트 로드 및 초기화
    if (!document.querySelector('script[src*="translate.google.com"]')) {
      window.googleTranslateElementInit = initTranslate;
      const script = document.createElement('script');
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.head.appendChild(script);
    } else if (window.google?.translate) {
      initTranslate();
    }

    return () => {
      removeExistingElements();
      delete window.googleTranslateElementInit;
    };
  }, []);

  const getSortableHour = (timeStr) => {
    const hour = parseInt(timeStr.split(':')[0], 10);
    return hour < 9 ? hour + 24 : hour;
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    const filtered = events
      .filter(e => e.date === date.format('YYYY-MM-DD'))
      .sort((a, b) => getSortableHour(a.startTime) - getSortableHour(b.startTime));
    setSelectedEvents(filtered);
    setModalOpen(true);
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.startTime || !newEvent.endTime || !userRole) {
      alert("모든 필드를 채워주세요.");
      return;
    }

    try {
      const eventToAdd = {
        date: selectedDate.format('YYYY-MM-DD'),
        title: newEvent.title,
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        confirmCount: 0,
      };

      const docRef = await addDoc(collection(db, 'users', finalUid, 'event'), eventToAdd);
      const newEventWithId = { id: docRef.id, ...eventToAdd };

      setSelectedEvents(prev => [...prev, newEventWithId].sort((a, b) => 
        getSortableHour(a.startTime) - getSortableHour(b.startTime))
      );

      setNewEvent({ title: '', startTime: '', endTime: '' });
      alert("일정이 추가되었습니다.");
      setShowAddEventForm(false);
    } catch {
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

  return (
    <div className="flex flex-col items-center w-full space-y-6 mt-8 px-2">
      {/* 월 선택 헤더 */}
      <div className="flex items-center justify-between md:w-[320px] w-full bg-blue-500/20 rounded-2xl p-4 shadow-lg backdrop-blur-sm">
        <button onClick={handlePrevMonth} className="p-2.5 bg-blue-500/20 text-white rounded-xl font-semibold text-center shadow-md transition-all hover:bg-blue-500/30">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-white tracking-tight">{currentDate.format('YY년 MM월')}</h2>
        <button onClick={handleNextMonth} className="p-2.5 bg-blue-500/20 text-white rounded-xl font-semibold text-center shadow-md transition-all hover:bg-blue-500/30">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 캘린더 테이블 */}
      <div className="w-full overflow-x-auto">
        <div className="mx-auto max-w-[1100px] w-full">
          <div className="bg-blue-500/20 rounded-3xl shadow-xl overflow-hidden backdrop-blur-sm">
            <table className="table-fixed w-full border-collapse">
              <thead>
                <tr className="bg-blue-500/10">
                  {days.map((day, idx) => (
                    <th
                      key={day}
                      className={`py-4 px-3 text-start font-bold text-sm tracking-wide
                        ${idx === 0 ? 'text-red-300' : idx === 6 ? 'text-blue-300' : 'text-white'}`}
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
                          className={`align-top p-2 md:p-3 h-16 md:h-24 cursor-pointer transition-all duration-200 hover:bg-blue-500/30
                            ${isCurrentMonth ? 'text-white' : 'text-white/50'}
                            ${isToday ? 'bg-blue-500/30 rounded-xl' : ''}
                            ${isSelected ? 'bg-blue-500/40' : ''}`}
                        >
                          <div className="flex flex-col h-full items-center gap-2">
                            <span className={`inline-block w-7 h-7 text-center leading-7
                              ${isToday ? 'text-white' : ''}`}>
                              {date.date()}
                            </span>
                            {dayEvents.length > 0 && (
                              <span className="flex items-center justify-center w-8 h-8 bg-blue-500/50 rounded-full text-sm font-semibold text-white shadow-lg hover:bg-blue-500/60 transition-colors">
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
        <div className="p-6 rounded-3xl bg-blue-500/20 backdrop-blur-sm space-y-4">
          {/* 헤더 영역 */}
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-white pl-2">
              {selectedDate.format('M월 D일')}
            </h3>
            <div id="google_translate_element"></div>
          </div>

          {/* 구분선 */}
          <div className="border-t border-white/10"></div>

          {/* 일정 목록 */}
          <div className="space-y-4">
            {selectedEvents.map(event => (
              <div
                key={event.id}
                className="bg-blue-500/30 rounded-lg p-4 text-white"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{event.title}</h3>
                    <p className="text-sm text-white/80">
                      {event.startTime} - {event.endTime}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleConfirm(event.id)}
                      className="text-xs bg-blue-500/30 hover:bg-blue-500/40 px-2 py-1 rounded transition-colors"
                    >
                      확인 ({event.confirmCount || 0})
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="text-xs bg-red-500/30 hover:bg-red-500/40 px-2 py-1 rounded transition-colors"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 일정 추가 섹션 */}
      {canDelete && (
        <div className="w-full max-w-[1100px] mt-2 p-6 rounded-3xl bg-blue-500/20 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white tracking-tight">
              {selectedDate.format('YY년 MM월 DD일')}
            </h3>
            <Button
              onClick={() => setShowAddEventForm(prev => !prev)}
              className="px-4 py-2.5 bg-blue-500/30 text-white rounded-xl font-semibold shadow-lg transition-all hover:bg-blue-500/40 hover:scale-105 active:scale-95"
            >
              {showAddEventForm ? '닫기' : '일정 추가'}
            </Button>
          </div>

          {showAddEventForm && (
            <div className="space-y-4 bg-blue-500/20 p-5 rounded-2xl shadow-lg">
              <input
                type="text"
                placeholder="일정 제목"
                value={newEvent.title}
                onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                className="w-full p-3.5 bg-blue-500/20 border-none rounded-xl focus:ring-2 focus:ring-blue-400 transition-all text-white placeholder-white/50"
              />

              <div className="flex gap-4">
                <select
                  value={newEvent.startTime}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, startTime: e.target.value }))}
                  className="w-full p-3.5 bg-blue-500/20 border-none rounded-xl focus:ring-2 focus:ring-blue-400 transition-all text-white"
                >
                  <option value="" className="bg-blue-500">시작</option>
                  {predefinedTimes.map(time => (
                    <option key={time} value={time} className="bg-blue-500">{time}</option>
                  ))}
                </select>

                <select
                  value={newEvent.endTime}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, endTime: e.target.value }))}
                  className="w-full p-3.5 bg-blue-500/20 border-none rounded-xl focus:ring-2 focus:ring-blue-400 transition-all text-white"
                >
                  <option value="" className="bg-blue-500">종료</option>
                  {predefinedTimes.map(time => (
                    <option key={time} value={time} className="bg-blue-500">{time}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleAddEvent}
                className="w-full p-3.5 bg-blue-500/30 text-white rounded-xl font-semibold shadow-lg transition-all hover:bg-blue-500/40 hover:scale-[1.02] active:scale-98"
              >
                일정 추가
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-blue-500/20 backdrop-blur-sm border-none">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedDate.format('YYYY년 MM월 DD일')}
            </DialogTitle>
            <DialogDescription className="text-white/80">
              일정을 확인하거나 추가할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          {/* 일정 목록 */}
          <div className="space-y-4">
            {selectedEvents.map(event => (
              <div
                key={event.id}
                className="bg-blue-500/30 rounded-lg p-4 text-white"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{event.title}</h3>
                    <p className="text-sm text-white/80">
                      {event.startTime} - {event.endTime}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleConfirm(event.id)}
                      className="text-xs bg-blue-500/30 hover:bg-blue-500/40 px-2 py-1 rounded transition-colors"
                    >
                      확인 ({event.confirmCount || 0})
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="text-xs bg-red-500/30 hover:bg-red-500/40 px-2 py-1 rounded transition-colors"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 일정 추가 폼 */}
          {canDelete && (
            <div className="mt-4">
              {!showAddEventForm ? (
                <Button
                  onClick={() => setShowAddEventForm(true)}
                  className="w-full bg-blue-500/30 hover:bg-blue-500/40 text-white border-none"
                >
                  + 일정 추가
                </Button>
              ) : (
                <div className="space-y-4 bg-blue-500/30 p-4 rounded-lg">
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="일정 제목"
                    className="w-full p-2 rounded bg-blue-500/20 text-white placeholder-white/50 border-none"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <select
                      value={newEvent.startTime}
                      onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                      className="p-2 rounded bg-blue-500/20 text-white border-none"
                    >
                      <option value="">시작 시간</option>
                      {predefinedTimes.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                    <select
                      value={newEvent.endTime}
                      onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                      className="p-2 rounded bg-blue-500/20 text-white border-none"
                    >
                      <option value="">종료 시간</option>
                      {predefinedTimes.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={() => {
                        setShowAddEventForm(false);
                        setNewEvent({ title: '', startTime: '', endTime: '' });
                      }}
                      className="bg-transparent hover:bg-blue-500/20 text-white"
                    >
                      취소
                    </Button>
                    <Button
                      onClick={handleAddEvent}
                      className="bg-blue-500/30 hover:bg-blue-500/40 text-white border-none"
                    >
                      추가
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarWithEvents;