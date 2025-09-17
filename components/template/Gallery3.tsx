"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { useSelector } from "react-redux";
import { uploadLogoImage, uploadLinkImage, deleteImageFromStorage } from "@/hooks/useUploadImage"; // deleteImageFromStorage도 필요합니다.
import imageCompression from "browser-image-compression";
import { cn } from "@/lib/utils";

import CropperModal from '@/components/ui/CropperModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Share2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import QRShare from './QRShare';

type LogoProps = {
  username?: string;
  uid?: string;
};

interface GallerySettings {
  logoUrl: string;
  bgUrl: string;
  name: string;
  desc: string;
  bgColor: string;
  bgOpacity: number;
  textColor: string;
  shadow: string;
  shadowColor: string;
  shadowOpacity: number;
  rounded: string;
}

const COLOR_PALETTE = [
  "transparent",
  "#000000", "#FFFFFF", "#F87171", "#FBBF24",
  "#34D399", "#60A5FA", "#A78BFA", "#F472B6",
];

export default function Gallery3({ username, uid }: LogoProps) {
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropType, setCropType] = useState<'logo' | 'background' | null>(null);
  const [isUploading, setIsUploading] = useState(false); // 업로드 상태 추가
  const [showProfileModal, setShowProfileModal] = useState(false); // 프로필 팝업 상태 추가
  const [shadow, setShadow] = useState("none");
  const [shadowColor, setShadowColor] = useState("#000000");
  const [shadowOpacity, setShadowOpacity] = useState(0.2);
  const [rounded, setRounded] = useState("md");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editType, setEditType] = useState<"name" | "desc" | null>(null);
  const [editValue, setEditValue] = useState("");

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
        if (data.shadow) setShadow(data.shadow);
        if (data.shadowColor) setShadowColor(data.shadowColor);
        if (data.shadowOpacity) setShadowOpacity(parseFloat(data.shadowOpacity));
        if (data.rounded) setRounded(data.rounded);
      }
    };
    fetchData();
  }, [finalUid]); // finalUid가 변경될 때마다 데이터를 가져오도록 의존성 배열에 추가

  const handleChangeText = async (type: "name" | "desc") => {
    if (!isEditable) return;
    const current = type === "name" ? name : desc;
    setEditType(type);
    setEditValue(current);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editType || !editValue.trim()) {
      alert(editType === "name" ? "제목을 입력해주세요." : "설명을 입력해주세요.");
      return;
    }

    try {
      if (editType === "name") {
        setName(editValue);
      } else {
        setDesc(editValue);
      }
      await saveToFirestore({ [editType]: editValue });
      setEditDialogOpen(false);
      setEditType(null);
      setEditValue("");
    } catch (error) {
      alert("저장 중 오류가 발생했습니다.");
    }
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

      const storagePath = cropType === "logo" 
        ? `${finalUid}/logos/logo_${Date.now()}`
        : `${finalUid}/backgrounds/bg_${Date.now()}`;

      const options = {
        ...(cropType === 'logo'
          ? {
              maxSizeMB: 3,  // 더 큰 파일 크기 허용
              maxWidthOrHeight: 800,  // 더 큰 크기로 증가
              useWebWorker: true,
              quality: 1,
              fileType: 'png',  // PNG 형식 사용
              initialQuality: 1  // 초기 품질도 최대로
            }
          : {
              maxSizeMB: 2,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
              quality: 0.95
            }
        )
      };

      const croppedFile = new File([croppedBlob], `cropped_image.${cropType === 'logo' ? 'png' : 'jpeg'}`, { type: cropType === 'logo' ? 'image/png' : croppedBlob.type });
      const compressedFile = await imageCompression(croppedFile, options);
      const uploadFn = cropType === "logo" ? uploadLogoImage : uploadLinkImage;

      const url = await uploadFn(compressedFile, finalUid);

      // 이전 이미지 삭제 시도
      const docRef = doc(db, 'users', finalUid, 'info', 'details');
      const docSnap = await getDoc(docRef);
      const data = docSnap.exists() ? docSnap.data() : null;
      
      if (cropType === "logo" && data?.logoStoragePath) {
        try {
          await deleteImageFromStorage(data.logoStoragePath);
        } catch (deleteError) {
          console.warn('이전 로고 이미지 삭제 실패:', deleteError);
        }
      } else if (cropType === "background" && data?.bgStoragePath) {
        try {
          await deleteImageFromStorage(data.bgStoragePath);
        } catch (deleteError) {
          console.warn('이전 배경 이미지 삭제 실패:', deleteError);
        }
      }

      if (cropType === "logo") {
        setLogoUrl(url);
        await saveToFirestore({ 
          logoUrl: url,
          logoStoragePath: storagePath
        });
      } else {
        setBgUrl(url);
        await saveToFirestore({ 
          bgUrl: url,
          bgStoragePath: storagePath
        });
      }

      alert("이미지가 성공적으로 업데이트되었습니다.");

    } catch (error) {
      console.error('이미지 업로드 실패:', error);
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
      const docRef = doc(db, 'users', finalUid, 'info', 'details');
      const docSnap = await getDoc(docRef);
      const data = docSnap.exists() ? docSnap.data() : null;
      
      if (data?.bgStoragePath) {
        try {
          await deleteImageFromStorage(data.bgStoragePath);
        } catch (deleteError) {
          console.warn('배경 이미지 삭제 실패:', deleteError);
        }
      }
      
      setBgUrl(defaultBg);
      await saveToFirestore({ 
        bgUrl: defaultBg,
        bgStoragePath: null
      });
      alert("배경 이미지가 삭제되었습니다.");
    } catch (error) {
      console.error('배경 이미지 삭제 실패:', error);
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

  // 그림자 스타일 계산 함수
  const getShadowStyle = () => {
    const shadowColorRgba = shadowColor 
      ? `rgba(${parseInt(shadowColor.slice(1, 3), 16)}, ${parseInt(shadowColor.slice(3, 5), 16)}, ${parseInt(shadowColor.slice(5, 7), 16)}, ${shadowOpacity})`
      : 'rgba(0, 0, 0, 0.2)';
    
    switch (shadow) {
      case 'none':
        return 'none';
      case 'sm':
        return `0 1px 2px ${shadowColorRgba}`;
      case 'md':
        return `0 4px 6px ${shadowColorRgba}`;
      case 'lg':
        return `0 10px 15px ${shadowColorRgba}`;
      case 'retro':
        return `8px 8px 0px 0px ${shadowColorRgba}`;
      case 'float':
        return `0 10px 20px -5px ${shadowColorRgba}`;
      case 'glow':
        return `0 0 20px ${shadowColorRgba}`;
      case 'inner':
        return `inset 0 2px 4px ${shadowColorRgba}`;
      case 'sharp':
        return `-10px 10px 0px ${shadowColorRgba}`;
      case 'soft':
        return `0 5px 15px ${shadowColorRgba}`;
      case 'stripe':
        return `4px 4px 0 ${shadowColorRgba}, 8px 8px 0 ${shadowColorRgba}, 12px 12px 0 ${shadowColorRgba}`;
      case 'cross':
        return `4px 4px 0 ${shadowColorRgba}, -4px -4px 0 ${shadowColorRgba}, 4px -4px 0 ${shadowColorRgba}, -4px 4px 0 ${shadowColorRgba}`;
      case 'diagonal':
        return `4px 4px 0 ${shadowColorRgba}, 8px 8px 0 ${shadowColorRgba}, 12px 12px 0 ${shadowColorRgba}, -4px -4px 0 ${shadowColorRgba}, -8px -8px 0 ${shadowColorRgba}, -12px -12px 0 ${shadowColorRgba}`;
      default:
        return 'none';
    }
  };

  return (
    <>
    <div className="flex items-center justify-center w-full md:p-[10px]">
      <div 
        className={cn(
          "relative w-full md:w-[1000px] overflow-hidden",
          rounded === 'none' && 'rounded-none',
          rounded === 'sm' && 'rounded',
          rounded === 'md' && 'rounded-lg',
          rounded === 'lg' && 'rounded-xl',
          rounded === 'full' && 'rounded-full',
        )}
        style={{ 
          backgroundColor: computedBgColor, 
          minHeight: "300px",
          boxShadow: getShadowStyle(),
          borderColor: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(shadow) ? shadowColor : undefined,
          borderWidth: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(shadow) ? '2px' : undefined,
          borderStyle: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(shadow) ? 'solid' : undefined,
        }}
      >
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
          <div className="relative">
            <Image
              src={logoUrl}
              alt="로고"
              width={120}
              height={120}
              priority
              className="rounded-full shadow-md cursor-pointer hover:scale-105 transition-all duration-200"
              onClick={handleProfileClick}
              title={isEditable ? "로고 클릭 시 변경" : "프로필 사진 클릭 시 상세보기"}
            />
            {!isEditable && (
              <div className="absolute top-1.5 right-1.5 w-6 h-6 bg-green-500 rounded-full shadow-sm animate-pulse border border-white/50">
              </div>
            )}
          </div>
          <div className="mt-6 px-6 py-3 mb-8 text-center">
            <h1 className={`text-2xl font-bold ${isEditable ? "cursor-pointer hover:underline" : ""}`} onClick={() => handleChangeText("name")}>{name}</h1>
            <p className={`text-sm mt-2 ${isEditable ? "cursor-pointer hover:underline" : ""} whitespace-pre-wrap break-words`} onClick={() => handleChangeText("desc")}>{desc}</p>
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
                  <div className="fixed right-4 top-20 flex flex-col gap-4 w-[280px] bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-700 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                    {/* 1. 텍스트 색상 설정 */}
                    <div className="flex flex-col gap-2 bg-gray-700/50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-100 w-20 flex-shrink-0">텍스트</span>
                        <div className="flex flex-wrap gap-1">
                          {COLOR_PALETTE.map((color) => (
                            <button
                              key={`text-${color}`}
                              onClick={() => handleColorSelect("textColor", color)}
                              className={cn(
                                "w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110",
                                textColor === color && "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800"
                              )}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 2. 그림자 색상 설정 */}
                    <div className="flex flex-col gap-2 bg-gray-700/50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-100 w-20 flex-shrink-0">그림자</span>
                        <div className="flex flex-wrap gap-1">
                          {COLOR_PALETTE.map((color) => (
                            <button
                              key={`shadow-${color}`}
                              onClick={async () => {
                                setShadowColor(color);
                                await saveToFirestore({ shadowColor: color });
                              }}
                              className={cn(
                                "w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110",
                                shadowColor === color && "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800"
                              )}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-100 w-20 flex-shrink-0">투명도</span>
                        <input
                          type="range"
                          min={0.1}
                          max={1}
                          step={0.1}
                          value={shadowOpacity}
                          onChange={async (e) => {
                            const value = parseFloat(e.target.value);
                            setShadowOpacity(value);
                            await saveToFirestore({ shadowOpacity: value });
                          }}
                          className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-sm text-gray-100 w-10 text-right">
                          {shadowOpacity.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* 3. 모서리와 그림자 스타일 설정 */}
                    <div className="flex flex-col gap-2 bg-gray-700/50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-100 w-20 flex-shrink-0">모서리</span>
                        <select
                          value={rounded}
                          onChange={async (e) => {
                            setRounded(e.target.value);
                            await saveToFirestore({ rounded: e.target.value });
                          }}
                          className="flex-1 px-2 py-1.5 bg-gray-800 text-gray-100 rounded-lg border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="none">각진</option>
                          <option value="sm">약간 둥근</option>
                          <option value="md">둥근</option>
                          <option value="lg">많이 둥근</option>
                          <option value="full">완전 둥근</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-100 w-20 flex-shrink-0">효과</span>
                        <select
                          value={shadow}
                          onChange={async (e) => {
                            const newShadow = e.target.value;
                            setShadow(newShadow);
                            await saveToFirestore({ 
                              shadow: newShadow,
                              // 새로운 그림자 효과를 선택할 때 현재 색상과 투명도도 함께 저장
                              shadowColor: shadowColor,
                              shadowOpacity: shadowOpacity
                            });
                          }}
                          className="flex-1 px-2 py-1.5 bg-gray-800 text-gray-100 rounded-lg border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="none">없음</option>
                          <option value="sm">약한</option>
                          <option value="md">보통</option>
                          <option value="lg">강한</option>
                          <option value="retro">레트로</option>
                          <option value="float">플로팅</option>
                          <option value="glow">글로우</option>
                          <option value="inner">이너</option>
                          <option value="sharp">샤프</option>
                          <option value="soft">소프트</option>
                          <option value="stripe">스트라이프</option>
                          <option value="cross">크로스</option>
                          <option value="diagonal">대각선</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

       
        {cropImageSrc && cropType && (
          <CropperModal
            imageUrl={cropImageSrc}
            onClose={() => {
              setCropImageSrc(null);
              setCropType(null);
              setIsUploading(false); // 취소 시 업로드 상태도 초기화
            }}
            onSave={handleCropApply}
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
          <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-md border-0">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-center text-2xl font-bold text-white">
                {name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-8">
              {/* 프로필 사진 */}
              <div className="flex justify-center">
                <div className="p-1 rounded-full bg-white">
                  <Image
                    src={logoUrl}
                    alt="프로필 사진"
                    width={200}
                    height={200}
                    priority
                    className="rounded-full"
                  />
                </div>
              </div>
              
              {/* 설명 */}
              <div className="text-center px-4">
                <p className="text-white text-lg font-medium leading-relaxed whitespace-pre-wrap break-words">{desc}</p>
              </div>

              {/* QR 코드 */}
              <div className="flex flex-col items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <QRShare userId={finalUid} username={finalUsername} />
              </div>

              {/* 버튼들 */}
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={handleCopyAddress}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-6 py-3 rounded-xl transition-all duration-200 backdrop-blur-sm"
                >
                  <Copy className="w-[18px] h-[18px]" />
                  주소 복사
                </Button>
                <Button
                  onClick={handleShare}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-6 py-3 rounded-xl transition-all duration-200 backdrop-blur-sm"
                >
                  <Share2 className="w-[18px] h-[18px]" />
                  공유하기
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

          {/* 텍스트 편집 다이얼로그 */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editType === "name" ? "제목 수정" : "설명 수정"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>
                    {editType === "name" ? "제목" : "설명"}
                  </Label>
                  {editType === "name" ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="제목을 입력하세요 (이모지 사용 가능 😊)"
                      className="h-12"
                    />
                  ) : (
                    <Textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="설명을 입력하세요 (이모지 사용 가능 😊)"
                      className="min-h-[100px]"
                    />
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditDialogOpen(false);
                    setEditType(null);
                    setEditValue("");
                  }}
                >
                  취소
                </Button>
                <Button onClick={handleEditSubmit}>
                  저장
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
};