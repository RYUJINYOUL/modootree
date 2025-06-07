
import { ComponentLibrary } from '@/components/edit/ComponentLibrary';

type ComponentPaletteProps = {
  onAdd: (type: string) => void;
};

const ComponentPalette = ({ onAdd }: ComponentPaletteProps) => {
  return (
    <div className="space-y-2">
      {Object.keys(ComponentLibrary).map(type => (
        <div
          key={type}
          onClick={() => onAdd(type)}
          draggable
          onDragStart={e => e.dataTransfer.setData('component', type)}
          className="p-2 bg-gray-200 rounded cursor-grab"
        >
          {type}

          {/* button click시 EditorCanvas에 components 보내기 */}
        </div>
      ))}
    </div>
  );
}


export default ComponentPalette;