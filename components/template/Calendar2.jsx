'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
  getDocs,
} from 'firebase/firestore';
import app from '@/firebase';
import { ChevronLeft, ChevronRight, Plus, X, Check, Calendar, Clock, Edit2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSelector } from 'react-redux';
import { usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const db = getFirestore(app);

const Calendar2 = ({ username, uid }) => {
  const pathname = usePathname();
  const isEditable = pathname.startsWith('/editor');
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [events, setEvents] = useState([]);
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    category: 'default',
  });
  const [isMobile, setIsMobile] = useState(false);
  const [showAddEventForm, setShowAddEventForm] = useState(false);
  const [monthStats, setMonthStats] = useState({
    total: 0,
    completed: 0,
  });

  const { currentUser } = useSelector((state) => state.user);
  const finalUid = uid ?? currentUser?.uid;
  const userRole = currentUser?.uid;
  const canEdit = isEditable ? finalUid : userRole === uid;

  const categories = [
    { id: 'default', name: '기본', color: 'bg-blue-500' },
    { id: 'work', name: '업무', color: 'bg-green-500' },
    { id: 'personal', name: '개인', color: 'bg-purple-500' },
    { id: 'important', name: '중요', color: 'bg-red-500' },
  ];

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0');
      slots.push(`${hour}:00`);
      slots.push(`${hour}:30`);
    }
    return slots;
  }, []);

  const days = ['일', '월', '화', '수', '목', '금', '토'];

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

      // 월간 통계 계산
      const stats = {
        total: list.length,
        completed: list.filter(event => event.isCompleted).length,
      };
      setMonthStats(stats);
    });
  };

  useEffect(() => {
    const unsubscribe = fetchEventsForMonth();
    return () => unsubscribe();
  }, [currentDate, finalUid]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleDateClick = (date) => {
    setSelectedDate(date);
    const filtered = events
      .filter(e => e.date === date.format('YYYY-MM-DD'))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    setSelectedEvents(filtered);
    setModalOpen(true);
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.startTime || !newEvent.endTime || !canEdit) {
      alert("모든 필수 필드를 입력해주세요.");
      return;
    }

    const eventToAdd = {
      date: selectedDate.format('YYYY-MM-DD'),
      ...newEvent,
      isCompleted: false,
      createdAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, 'users', finalUid, 'event'), eventToAdd);
      setNewEvent({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        category: 'default',
      });
      setShowAddEventForm(false);
    } catch (error) {
      console.error("일정 추가 실패:", error);
      alert("일정 추가에 실패했습니다.");
    }
  };

  const handleEditEvent = async (event) => {
    if (!canEdit) return;
    try {
      await updateDoc(doc(db, 'users', finalUid, 'event', event.id), {
        title: editingEvent.title,
        description: editingEvent.description,
        startTime: editingEvent.startTime,
        endTime: editingEvent.endTime,
        category: editingEvent.category,
      });
      setEditingEvent(null);
    } catch (error) {
      console.error("일정 수정 실패:", error);
      alert("일정 수정에 실패했습니다.");
    }
  };

  const handleDelete = async (id) => {
    if (!canEdit || !window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, 'users', finalUid, 'event', id));
    } catch (error) {
      console.error("일정 삭제 실패:", error);
      alert("일정 삭제에 실패했습니다.");
    }
  };

  const toggleEventComplete = async (event) => {
    if (!canEdit) return;
    try {
      await updateDoc(doc(db, 'users', finalUid, 'event', event.id), {
        isCompleted: !event.isCompleted,
      });
    } catch (error) {
      console.error("일정 상태 변경 실패:", error);
      alert("일정 상태 변경에 실패했습니다.");
    }
  };

  const getCategoryColor = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.color : categories[0].color;
  };

  return (
    <div className="flex flex-col items-center w-full space-y-6 mt-8 px-2">
      {/* 월 선택 및 통계 */}
      <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-[1100px] gap-4">
        <div className="flex items-center justify-between md:w-[320px] w-full bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 shadow-lg border border-blue-100/50 backdrop-blur-sm">
          <button onClick={handlePrevMonth} className="p-2.5 bg-white text-gray-700 rounded-xl shadow-md transition-all hover:bg-blue-50 hover:scale-105">
            <ChevronLeft className="w-5 h-5 text-blue-600" />
          </button>
          <h2 className="text-xl font-bold text-gray-800">{currentDate.format('YY년 MM월')}</h2>
          <button onClick={handleNextMonth} className="p-2.5 bg-white text-gray-700 rounded-xl shadow-md transition-all hover:bg-blue-50 hover:scale-105">
            <ChevronRight className="w-5 h-5 text-blue-600" />
          </button>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
            <div className="text-sm text-gray-500">전체 일정</div>
            <div className="text-2xl font-bold text-gray-800">{monthStats.total}개</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
            <div className="text-sm text-gray-500">완료된 일정</div>
            <div className="text-2xl font-bold text-green-600">{monthStats.completed}개</div>
          </div>
        </div>
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
                          className={cn(
                            "align-top p-2 md:p-3 h-16 md:h-24 cursor-pointer transition-all duration-200",
                            isCurrentMonth ? "text-gray-800" : "text-gray-400 bg-gray-50/30",
                            isToday && "bg-blue-50",
                            isSelected && "ring-2 ring-blue-500"
                          )}
                        >
                          <div className="flex flex-col h-full">
                            <span className={cn(
                              "inline-block w-7 h-7 rounded-full text-center leading-7 mb-1",
                              isToday && "bg-blue-500 text-white"
                            )}>
                              {date.date()}
                            </span>
                            <div className="flex flex-col gap-1 overflow-hidden">
                              {dayEvents.slice(0, 2).map(event => (
                                <div
                                  key={event.id}
                                  className={cn(
                                    "text-xs px-1.5 py-0.5 rounded truncate",
                                    getCategoryColor(event.category),
                                    event.isCompleted ? "line-through opacity-50" : "",
                                    "text-white"
                                  )}
                                >
                                  {event.title}
                                </div>
                              ))}
                              {dayEvents.length > 2 && (
                                <div className="text-xs text-gray-500 px-1.5">
                                  +{dayEvents.length - 2}개
                                </div>
                              )}
                            </div>
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

      {/* 일정 모달 */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-[500px] text-gray-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-800">
              <Calendar className="w-5 h-5" />
              {selectedDate.format('YYYY년 MM월 DD일')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 일정 추가 버튼 */}
            {canEdit && (
              <Button
                onClick={() => setShowAddEventForm(!showAddEventForm)}
                className="w-full"
                variant={showAddEventForm ? "secondary" : "default"}
              >
                <Plus className="w-4 h-4 mr-2" />
                {showAddEventForm ? "닫기" : "새 일정 추가"}
              </Button>
            )}

            {/* 일정 추가 폼 */}
            {showAddEventForm && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-gray-700">제목</Label>
                  <Input
                    id="title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="일정 제목"
                    className="text-gray-800"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-gray-700">설명</Label>
                  <Input
                    id="description"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="일정 설명 (선택사항)"
                    className="text-gray-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime" className="text-gray-700">시작 시간</Label>
                    <Select
                      value={newEvent.startTime}
                      onValueChange={(value) => setNewEvent(prev => ({ ...prev, startTime: value }))}
                    >
                      <SelectTrigger className="text-gray-800">
                        <SelectValue placeholder="시작 시간" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map(time => (
                          <SelectItem key={time} value={time} className="text-gray-800">
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endTime" className="text-gray-700">종료 시간</Label>
                    <Select
                      value={newEvent.endTime}
                      onValueChange={(value) => setNewEvent(prev => ({ ...prev, endTime: value }))}
                    >
                      <SelectTrigger className="text-gray-800">
                        <SelectValue placeholder="종료 시간" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map(time => (
                          <SelectItem key={time} value={time} className="text-gray-800">
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">카테고리</Label>
                  <div className="flex gap-2">
                    {categories.map(category => (
                      <button
                        key={category.id}
                        onClick={() => setNewEvent(prev => ({ ...prev, category: category.id }))}
                        className={cn(
                          "px-3 py-1 rounded-full text-sm",
                          newEvent.category === category.id
                            ? category.color + " text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>

                <Button onClick={handleAddEvent} className="w-full">
                  일정 추가
                </Button>
              </div>
            )}

            {/* 일정 목록 */}
            <div className="space-y-3">
              {selectedEvents.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  등록된 일정이 없습니다
                </div>
              ) : (
                selectedEvents.map(event => (
                  <div
                    key={event.id}
                    className={cn(
                      "p-3 rounded-lg border",
                      event.isCompleted ? "bg-gray-50" : "bg-white"
                    )}
                  >
                    {editingEvent?.id === event.id ? (
                      <div className="space-y-3">
                        <Input
                          value={editingEvent.title}
                          onChange={(e) => setEditingEvent(prev => ({ ...prev, title: e.target.value }))}
                          className="text-gray-800"
                        />
                        <Input
                          value={editingEvent.description}
                          onChange={(e) => setEditingEvent(prev => ({ ...prev, description: e.target.value }))}
                          className="text-gray-800"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Select
                            value={editingEvent.startTime}
                            onValueChange={(value) => setEditingEvent(prev => ({ ...prev, startTime: value }))}
                          >
                            <SelectTrigger className="text-gray-800">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {timeSlots.map(time => (
                                <SelectItem key={time} value={time} className="text-gray-800">
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={editingEvent.endTime}
                            onValueChange={(value) => setEditingEvent(prev => ({ ...prev, endTime: value }))}
                          >
                            <SelectTrigger className="text-gray-800">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {timeSlots.map(time => (
                                <SelectItem key={time} value={time} className="text-gray-800">
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => handleEditEvent(event)} className="flex-1">
                            저장
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setEditingEvent(null)}
                            className="flex-1"
                          >
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className={cn(
                                "font-medium text-gray-800",
                                event.isCompleted && "line-through text-gray-500"
                              )}>
                                {event.title}
                              </h3>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-white",
                                  getCategoryColor(event.category)
                                )}
                              >
                                {categories.find(c => c.id === event.category)?.name}
                              </Badge>
                            </div>
                            {event.description && (
                              <p className="text-sm text-gray-500 mt-1">
                                {event.description}
                              </p>
                            )}
                          </div>
                          {canEdit && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleEventComplete(event)}
                              >
                                <Check className={cn(
                                  "w-4 h-4",
                                  event.isCompleted ? "text-green-500" : "text-gray-400"
                                )} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingEvent(event)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(event.id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          {event.startTime} - {event.endTime}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendar2; 