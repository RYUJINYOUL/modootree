"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { useSelector } from "react-redux";
import { uploadLogoImage } from "@/hooks/useUploadImage";
import imageCompression from "browser-image-compression";

import CropperModal from '@/components/ui/CropperModal';



type LogoProps = {
  username?: string;
  uid?: string;
};

const COLOR_PALETTE = [
  "transparent",
  "#000000", "#FFFFFF", "#F87171", "#FBBF24",
  "#34D399", "#60A5FA", "#A78BFA", "#F472B6",
  // "#D1D5DB", "#10B981"
];

function Gallery3 ({ username, uid }: LogoProps) {
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropType, setCropType] = useState<'logo' | 'background' | null>(null);

  const pathname = usePathname();
  const isEditable = pathname.startsWith("/editor");
  const { currentUser } = useSelector((state: any) => state.user);
  const finalUid = uid ?? currentUser?.uid;
  const finalUsername = username ?? currentUser?.username ?? "사이트";

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const [logoUrl, setLogoUrl] = useState("/Image/mainmiddle.jpeg");
  const [bgUrl, setBgUrl] = useState("/Image/bg.jpeg");
  const [name, setName] = useState("제목을 입력하세요");
  const [desc, setDesc] = useState("간단한 설명을 입력하세요");
  const [bgBaseColor, setBgBaseColor] = useState("transparent");
  const [bgOpacity, setBgOpacity] = useState(0.7);
  const [textColor, setTextColor] = useState("#FFFFFF");

  const [showBgColors, setShowBgColors] = useState(false);
  const [showTextColors, setShowTextColors] = useState(false);

  const computedBgColor = bgBaseColor === "transparent"
    ? "transparent"
    : `${bgBaseColor}${Math.round(bgOpacity * 255).toString(16).padStart(2, "0").toUpperCase()}`;

  useEffect(() => {
    const fetchData = async () => {
      const docRef = doc(db, "users", finalUid, "info", "details");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.logoUrl) setLogoUrl(data.logoUrl);
        if (data.bgUrl) setBgUrl(data.bgUrl);
        if (data.name) setName(data.name);
        if (data.desc) setDesc(data.desc);
        if (data.bgColor) setBgBaseColor(data.bgColor);
        if (data.bgOpacity) setBgOpacity(parseFloat(data.bgOpacity));
        if (data.textColor) setTextColor(data.textColor);
      }
    };
    fetchData();
  }, []);

  const handleChangeText = async (label: "name" | "desc") => {
    if (!isEditable) return;
    const current = label === "name" ? name : desc;
    const newText = prompt(`새 ${label === "name" ? "이름" : "설명"}을 입력하세요`, current);
    if (!newText) return;

    label === "name" ? setName(newText) : setDesc(newText);
    await saveToFirestore({ [label]: newText });
    alert("저장되었습니다.");
  };

  const handleColorSelect = async (label: "bgColor" | "textColor", color: string) => {
    if (!isEditable) return;
    if (label === "bgColor") {
      setBgBaseColor(color);
      await saveToFirestore({ bgColor: color });
    } else {
      setTextColor(color);
      await saveToFirestore({ textColor: color });
    }
  };

 const handleFileChange = async (
  e: React.ChangeEvent<HTMLInputElement>,
  type: 'logo' | 'background'
) => {
  if (!isEditable) return;
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    setCropImageSrc(reader.result as string);
    setCropType(type);
  };
  reader.readAsDataURL(file);
};

