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
  const [newEvent, setNewEvent] = useState({
    title: '',
    startTime: '',
    endTime: ''
  });
  const [isMobile, setIsMobile] = useState(false);

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
      }));
      setEvents(list);
    });
  };

  useEffect(() => {
    const unsubscribe = fetchEventsForMonth();
    return () => unsubscribe();
  }, [currentDate]);

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
    if (!newEvent.title || !newEvent.startTime || !newEvent.endTime || !userRole) return;

    await addDoc(collection(db, 'users', finalUid, 'event'), {
      date: selectedDate.format('YYYY-MM-DD'),
      title: newEvent.title,
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
    });

    setNewEvent({ title: '', startTime: '', endTime: '' });
  };

  const handleDelete = async (id) => {
    if (!userRole) return;
    await deleteDoc(doc(db, 'users', finalUid, 'event', id));
  };

  return (
    <div className="flex flex-col items-center w-full space-y-10 mt-15 px-4">
      <div className="flex items-center justify-between md:w-[300px] w-full">
        <button onClick={handlePrevMonth}><ChevronLeft /></button>
        <h2 className="text-xl font-bold">{currentDate.format('YYYY년 MM월')}</h2>
        <button onClick={handleNextMonth}><ChevronRight /></button>
      </div>

      <div className="w-full overflow-x-auto">
        <div className="mx-auto max-w-[1100px] w-full">
          <table className="table-fixed w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b">
                {days.map((day, idx) => (
                  <th
                    key={day}
                    className={`p-2 border text-center border-gray-200 font-semibold ${
                      idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : ''
                    }`}
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
                        className={`align-top p-2 md:h-20 h-16 border border-gray-200 cursor-pointer
                          ${isCurrentMonth ? 'text-black' : 'text-gray-400'}
                          ${isToday ? 'bg-blue-100' : ''}
                          ${isSelected ? 'bg-blue-300' : ''}
                          ${idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : ''}
                        `}
                      >
                        <div className="text-[12px] font-medium line-clamp-2">{date.date()}</div>
                        {isMobile ? (
                          <div className="text-[12px]">
                            {dayEvents.slice(0, 1).map((event, i) => (
                              <div key={i} className='text-[#333333] truncate'>
                                {event.title}
                              </div>
                            ))}
                            {dayEvents.length > 1 && (
                              <div className="text-black text-[11px]">+ {dayEvents.length - 1}</div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-1 text-xs space-y-1">
                            {dayEvents.map((event, i) => (
                              <div key={i} className='text-[#333333] truncate'>
                                {event.title}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Event */}
         {canDelete && (
      <div className="w-full max-w-[1100px]">
        <h3 className="text-md font-semibold mb-2">
          {selectedDate.format('YYYY년 MM월 DD일')}
        </h3>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="일정 제목"
              value={newEvent.title}
              onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
              className="w-full p-2 border rounded"
            />

            <div className="flex gap-2">
              <select
                value={newEvent.startTime}
                onChange={(e) => setNewEvent(prev => ({ ...prev, startTime: e.target.value }))}
                className="w-full p-2 border rounded"
              >
                <option value="">시작 시간</option>
                {predefinedTimes.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>

              <select
                value={newEvent.endTime}
                onChange={(e) => setNewEvent(prev => ({ ...prev, endTime: e.target.value }))}
                className="w-full p-2 border rounded"
              >
                <option value="">종료 시간</option>
                {predefinedTimes.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleAddEvent}
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              일정 추가
            </button>
          </div>
      </div>
       )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedDate.format('YYYY년 MM월 DD일')} 일정</DialogTitle>
          </DialogHeader>
          {selectedEvents.length > 0 ? (
            <ul className="space-y-2 h-full overflow-y-auto mt-2">
              {selectedEvents.map((e) => (
                <li key={e.id} className="border p-2 rounded flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium">{e.startTime} ~ {e.endTime}</div>
                    <div className="text-sm text-gray-500">{e.title}</div>
                  </div>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await handleDelete(e.id);
                        setSelectedEvents((prev) => prev.filter((ev) => ev.id !== e.id));
                      }}
                      className="text-red-500"
                    >
                      삭제
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <DialogDescription className="text-gray-500 mt-2">일정이 없습니다.</DialogDescription>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarWithEvents;
