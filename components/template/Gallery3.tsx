"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { useSelector } from "react-redux";
import { uploadLogoImage, uploadLinkImage, deleteImageFromStorage } from "@/hooks/useUploadImage"; // deleteImageFromStorage도 필요합니다.
import imageCompression from "browser-image-compression";

import CropperModal from '@/components/ui/CropperModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Share2 } from "lucide-react";

type LogoProps = {
  username?: string;
  uid?: string;
};

const COLOR_PALETTE = [
  "transparent",
  "#000000", "#FFFFFF", "#F87171", "#FBBF24",
  "#34D399", "#60A5FA", "#A78BFA", "#F472B6",
];

function Gallery3 ({ username, uid }: LogoProps) {
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropType, setCropType] = useState<'logo' | 'background' | null>(null);
  const [isUploading, setIsUploading] = useState(false); // 업로드 상태 추가
  const [showProfileModal, setShowProfileModal] = useState(false); // 프로필 팝업 상태 추가

  const pathname = usePathname();
  const isEditable = pathname?.startsWith("/editor") ?? false;
  const { currentUser } = useSelector((state: any) => state.user);
  const finalUid = uid ?? currentUser?.uid;
  const finalUsername = username ?? currentUser?.username ?? "사이트";

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const [logoUrl, setLogoUrl] = useState("/new/defaultLogo.png");
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

  // saveToFirestore 함수 정의 추가
  const saveToFirestore = async (data: any) => {
    if (!finalUid) return;
    const docRef = doc(db, 'users', finalUid, 'info', 'details');
    try {
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        // 문서가 없으면 새로 생성
        await setDoc(docRef, data);
      } else {
        // 문서가 있으면 업데이트
        await updateDoc(docRef, data);
      }
    } catch (error) {
      console.error('Firestore 저장 실패:', error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!finalUid) return; // finalUid가 없으면 데이터 가져오지 않음
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
  }, [finalUid]); // finalUid가 변경될 때마다 데이터를 가져오도록 의존성 배열에 추가

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
    if (!isEditable || isUploading) return;
    
    const file = e.target.files?.[0];
    if (!file) {
      alert("파일을 선택해주세요.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCropImageSrc(result);
      setCropType(type);
    };
    reader.readAsDataURL(file);
  };

  const handleCropApply = async (croppedBlob: Blob) => {
    if (!finalUid || !cropType) {
      alert("이미지 처리를 위한 정보가 부족합니다.");
      setCropImageSrc(null);
      setCropType(null);
      return;
    }

    try {
      setIsUploading(true);

      const options = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };

      const croppedFile = new File([croppedBlob], `cropped_image.${cropType === 'logo' ? 'jpeg' : 'jpeg'}`, { type: croppedBlob.type });
      const compressedFile = await imageCompression(croppedFile, options);
      const uploadFn = cropType === "logo" ? uploadLogoImage : uploadLinkImage;

      const oldUrl = cropType === "logo" ? logoUrl : bgUrl;
      if (oldUrl && !oldUrl.startsWith("/Image/")) {
        await deleteImageFromStorage(oldUrl);
      }

      const url = await uploadFn(compressedFile, finalUid);

      if (cropType === "logo") {
        setLogoUrl(url);
        await saveToFirestore({ logoUrl: url });
      } else {
        setBgUrl(url);
        await saveToFirestore({ bgUrl: url });
      }

      alert("이미지가 성공적으로 업데이트되었습니다.");

    } catch (error) {
      alert("이미지 업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
      setCropImageSrc(null);
      setCropType(null);
    }
  };

  const handleDeleteBackground = async () => {
    if (!isEditable) return;
    const defaultBg = "/Image/bg.jpeg";

    try {
      if (bgUrl && !bgUrl.startsWith("/Image/")) {
        await deleteImageFromStorage(bgUrl);
      }
      setBgUrl(defaultBg);
      await saveToFirestore({ bgUrl: defaultBg });
      alert("배경 이미지가 삭제되었습니다.");
    } catch (error) {
      alert("배경 이미지 삭제에 실패했습니다.");
    }
  };

  const handleProfileClick = () => {
    if (isEditable) {
      // 편집 모드에서는 파일 업로드
      logoInputRef.current?.click();
    } else {
      // 일반 모드에서는 팝업 표시
      setShowProfileModal(true);
    }
  };

  const handleCopyAddress = async () => {
    try {
      const currentUrl = window.location.href;
      await navigator.clipboard.writeText(currentUrl);
      alert('주소가 복사되었습니다!');
    } catch (error) {
      alert('주소 복사에 실패했습니다.');
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: name,
          text: desc,
          url: window.location.href,
        });
      } else {
        // 공유 API를 지원하지 않는 경우 주소 복사
        await handleCopyAddress();
      }
    } catch (error) {
      console.error('공유 실패:', error);
      // 공유가 취소된 경우는 에러로 처리하지 않음
    }
  };

  return (
    <div className="flex items-center justify-center w-full p-[10px]">
      <div className="relative w-full md:w-[1000px] overflow-hidden rounded-xl shadow-lg" style={{ backgroundColor: computedBgColor, minHeight: "300px" }}>
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
          onClick={() => isEditable && !isUploading && bgInputRef.current?.click()}
        />

        <div className="relative z-10 flex flex-col items-center pt-16 px-4" style={{ color: textColor }}>
          <input type="file" accept="image/*" className="hidden" ref={logoInputRef} onChange={(e) => handleFileChange(e, "logo")} />
          <Image
            src={logoUrl}
            alt="로고"
            width={120}
            height={120}
            priority
            className="rounded-full border-4 border-black/20 backdrop-blur-[2px] shadow-md cursor-pointer hover:scale-105 transition-all duration-200"
            onClick={handleProfileClick}
            title={isEditable ? "로고 클릭 시 변경" : "프로필 사진 클릭 시 상세보기"}
          />
          <div className="mt-6 px-6 py-3 mb-8 rounded-lg bg-blue-500/30 backdrop-blur-[2px] text-center">
            <h1 className={`text-2xl font-bold ${isEditable ? "cursor-pointer hover:underline" : ""}`} onClick={() => handleChangeText("name")}>{name}</h1>
            <p className={`text-sm mt-2 ${isEditable ? "cursor-pointer hover:underline" : ""}`} onClick={() => handleChangeText("desc")}>{desc}</p>
          </div>

          {isEditable && (
            <div className="absolute top-4 left-4 right-4 flex justify-between">
              <div className="flex flex-col items-start gap-2">
                <button onClick={() => setShowBgColors(!showBgColors)} className="p-2 px-4 bg-blue-500/70 text-white rounded-lg font-medium text-sm text-center shadow transition hover:bg-blue-600/90 hover:scale-105 active:bg-blue-800/90 select-none">
                  배경색 {showBgColors ? "닫기" : "열기"}
                </button>
                {showBgColors && (
                  <div className="flex flex-col">
                    <div className="flex gap-2 flex-wrap mt-2 w-[150px]">
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
                      className="w-[120px]"
                    />
                    <button onClick={() => bgInputRef.current?.click()} className="p-2 px-4 bg-blue-500/70 text-white rounded-lg font-medium text-sm text-center shadow transition hover:bg-blue-600/90 hover:scale-105 active:bg-blue-800/90 select-none" disabled={isUploading}>배경이미지설정</button>
                    <button onClick={handleDeleteBackground} className="p-2 px-4 bg-blue-500/70 text-white rounded-lg font-medium text-sm text-center shadow transition hover:bg-blue-600/90 hover:scale-105 active:bg-blue-800/90 select-none">배경이미지삭제</button>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-2">
                <button onClick={() => setShowTextColors(!showTextColors)} className="p-2 px-4 bg-blue-500/70 text-white rounded-lg font-medium text-sm text-center shadow transition hover:bg-blue-600/90 hover:scale-105 active:bg-blue-800/90 select-none">
                  텍스트색 {showTextColors ? "닫기" : "열기"}
                </button>
                {showTextColors && (
                  <div className="flex gap-2 flex-wrap mt-2 justify-end w-[120px]">
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

       
        {cropImageSrc && cropType && (
          <CropperModal
            image={cropImageSrc}
            type={cropType}
            onCancel={() => {
              setCropImageSrc(null);
              setCropType(null);
              setIsUploading(false); // 취소 시 업로드 상태도 초기화
            }}
            onCrop={handleCropApply}
          />
        )}
        {isUploading && !cropImageSrc && ( // 모달이 떠있지 않을 때만 전체 화면 로더 표시
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
              <div className="bg-white p-6 rounded-md shadow-lg flex flex-col items-center">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-lg font-medium">이미지를 업로드 중입니다...</p>
              </div>
          </div>
        )}

        {/* 프로필 사진 팝업 모달 */}
        <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
          <DialogContent className="sm:max-w-[500px] bg-white">
            <DialogHeader>
              <DialogTitle className="text-center text-xl font-bold text-gray-800">
                {name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* 프로필 사진 */}
              <div className="flex justify-center">
                <Image
                  src={logoUrl}
                  alt="프로필 사진"
                  width={200}
                  height={200}
                  priority
                  className="rounded-full border-4 border-gray-200 shadow-lg"
                />
              </div>
              
              {/* 설명 */}
              <div className="text-center">
                <p className="text-gray-600 text-lg">{desc}</p>
              </div>

              {/* 버튼들 */}
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={handleCopyAddress}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  <Copy className="w-5 h-5" />
                  주소 복사
                </Button>
                <Button
                  onClick={handleShare}
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                  공유하기
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Gallery3;