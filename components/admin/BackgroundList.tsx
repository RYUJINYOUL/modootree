'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';

interface Background {
  id: string;
  type: 'image' | 'youtube' | 'pixabay';
  url: string;
  title: string;
  isActive: boolean;
}

export default function BackgroundList() {
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'backgrounds'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const backgroundsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Background[];
      setBackgrounds(backgroundsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'backgrounds', id), {
        isActive: !currentStatus
      });
    } catch (error) {
      console.error('Error toggling background status:', error);
      alert('상태 변경 중 오류가 발생했습니다.');
    }
  };

  const deleteBackground = async (id: string) => {
    if (!confirm('정말 이 배경을 삭제하시겠습니까?')) return;

    try {
      await deleteDoc(doc(db, 'backgrounds', id));
      alert('배경이 삭제되었습니다.');
    } catch (error) {
      console.error('Error deleting background:', error);
      alert('배경 삭제 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return <div className="text-center">로딩중...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">배경 목록</h2>
      <div className="space-y-4">
        {backgrounds.map((bg) => (
          <div key={bg.id} className="border p-4 rounded flex items-center justify-between">
            <div>
              <h3 className="font-medium">{bg.title}</h3>
              <p className="text-sm text-gray-500">
                타입: {bg.type === 'image' ? '이미지' : bg.type === 'youtube' ? '유튜브' : '픽사베이'}
              </p>
              <p className="text-sm text-gray-500 truncate">{bg.url}</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => toggleActive(bg.id, bg.isActive)}
                className={`px-3 py-1 rounded ${
                  bg.isActive ? 'bg-green-500 text-white' : 'bg-gray-300'
                }`}
              >
                {bg.isActive ? '활성' : '비활성'}
              </button>
              <button
                onClick={() => deleteBackground(bg.id)}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
        {backgrounds.length === 0 && (
          <p className="text-center text-gray-500">등록된 배경이 없습니다.</p>
        )}
      </div>
    </div>
  );
} 