'use client';

import React, { useEffect, useState } from 'react';
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

const db = getFirestore(app);

const CalendarWithEvents = ({ username, uid }) => {
  const pathname = usePathname();
  const isEditable = pathname.startsWith('/editor');
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [events, setEvents] = useState([]);
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmCount, setConfirmCount] = useState(0); // 확인 버튼 클릭 횟수
  const [newEvent, setNewEvent] = useState({
    title: '',
    startTime: '',
    endTime: ''
  });
  const [isMobile, setIsMobile] = useState(false);
  // --- 새로 추가된 상태 변수 ---
  const [showAddEventForm, setShowAddEventForm] = useState(false); // 일정 추가 폼 표시 여부

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
  const canDelete = isEditable
  ? finalUid
  : userRole === uid;

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
  }, [currentDate, finalUid]); // finalUid를 의존성 배열에 추가하여 사용자 변경 시 이벤트 재로드

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
    const filtered = events
      .filter(e => e.date === date.format('YYYY-MM-DD'))
      .sort((a, b) => getSortableHour(a.startTime) - getSortableHour(b.startTime));
    setSelectedEvents(filtered);
    setModalOpen(true);
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.startTime || !newEvent.endTime || !userRole) {
      alert("모든 필드를 채워주세요."); // 사용자에게 알림
      return;
    }

    const eventToAdd = {
      date: selectedDate.format('YYYY-MM-DD'),
      title: newEvent.title,
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
      confirmCount: 0, // 확인 횟수 초기값
    };

    try {
      const docRef = await addDoc(collection(db, 'users', finalUid, 'event'), eventToAdd);
      const newEventWithId = {
        id: docRef.id,
        ...eventToAdd,
      };

      // 상태를 직접 업데이트하여 즉시 UI에 반영 (onSnapshot이 다시 가져오기 전)
      // setEvents(prev => [...prev, newEventWithId]);
      // 현재 선택된 날짜의 이벤트 목록에도 추가
      setSelectedEvents(prev => [...prev, newEventWithId].sort((a, b) => getSortableHour(a.startTime) - getSortableHour(b.startTime)));

      setNewEvent({ title: '', startTime: '', endTime: '' });
      alert("일정이 추가되었습니다.");
      setShowAddEventForm(false); // 일정 추가 후 폼 숨기기
    } catch (error) {
      console.error("일정 추가 실패:", error);
      alert("일정 추가에 실패했습니다.");
    }
  };

  const handleDelete = async (id) => {
    if (!userRole) return;
    try {
      await deleteDoc(doc(db, 'users', finalUid, 'event', id));
      // 상태를 직접 업데이트하여 즉시 UI에 반영
      setEvents(prev => prev.filter(e => e.id !== id));
      setSelectedEvents(prev => prev.filter(e => e.id !== id));
      alert("일정이 삭제되었습니다.");
    } catch (error) {
      console.error("일정 삭제 실패:", error);
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
      <div className="flex items-center justify-between md:w-[320px] w-full bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 shadow-lg border border-blue-100/50 backdrop-blur-sm">
        <button onClick={handlePrevMonth} className="p-2.5 bg-white text-gray-700 rounded-xl font-semibold text-center shadow-md transition-all hover:bg-blue-50 hover:scale-105 active:bg-blue-100">
          <ChevronLeft className="w-5 h-5 text-blue-600" />
        </button>
        <h2 className="text-xl font-bold text-gray-800 tracking-tight">{currentDate.format('YY년 MM월')}</h2>
        <button onClick={handleNextMonth} className="p-2.5 bg-white text-gray-700 rounded-xl font-semibold text-center shadow-md transition-all hover:bg-blue-50 hover:scale-105 active:bg-blue-100">
          <ChevronRight className="w-5 h-5 text-blue-600" />
        </button>
      </div>

      {/* 캘린더 테이블 */}
      <div className="w-full overflow-x-auto">
        <div className="mx-auto max-w-[1100px] w-full">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
            <table className="table-fixed w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-blue-50">
                  {days.map((day, idx) => (
                    <th
                      key={day}
                      className={`py-4 px-3 text-start font-bold text-sm tracking-wide
                        ${idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-700'}`}
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.ceil(dates.length / 7) }).map((_, weekIdx) => (
                  <tr key={weekIdx} className="hover:bg-blue-50/30 transition-colors">
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
                          className={`align-top p-2 md:p-3 h-16 md:h-24 cursor-pointer transition-all duration-200
                            ${isCurrentMonth ? 'text-gray-800' : 'text-gray-400 bg-gray-50/30'}
                            ${isToday ? 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-900 shadow-inner rounded-2xl' : ''}
                            ${isSelected && !isToday ? 'bg-gradient-to-br from-indigo-50 to-blue-50 shadow-inner rounded-2xl' : ''}
                            ${idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : ''}
                            hover:bg-blue-50/50 hover:shadow-inner hover:rounded-2xl
                          `}
                        >
                          <div className="flex flex-col items-center gap-1.5 md:gap-2">
                            <div className="text-sm font-semibold">{date.date()}</div>
                            {dayEvents.length > 0 && (
                              <div className="flex items-center justify-center w-6 h-6 md:w-7 md:h-7 bg-blue-500 text-white text-[13px] md:text-[14px] font-bold rounded-full">
                                {dayEvents.length}
                              </div>
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

      {/* 일정 추가 섹션 */}
      {canDelete && (
        <div className="w-full max-w-[1100px] mt-2 p-6 rounded-3xl bg-gradient-to-br from-white to-blue-50 border border-blue-100/50 shadow-lg backdrop-blur-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800 tracking-tight">
              {selectedDate.format('YY년 MM월 DD일')}
            </h3>
            <Button
              onClick={() => setShowAddEventForm(prev => !prev)}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold shadow-lg transition-all hover:from-blue-600 hover:to-indigo-600 hover:scale-105 active:scale-95"
            >
              {showAddEventForm ? '닫기' : '일정 추가'}
            </Button>
          </div>

          {showAddEventForm && (
            <div className="space-y-4 bg-white p-5 rounded-2xl shadow-lg border border-blue-100/50">
              <input
                type="text"
                placeholder="일정 제목"
                value={newEvent.title}
                onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all text-gray-800 placeholder-gray-400"
              />

              <div className="flex gap-4">
                <select
                  value={newEvent.startTime}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, startTime: e.target.value }))}
                  className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all text-gray-800"
                >
                  <option value="">시작</option>
                  {predefinedTimes.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>

                <select
                  value={newEvent.endTime}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, endTime: e.target.value }))}
                  className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all text-gray-800"
                >
                  <option value="">종료</option>
                  {predefinedTimes.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleAddEvent}
                className="w-full p-3.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold shadow-lg transition-all hover:from-blue-600 hover:to-indigo-600 hover:scale-[1.02] active:scale-98"
              >
                일정 추가
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md rounded-3xl shadow-2xl border border-blue-100/50 bg-gradient-to-br from-white to-blue-50/50">
          <DialogHeader>
            <DialogTitle className="text-gray-800 font-bold tracking-tight">
              {selectedDate.format('YYYY년 MM월 DD일')} 일정
              {selectedEvents.length > 0 && (
                <span className="ml-2 text-sm text-blue-600">
                  총 {selectedEvents.length}개
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedEvents.length > 0 ? (
            <div className="space-y-4">
              <ul className="space-y-3 h-full max-h-[300px] overflow-y-auto mt-4">
                {selectedEvents.map((e) => (
                  <li key={e.id} className="border border-blue-100/50 p-4 rounded-xl flex justify-between items-center bg-white shadow-md hover:shadow-lg transition-all">
                    <div className="flex-1">
                      <div className="text-sm font-bold text-blue-900">{e.startTime} ~ {e.endTime}</div>
                      <div className="text-sm text-gray-600 mt-1 break-all">{e.title}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">
                        확인: <span className="text-blue-600 font-bold">{e.confirmCount || 0}</span>
                      </span>
                      <Button
                        onClick={() => handleConfirm(e.id)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold shadow-lg transition-all hover:from-blue-600 hover:to-indigo-600 hover:scale-105 active:scale-95"
                      >
                        확인
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await handleDelete(e.id);
                            setSelectedEvents((prev) => prev.filter((ev) => ev.id !== e.id));
                          }}
                          className="ml-2 p-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold shadow-lg transition-all hover:from-red-600 hover:to-red-700 hover:scale-105 active:scale-95"
                        >
                          삭제
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex justify-end pt-4 border-t border-blue-100/50">
                <Button
                  onClick={() => setModalOpen(false)}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold shadow-lg transition-all hover:from-blue-600 hover:to-indigo-600 hover:scale-105 active:scale-95"
                >
                  닫기
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <DialogDescription className="text-gray-500 mt-4 text-center py-8">등록된 일정이 없습니다.</DialogDescription>
              <div className="flex justify-end pt-4 border-t border-blue-100/50">
                <Button
                  onClick={() => setModalOpen(false)}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold shadow-lg transition-all hover:from-blue-600 hover:to-indigo-600 hover:scale-105 active:scale-95"
                >
                  닫기
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarWithEvents;