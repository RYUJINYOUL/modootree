"use client"
import React, { useRef, useState, useEffect } from 'react'
import useUIState from "@/hooks/useUIState";
import { cn } from "@/lib/utils";
import Image from 'next/image'
import { useSelector } from 'react-redux';
import { usePathname } from 'next/navigation'
import { uploadLogoImage } from "@/hooks/useUploadImage";
import { db } from '../../firebase';
import { doc, setDoc, getDoc } from "firebase/firestore";


type LogoProps = {
  username?: string;
  uid?: string;
};

function Logo({ username, uid }: LogoProps) {
  const pathname = usePathname();
  const isEditable = pathname.startsWith("/editor/");
  const { setHeaderImageSrc } = useUIState();
  const { currentUser } = useSelector((state: any) => state.user);

  // ✅ props 우선, 없으면 Redux fallback
  const finalUid = uid ?? currentUser?.uid;
  const finalUsername = username ?? currentUser?.username ?? "사이트";

  const [logoSrc, setLogoSrc] = useState("/Image/mainmiddle.jpeg");
  const [siteName, setSiteName] = useState(finalUsername);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchLogoInfo = async () => {
      try {
        const docRef = doc(db, "users", finalUid, "info", "logo");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.logoUrl) setLogoSrc(data.logoUrl);
          if (data.siteName) setSiteName(data.siteName);
        }
      } catch (err) {
        console.error("설정 불러오기 실패:", err);
      }
    };
    if (finalUid) fetchLogoInfo();
  }, [finalUid]);

  const onClickLogoImage = () => {
    if (!isEditable) return;
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !finalUid) return;

    try {
      const url = await uploadLogoImage(file, finalUid);
      setLogoSrc(url);
      setHeaderImageSrc?.(url);
      await setDoc(
        doc(db, "users", finalUid, "info", "logo"),
        { logoUrl: url },
        { merge: true }
      );
      alert("로고가 저장되었습니다.");
    } catch (err) {
      console.error("로고 업로드 실패:", err);
      alert("업로드 실패");
    }
  };

  const onClickSiteName = async () => {
    if (!isEditable || !finalUid) return;
    const newName = prompt("새 이름을 입력하세요", siteName);
    if (!newName) return;

    setSiteName(newName);
    try {
      await setDoc(
        doc(db, "users", finalUid, "info", "logo"),
        { siteName: newName },
        { merge: true }
      );
      alert("이름이 저장되었습니다.");
    } catch (err) {
      console.error("이름 저장 실패:", err);
      alert("저장 실패");
    }
  };

  return (
    <section className='items-center'>
      <input
        type="file"
        accept="image/*"
        onChange={onFileChange}
        ref={fileInputRef}
        className="hidden"
      />
      <div className='flex flex-row items-center space-x-2'>
        <Image
          className={cn(
            'rounded-4xl lg:w-[25px] lg:h-[25px] w-[40px] h-[40px]',
            isEditable
              ? 'cursor-pointer hover:opacity-80 transition duration-200 ring-1 ring-transparent hover:ring-blue-400'
              : 'cursor-default'
          )}
          alt='logo'
          width={60}
          height={60}
          src={logoSrc}
          onClick={onClickLogoImage}
        />
        <div
          className={cn(
            'font-semibold md:text-[20px] text-[18px] transition duration-200',
            pathname !== "/" ? "text-black" : "text-white",
            isEditable
              ? 'cursor-pointer hover:underline hover:text-blue-500'
              : 'cursor-default'
          )}
          onClick={onClickSiteName}
        >
          {siteName}
        </div>
      </div>
    </section>
  );
}


export default Logo;
