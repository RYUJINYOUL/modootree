'use client';
import { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { ComponentLibrary } from '@/components/edit/ComponentLibrary';
import { useDispatch, useSelector } from 'react-redux';


export default function EditorCanvas() {
  const [components, setComponents] = useState([]);
  const { currentUser } = useSelector(state => state.user)
  const uid = currentUser.uid

  useEffect(() => {
    const load = async () => {
      const docRef = doc(db, 'users', uid, 'links', 'page');
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        setComponents(snapshot.data().components || []);
      }
    };
    load();
  }, []);


  useEffect(() => {
    const save = async () => {
      const docRef = doc(db, 'users', uid, 'links', 'page');
      await setDoc(docRef, { components });
    };
    if (components.length > 0) save();
  }, [components]);


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
      updated.splice(fromIdx, 1); // remove from old
      updated.splice(targetIdx, 0, component); // insert into new
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

  
  return (
    <div className="space-y-2">

      <div className="border border-white p-2 text-center text-red-600 rounded bg-white"
           onDragOver={e => e.preventDefault()}
           onDrop={handleDeleteDrop}>
        🗑️ 여기에 드래그하면 삭제됩니다
      </div>

      {components.map((type, idx) => (
        <div
          key={idx}
          draggable
          onDragStart={e => handleDragStart(e, idx)}
          onDragOver={e => e.preventDefault()}
          onDrop={e => handleDropReorder(e, idx)}
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
