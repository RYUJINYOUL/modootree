'use client';
import { useEffect, useState } from 'react';
import { ComponentLibrary } from '@/components/edit/ComponentLibrary';

export default function EditorCanvas({ components, setComponents }) {
  const [dragInfo, setDragInfo] = useState(null); // 모바일 드래그 정보

  const handleDropNew = (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('component');
    setComponents(prev => [...prev, type]);
  };

  const handleDragStart = (e, idx) => {
    e.dataTransfer.setData('dragIndex', idx);
    e.dataTransfer.setData('component', components[idx]);
  };

  const handleDropReorder = (e, targetIdx) => {
    e.preventDefault();
    const fromIdx = parseInt(e.dataTransfer.getData('dragIndex'), 10);
    const component = e.dataTransfer.getData('component');
    if (isNaN(fromIdx)) return;

    setComponents(prev => {
      const updated = [...prev];
      updated.splice(fromIdx, 1);
      updated.splice(targetIdx, 0, component);
      return updated;
    });
  };

  const handleDeleteDrop = (e) => {
    e.preventDefault();
    const fromIdx = parseInt(e.dataTransfer.getData('dragIndex'), 10);
    if (!isNaN(fromIdx)) {
      setComponents(prev => {
        const updated = [...prev];
        updated.splice(fromIdx, 1);
        return updated;
      });
    }
  };

  // 📱 모바일: 터치 시작
  const handleTouchStart = (e, idx) => {
    setDragInfo({ index: idx, component: components[idx] });
  };

  // 📱 모바일: 움직임 막기
  const handleTouchMove = (e) => {
    e.preventDefault(); // prevent scroll while dragging
  };

  // 📱 모바일: 순서 변경
  const handleTouchEnd = (targetIdx) => {
    if (!dragInfo) return;

    setComponents(prev => {
      const updated = [...prev];
      const [item] = updated.splice(dragInfo.index, 1);
      updated.splice(targetIdx, 0, item);
      return updated;
    });

    setDragInfo(null);
  };

  // 📱 모바일: 삭제
  const handleTouchDelete = () => {
    if (!dragInfo) return;

    setComponents(prev => {
      const updated = [...prev];
      updated.splice(dragInfo.index, 1);
      return updated;
    });

    setDragInfo(null);
  };


  return (
    <div className="space-y-2">
      <div
        className="border border-white p-2 text-center text-red-600 rounded bg-white"
        onDragOver={e => e.preventDefault()}
        onDrop={handleDeleteDrop}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchDelete}>
        🗑️ 여기에 드래그하면 삭제됩니다
      </div>

      {components.map((type, idx) => (
        <div
          key={idx}
          draggable
          onDragStart={e => handleDragStart(e, idx)}
          onDragOver={e => e.preventDefault()}
          onDrop={e => handleDropReorder(e, idx)}
          onTouchStart={e => handleTouchStart(e, idx)}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => handleTouchEnd(idx)}

          className="p-2 bg-gray-200 rounded cursor-grab"
        >
          {type}
        </div>
      ))}

      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleDropNew}
        className="min-h-[400px] border p-4 bg-white rounded mt-20"
      >
        <h2 className="font-bold text-center mb-5">미리보기</h2>
        {components.map((type, idx) => {
          const Comp = ComponentLibrary[type];
          return Comp ? <Comp key={idx} /> : null;
        })}
      </div>
    </div>
  );
}
