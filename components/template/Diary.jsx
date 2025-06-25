'use client';

import React, { useEffect, useState } from 'react';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import app from '@/firebase';
import { Button } from '@/components/ui/button';
import { useSelector } from 'react-redux';
import { usePathname } from 'next/navigation';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { Lock, Unlock, Pencil, Trash2, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

const db = getFirestore(app);

const HeaderDrawer = ({ children, drawerContentClassName, uid, ...props }) => {
  const { currentUser } = useSelector((state) => state.user);
  const finalUid = uid ?? currentUser?.uid;

  return (
    <Drawer>
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent className={`w-full h-[85vh] flex flex-col bg-gray-50 ${drawerContentClassName}`}>
        <DrawerHeader>
          <DrawerTitle>일기장</DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto p-4">
          {/* 일기 작성 폼이 여기에 들어갈 수 있습니다 */}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

const Diary = ({ username, uid }) => {
  const pathname = usePathname();
  const isEditable = pathname.startsWith('/editor');
  const [diaries, setDiaries] = useState([]);
  const [newDiary, setNewDiary] = useState({
    title: '',
    content: '',
    isPrivate: false,
  });
  const [isWriting, setIsWriting] = useState(false);
  const [editingDiary, setEditingDiary] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDiary, setSelectedDiary] = useState(null);

  const { currentUser } = useSelector((state) => state.user);
  const finalUid = uid ?? currentUser?.uid;
  const userRole = currentUser?.uid;
  const canEdit = isEditable ? finalUid : userRole === uid;

  useEffect(() => {
    if (!finalUid) return;

    const q = query(
      collection(db, 'users', finalUid, 'diary'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const diaryList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      // 비공개 일기는 작성자만 볼 수 있도록 필터링
      .filter(diary => !diary.isPrivate || canEdit);
      setDiaries(diaryList);
    });

    return () => unsubscribe();
  }, [finalUid, canEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newDiary.title || !newDiary.content || !userRole) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }

    try {
      await addDoc(collection(db, 'users', finalUid, 'diary'), {
        ...newDiary,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setNewDiary({ title: '', content: '', isPrivate: false });
      setIsWriting(false);
      alert('일기가 저장되었습니다.');
    } catch (error) {
      console.error('일기 저장 실패:', error);
      alert('일기 저장에 실패했습니다.');
    }
  };

  const handleDelete = async (id) => {
    if (!canEdit) return;
    if (!window.confirm('정말로 삭제하시겠습니까?')) return;

    try {
      await deleteDoc(doc(db, 'users', finalUid, 'diary', id));
      alert('일기가 삭제되었습니다.');
    } catch (error) {
      console.error('일기 삭제 실패:', error);
      alert('일기 삭제에 실패했습니다.');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editingDiary || !editingDiary.title || !editingDiary.content) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }

    try {
      const diaryRef = doc(db, 'users', finalUid, 'diary', editingDiary.id);
      await updateDoc(diaryRef, {
        title: editingDiary.title,
        content: editingDiary.content,
        isPrivate: editingDiary.isPrivate,
        updatedAt: new Date().toISOString(),
      });

      setEditingDiary(null);
      alert('일기가 수정되었습니다.');
    } catch (error) {
      console.error('일기 수정 실패:', error);
      alert('일기 수정에 실패했습니다.');
    }
  };

  const handleDiaryClick = (diary) => {
    if (diary.isPrivate && !canEdit) {
      alert('비공개 일기입니다.');
      return;
    }
    setSelectedDiary(diary);
    setModalOpen(true);
  };

  return (
    <div className="w-full max-w-[1000px] mx-auto p-4 space-y-6">
      <div className="relative flex items-center justify-center text-[21px] font-bold md:w-[320px] w-full bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 shadow-lg border border-blue-100/50 backdrop-blur-sm tracking-tight text-gray-800 mx-auto">
        <HeaderDrawer uid={finalUid}>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (canEdit) {
                setIsWriting(true);
              }
            }}
            className="absolute left-4 bg-white p-2 rounded-lg shadow-sm hover:text-blue-600 hover:shadow-md transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        </HeaderDrawer>
        일기장
        <HeaderDrawer uid={finalUid}>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (canEdit) {
                setIsWriting(true);
              }
            }}
            className="absolute right-4 bg-white p-2 rounded-lg shadow-sm hover:text-blue-600 hover:shadow-md transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </HeaderDrawer>
      </div>

      {/* 일기 작성 폼 */}
      {isWriting && (
        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-2xl shadow-lg border border-blue-100">
          <div className="flex justify-between items-center">
            <input
              type="text"
              value={newDiary.title}
              onChange={(e) => setNewDiary(prev => ({ ...prev, title: e.target.value }))}
              placeholder="제목"
              className="flex-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-gray-50 text-gray-900 placeholder-gray-500"
            />
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setNewDiary(prev => ({ ...prev, isPrivate: !prev.isPrivate }));
              }}
              className={`ml-4 p-3 rounded-xl transition-all ${
                newDiary.isPrivate 
                ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                : 'bg-green-100 text-green-600 hover:bg-green-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {newDiary.isPrivate ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                <span className="text-sm font-medium">
                  {newDiary.isPrivate ? '비공개' : '공개'}
                </span>
              </div>
            </Button>
          </div>
          <textarea
            value={newDiary.content}
            onChange={(e) => setNewDiary(prev => ({ ...prev, content: e.target.value }))}
            placeholder="내용을 입력하세요..."
            className="w-full h-48 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none bg-gray-50 text-gray-900 placeholder-gray-500"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => {
                setNewDiary({ title: '', content: '', isPrivate: false });
                setIsWriting(false);
              }}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200"
            >
              취소
            </Button>
            <Button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600"
            >
              저장
            </Button>
          </div>
        </form>
      )}

      {/* 일기 수정 폼 */}
      {editingDiary && (
        <form onSubmit={handleEdit} className="space-y-4 bg-white p-6 rounded-2xl shadow-lg border border-blue-100">
          <div className="flex justify-between items-center">
            <input
              type="text"
              value={editingDiary.title}
              onChange={(e) => setEditingDiary(prev => ({ ...prev, title: e.target.value }))}
              placeholder="제목"
              className="flex-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-gray-50 text-gray-900 placeholder-gray-500"
            />
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setEditingDiary(prev => ({ ...prev, isPrivate: !prev.isPrivate }));
              }}
              className={`ml-4 p-3 rounded-xl transition-all ${
                editingDiary.isPrivate 
                ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                : 'bg-green-100 text-green-600 hover:bg-green-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {editingDiary.isPrivate ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                <span className="text-sm font-medium">
                  {editingDiary.isPrivate ? '비공개' : '공개'}
                </span>
              </div>
            </Button>
          </div>
          <textarea
            value={editingDiary.content}
            onChange={(e) => setEditingDiary(prev => ({ ...prev, content: e.target.value }))}
            placeholder="내용을 입력하세요..."
            className="w-full h-48 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none bg-gray-50 text-gray-900 placeholder-gray-500"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => setEditingDiary(null)}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200"
            >
              취소
            </Button>
            <Button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600"
            >
              수정
            </Button>
          </div>
        </form>
      )}

      {/* 일기 목록 */}
      <div className="space-y-4">
        {diaries.length === 0 ? (
          <div className="p-6 bg-white rounded-2xl shadow-md text-center text-gray-500">
            등록된 일기가 없습니다.
          </div>
        ) : (
          diaries.map((diary) => (
            <div
              key={diary.id}
              onClick={() => handleDiaryClick(diary)}
              className={`p-6 bg-white rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer border ${
                diary.isPrivate ? 'border-red-100' : 'border-blue-100'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-800">
                      {diary.isPrivate ? '🔒 ' : ''}{diary.title}
                    </h3>
                    {diary.isPrivate && !canEdit && (
                      <span className="text-sm text-red-500">비공개</span>
                    )}
                  </div>
                  <p className="mt-2 text-gray-600 line-clamp-2">{diary.content}</p>
                </div>
                {canEdit && (
                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingDiary(diary);
                      }}
                      className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(diary.id);
                      }}
                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="mt-4 text-sm text-gray-500">
                {dayjs(diary.createdAt).locale('ko').format('YYYY년 MM월 DD일 HH:mm')}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 일기 상세 보기 모달 */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl rounded-3xl shadow-2xl border border-blue-100">
          {selectedDiary && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-800">
                  {selectedDiary.isPrivate && <Lock className="w-5 h-5" />}
                  {selectedDiary.title}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <p className="text-gray-600 whitespace-pre-wrap">{selectedDiary.content}</p>
                <div className="text-sm text-gray-500">
                  작성: {dayjs(selectedDiary.createdAt).locale('ko').format('YYYY년 MM월 DD일 HH:mm')}
                  {selectedDiary.updatedAt !== selectedDiary.createdAt && (
                    <div>
                      수정: {dayjs(selectedDiary.updatedAt).locale('ko').format('YYYY년 MM월 DD일 HH:mm')}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Diary; 