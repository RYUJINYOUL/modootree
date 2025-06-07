'use client';
import { ComponentLibrary } from '@/components/edit/ComponentLibrary';

export default function ComponentPalette() {
  return (
    <div className="space-y-2">
      {Object.keys(ComponentLibrary).map(type => (
        <div
          key={type}
          draggable
          onDragStart={e => e.dataTransfer.setData('component', type)}
          className="p-2 bg-gray-200 rounded cursor-grab"
        >
          {type}
        </div>
      ))}
    </div>
  );
}