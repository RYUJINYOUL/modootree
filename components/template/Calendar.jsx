'use client';

import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { cn } from "@/lib/utils";
import 'dayjs/locale/ko';
import { useRouter } from "next/navigation";
import useUIState from "@/hooks/useUIState";
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
import { usePathname } from 'next/navigation'
import app from '@/firebase';
import { ChevronLeft, ChevronRight, Trash } from 'lucide-react';

dayjs.locale('ko');
const db = getFirestore(app);

// ✅ 예시: 현재 사용자 역할
const userRole = '관리자'; // 관리자 또는 일반 사용자로 설정

const CalendarWithEvents = () => {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [events, setEvents] = useState([]);
  const pathname = usePathname()
  const { push } = useRouter();
  const [newEvent, setNewEvent] = useState({ time: '' });
  const [eventDates, setEventDates] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [newReser, setReser] = useState({
    name: '',
    phone: '',
    time: '',
  });
  const { homeCategory, setHomeCategory, setHeaderImageSrc, headerImageSrc} = useUIState();
  const predefinedTimes = [
    '교육 없음',
    '오전 9:00~13:00(4시간)',
    '오후 13:30~17:30(4시간)',
    '오전 9:00~13:00(4시간) / 오후 13:30~17:30(4시간)'
  ];


  const predefinedTimes2 = [
    '오전 9:00~13:00(4시간)',
    '오후 13:30~17:30(4시간)',
    '오전 9:00~13:00(4시간) / 오후 13:30~17:30(4시간)'
  ];

  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const days2 = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
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



  const handlePrevMonth = () => setCurrentDate(prev => prev.subtract(1, 'month'));
  const handleNextMonth = () => setCurrentDate(prev => prev.add(1, 'month'));

  // const fetchEventsForDate = () => {
  //   const formattedDate = selectedDate.format('YYYY-MM-DD');
  //   const q = query(collection(db, 'events'), where('date', '==', formattedDate));

  //   return onSnapshot(q, (snapshot) => {
  //     const list = snapshot.docs.map(doc => ({
  //       id: doc.id,
  //       ...doc.data(),
  //     }));
  //     setEvents(list);
  //   });
  // };

  // useEffect(() => {
  //   const unsubscribe = fetchEventsForDate();
  //   return () => unsubscribe();
  // }, [selectedDate]);


const onClickCategory = (item) => {
      setHomeCategory(item);
      push('/cal', {scroll: false})
  };

 const fetchEventsForMonth = () => {
    const start = startOfMonth.format('YYYY-MM-DD');
    const end = endOfMonth.format('YYYY-MM-DD');
    
    const q = query(
      collection(db, 'events'),
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
    const q = query(collection(db, 'events'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allDates = snapshot.docs.map(doc => doc.data().date);
      setEventDates([...new Set(allDates)]);
    });

    return () => unsubscribe();
  }, []);




  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);




  const handleAddEvent = async () => {
    if (!newEvent.time) return;
    if (userRole !== '관리자') return;

    await addDoc(collection(db, 'events'), {
      date: selectedDate.format('YYYY-MM-DD'),
      time: newEvent.time,
    });

    setNewEvent({ time: '' });
  };




  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'events', id));
  };





  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setReser((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!newReser.name || !newReser.phone || !newReser.time) {
      alert('모든 항목을 입력해주세요.');
      return;
    }

    try {
      await addDoc(collection(db, 'reservations'), {
        name: newReser.name,
        phone: newReser.phone,
        time: newReser.time,
        date: selectedDate.format('YYYY-MM-DD'),
      });
      alert('예약이 완료되었습니다.');
      setReser({ name: '', phone: '', time: '' });
    } catch (error) {
      console.error('Error adding document: ', error);
      alert('예약에 실패했습니다. 다시 시도해주세요.');
    }
  }



  return (
    <div className="flex flex-col items-center w-full space-y-10 mt-15 px-4">
      {/* Month Header */}
      <div className="flex items-center justify-between md:w-[300px] w-full">
        <button onClick={handlePrevMonth}><ChevronLeft /></button>
        <h2 className="text-xl font-bold">{currentDate.format('YYYY년 MM월')}</h2>
        <button onClick={handleNextMonth}><ChevronRight /></button>
      </div>

      {/* Calendar Table */}
      <div className="w-full overflow-x-auto">
        <div className="mx-auto max-w-[1100px] w-full">
          <table className="table-fixed w-full border-collapse">
            <thead>
              {isMobile 
               ? <tr className="bg-gray-100 border-b">
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
              : <tr className="bg-gray-100 border-b">
                {days2.map((day, idx) => (
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
                }
            </thead>
            <tbody>
              {Array.from({ length: Math.ceil(dates.length / 7) }).map((_, weekIdx) => (
                <tr key={weekIdx}>
                  {dates.slice(weekIdx * 7, weekIdx * 7 + 7).map((date, idx) => {
                    const dateStr = date.format('YYYY-MM-DD');
                    const isCurrentMonth = date.month() === currentDate.month();
                    const isToday = date.isSame(dayjs(), 'day');
                    const isSelected = date.isSame(selectedDate, 'day');
                    const hasEvent = eventDates.includes(dateStr);

                    return (
                      <td
                        key={dateStr}
                        onClick={() => 
                          pathname==='/'
                          ? onClickCategory("교육일정")
                          : setSelectedDate(date)}
                        className={`align-top p-2 md:h-20 h-16 border border-gray-200 cursor-pointer
                          ${isCurrentMonth ? 'text-black' : 'text-gray-400'}
                          ${isToday ? 'bg-blue-100' : ''}
                          ${isSelected ? 'bg-blue-300' : ''}
                          ${idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : ''}
                        `}
                      >
                        <div className="text-sm font-medium">{date.date()}</div>
                        {hasEvent && (
                          <div>
                          {/* className={`mt-1 text-xs space-y-1 ${
                          isMobile ? 'text-red-500' : 'text-blue-600'}`}> */}
                            {events.filter(event => event.date === dateStr)
                              .map((event, i) => (
                                <div
                                  key={i}
                                  className='text-[12px] text-[#333333]'
                                  // {event.time.includes('교육 없음') ? 'text-gray-500' : ''}
                                >
                                  {event.time.includes('오전')
                                  &&event.time.includes('오후')&&isMobile 
                                  ? (<>오전 <br /> 오후</>) 
                                  : event.time.includes('오전')
                                  &&isMobile 
                                  ? '오전' 
                                  : isMobile 
                                  ? '오후'
                                  : event.time.includes('/')
                                  ? event.time.split('/').map((part, index) => (<React.Fragment key={index}>{part.trim()}<br /></React.Fragment>))
                                  : event.time}
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

      {/* Event list and Add Form */}
      <div className={cn("w-full max-w-[1100px]", pathname === "/"&&'hidden')}>
        <h3 className="text-lg font-semibold mb-2">
          {selectedDate.format('YYYY년 MM월 DD일')}
        </h3>

        {/* Add Event Form (관리자만 보임) */}
        {userRole === '관리자' && (
          <div className="space-y-2">
            {/* <input
              type="text"
              placeholder="일정 제목"
              value={newEvent.title}
              onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
              className="w-full p-2 border rounded"
            /> */}
            <select
              value={newEvent.time}
              onChange={(e) => setNewEvent(prev => ({ ...prev, time: e.target.value }))}
              className="w-full p-2 border rounded"
            >
              <option value="">선택</option>
              {predefinedTimes.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
            <button
              onClick={handleAddEvent}
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              일정 추가
            </button>
          </div>
        )}

          {userRole === '일반인' && (
          <div className="space-y-2">
            {/* <input
              type="text"
              placeholder="일정 제목"
              value={newEvent.title}
              onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
              className="w-full p-2 border rounded"
            /> */}
            <select
              value={newEvent.time}
              onChange={(e) => setNewEvent(prev => ({ ...prev, time: e.target.value }))}
              className="w-full p-2 border rounded"
            >
              <option value="">선택</option>
              {predefinedTimes.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
            <button
              onClick={handleAddEvent}
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              일정 추가
            </button>
          </div>
        )}


        


        {userRole === '관리자' && (
            <div className="space-y-4 mt-3">
              <input
                type="text"
                name="name"
                placeholder="성함"
                value={newReser.name}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
              />
              <input
                type="tel"
                name="phone"
                placeholder="전화번호"
                value={newReser.phone}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
              />
              <select
                name="time"
                value={newReser.time}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
              >
                <option value="">시간 선택</option>
                {predefinedTimes2.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
              <button
                onClick={handleSubmit}
                className="w-full bg-blue-500 text-white p-2 rounded"
              >
                예약하기
              </button>
            </div>
          )}

        <ul className={`space-y-2 mb-6 mt-15 ${pathname === '/'&&'hidden'}`}>
          {events.length === 0 && (
            <p className="text-gray-500 text-sm">일정이 없습니다.</p>
          )}
          {events.map((event) => (
            
            <li key={event.id} className="md:hidden flex justify-between items-center border p-2 rounded">
              <div className='md:hidden flex flex-col w-full'>
              <span>{event.date}</span>
              <div className='md:hidden flex flex-row w-full text-[15px] text-[#999999]' >
                <span>{event.time.split('/').map((part, index) => (<React.Fragment key={index}>{part.trim()}<br /></React.Fragment>))}</span>
                <button className=
                {`pl-10 ${userRole === '관리자' ? 'block' : 'hidden'}`} onClick={() => handleDelete(event.id)}>
                  <Trash className="w-4 h-4 text-red-500" />
                </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      
    </div>
  );
};

export default CalendarWithEvents;