{cropImageSrc && cropType && (
 <CropperModal
  image={cropImageSrc}
  type={cropType} // 추가
  onCancel={() => {
    setCropImageSrc(null);
    setCropType(null);
  }}
  onCrop={async (croppedBlob) => { /* ... */ }}
/>
)}

  const saveToFirestore = async (data: Record<string, string>) => {
    await setDoc(doc(db, "users", finalUid, "info", "details"), data, { merge: true });
  };

  const handleDeleteBackground = async () => {
    if (!isEditable) return;
    const defaultBg = "/Image/bg.jpeg";
    setBgUrl(defaultBg);
    await saveToFirestore({ bgUrl: defaultBg });
    alert("배경 이미지가 삭제되었습니다.");
  };

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ backgroundColor: computedBgColor }}>
      <input type="file" accept="image/*" className="hidden" ref={bgInputRef} onChange={(e) => handleFileChange(e, "background")} />
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage:
            bgBaseColor === "transparent"
              ? `url(${bgUrl})`
              : `linear-gradient(${computedBgColor}, ${computedBgColor}), url(${bgUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          cursor: isEditable ? "pointer" : "default",
        }}
        onClick={() => isEditable && bgInputRef.current?.click()}
      />

      <div className="relative z-10 flex flex-col items-center pt-12 px-4" style={{ color: textColor }}>
        <input type="file" accept="image/*" className="hidden" ref={logoInputRef} onChange={(e) => handleFileChange(e, "logo")} />
        <Image
          src={logoUrl}
          alt="로고"
          width={100}
          height={100}
          className="rounded-full border-4 border-white shadow-md cursor-pointer hover:scale-105 transition-all duration-200"
          onClick={() => isEditable && logoInputRef.current?.click()}
          title={isEditable ? "로고 클릭 시 변경" : ""}
        />
        <h1 className={`text-2xl font-bold mt-4 ${isEditable ? "cursor-pointer hover:underline" : ""}`} onClick={() => handleChangeText("name")}>{name}</h1>
        <p className={`text-sm mt-1 mb-10 ${isEditable ? "cursor-pointer hover:underline" : ""}`} onClick={() => handleChangeText("desc")}>{desc}</p>

        {isEditable && (
          <div className="absolute top-4 left-4 right-4 flex justify-between">
            <div className="flex flex-col items-start gap-2">
              <button onClick={() => setShowBgColors(!showBgColors)} className="text-xs border px-3 py-1 rounded bg-white text-black">
                배경색 {showBgColors ? "닫기" : "열기"}
              </button>
              {showBgColors && (
                <div className="flex flex-col">
                  <div className="flex gap-2 flex-wrap mt-2 w-[110px]">
                    {COLOR_PALETTE.map((color) => (
                      <button
                        key={`bg-${color}`}
                        onClick={() => handleColorSelect("bgColor", color)}
                        className="w-6 h-6 rounded-full border border-gray-300"
                        style={{
                          backgroundColor: color === "transparent" ? "white" : color,
                          backgroundImage:
                            color === "transparent"
                              ? "linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)"
                              : undefined,
                          backgroundSize: "8px 8px",
                          backgroundPosition: "0 0, 4px 4px",
                        }}
                        title={color === "transparent" ? "투명" : color}
                      />
                    ))}
                  </div>
                  <label className="text-xs mt-1 text-gray-700">투명도</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={bgOpacity}
                    onChange={async (e) => {
                      const value = parseFloat(e.target.value);
                      setBgOpacity(value);
                      await saveToFirestore({ bgOpacity: value.toString() });
                    }}
                    className="w-[100px]"
                  />
                  <button onClick={() => bgInputRef.current?.click()} className="text-xs mt-4 border w-[100px] px-3 py-1 rounded bg-white text-black">배경이미지설정</button>
                  <button onClick={handleDeleteBackground} className="text-xs mt-2 border w-[100px] px-3 py-1 rounded bg-white text-black">배경이미지삭제</button>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              <button onClick={() => setShowTextColors(!showTextColors)} className="text-xs border px-3 py-1 rounded bg-white text-black">
                텍스트색 {showTextColors ? "닫기" : "열기"}
              </button>
              {showTextColors && (
                <div className="flex gap-2 flex-wrap mt-2 justify-end w-[110px]">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={`text-${color}`}
                      onClick={() => handleColorSelect("textColor", color)}
                      className="w-6 h-6 rounded-full border border-gray-300"
                      style={{
                        backgroundColor: color === "transparent" ? "white" : color,
                        backgroundImage:
                          color === "transparent"
                            ? "linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)"
                            : undefined,
                        backgroundSize: "8px 8px",
                        backgroundPosition: "0 0, 4px 4px",
                      }}
                      title={color === "transparent" ? "투명" : color}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Gallery3;