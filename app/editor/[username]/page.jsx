
import ComponentPalette from '@/components/edit/ComponentPalette';
import EditorCanvas from '@/components/edit/EditorCanvas';
import EditorCanvas2 from '@/components/edit/EditorCanvas2';


export default function EditPage() {
 
  return (
    <div className="p-6 flex gap-10 mt-10 bg-black">
      <div className="w-1/4 md:block hidden ">
        <h1 className="font-bold mb-4 text-white">컴포넌트</h1>
         <ComponentPalette/>
      </div>
   
      <div className="md:hidden w-full">
        {/* 🔽 components와 setComponents 전달 */}
        <EditorCanvas />
      </div>


      <div className="md:w-3/4 md:block hidden">
        <h1 className="md:block hidden font-bold mb-4 text-white">드래그로 위치 변경하세요</h1>
        {/* 🔽 components와 setComponents 전달 */}
        <EditorCanvas2 />
      </div>
    </div>
  );
}
