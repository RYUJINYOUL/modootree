'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/firebase';
import { FaInstagram, FaFacebook, FaYoutube, FaShoppingBag, FaBlogger, FaLink, FaHeart } from 'react-icons/fa';
import { BsPhone, BsGlobe2, BsEyeFill, BsThreeDots } from 'react-icons/bs';
import { IoLocationSharp } from 'react-icons/io5';
import { RiKakaoTalkFill } from 'react-icons/ri';
import { SiNaver } from 'react-icons/si';
import { useToast } from '@/components/ui/use-toast';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { IconType } from 'react-icons';
import { cn } from '@/lib/utils';

interface ContactButtonsProps {
  username?: string;
  uid?: string;
}

interface ContactInfo {
  phone: string;
  location: string;
  instagram: string;
  facebook: string;
  youtube: string;
  kakao: string;
  naver: string;
  website: string;
  shop: string;
  blog: string;
  views: number;
  likes: number;
  likedBy: string[];
  bgColor?: string;      // 배경색 추가
  textColor?: string;    // 텍스트 색상 추가
  bgOpacity?: number;    // 배경 투명도 추가
  shadow?: string;       // 그림자 효과 추가
}

const DEFAULT_CONTACT: ContactInfo = {
  phone: '',
  location: '',
  instagram: '',
  facebook: '',
  youtube: '',
  kakao: '',
  naver: '',
  website: '',
  shop: '',
  blog: '',
  views: 0,
  likes: 0,
  likedBy: [],
  bgColor: '#60A5FA',    // 기본 배경색
  textColor: '#FFFFFF',  // 기본 텍스트 색상
  bgOpacity: 0.2,       // 기본 투명도
  shadow: 'none',       // 기본 그림자 효과
};

const COLOR_PALETTE = [
  "#000000", "#FFFFFF", "#F87171", "#FBBF24",
  "#34D399", "#60A5FA", "#A78BFA", "#F472B6",
];

interface ButtonConfig {
  field: string;
  icon: IconType;
  label: string;
  color: string;
  onClick?: () => void;
  count?: number;
  isActive?: boolean;
}

export default function ContactButtons({ username, uid }: ContactButtonsProps) {
  const [contactInfo, setContactInfo] = useState<ContactInfo>(DEFAULT_CONTACT);
  const [showAllButtons, setShowAllButtons] = useState(false);
  const [showColorSettings, setShowColorSettings] = useState(false);
  const pathname = usePathname();
  const isEditable = pathname ? pathname.startsWith('/editor') : false;
  const { currentUser } = useSelector((state: any) => state.user);
  const finalUid = uid ?? currentUser?.uid;
  const [hasLiked, setHasLiked] = useState(false);
  const { showToast } = useToast();

  // 슬라이더 설정
  const sliderSettings = {
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 4,
    responsive: [
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 4,
          slidesToScroll: 4,
          dots: true,
          arrows: false,
        }
      }
    ]
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!finalUid) return;
      const docRef = doc(db, 'users', finalUid, 'info', 'contact');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as ContactInfo;
        // likedBy가 없는 경우 빈 배열로 초기화
        const updatedData = {
          ...data,
          likedBy: data.likedBy || [],
          likes: data.likes || 0,
          views: data.views || 0
        };
        setContactInfo(updatedData);
        
        // 현재 사용자가 이미 좋아요를 눌렀는지 확인
        const userId = currentUser?.uid || 'anonymous';
        setHasLiked(updatedData.likedBy.includes(userId));
        
        // 조회수 증가 (자신의 페이지가 아닐 경우에만)
        if (!isEditable && currentUser?.uid !== finalUid) {
          await updateDoc(docRef, {
            views: increment(1)
          });
        }
      } else {
        // 문서가 없으면 기본값으로 생성
        const defaultData = {
          ...DEFAULT_CONTACT,
          likedBy: [],
          likes: 0,
          views: 0
        };
        await setDoc(docRef, defaultData);
        setContactInfo(defaultData);
      }
    };
    fetchData();
  }, [finalUid, currentUser?.uid, isEditable]);

  const handleLike = async () => {
    if (!finalUid || isEditable) return;
    
    if (!currentUser?.uid) {
      showToast({
        title: "좋아요",
        description: "로그인하지 않은 상태에서도 좋아요를 누를 수 있습니다.",
        duration: 2000,
      });
    }

    const docRef = doc(db, 'users', finalUid, 'info', 'contact');
    const anonymousId = 'anonymous_' + Math.random().toString(36).substring(7);
    const userId = currentUser?.uid || anonymousId;
    
    try {
      const currentLikedBy = contactInfo.likedBy || [];
      
      if (hasLiked) {
        // 좋아요 취소
        await updateDoc(docRef, {
          likedBy: currentLikedBy.filter(id => id !== userId)
        });
        setContactInfo(prev => ({
          ...prev,
          likedBy: currentLikedBy.filter(id => id !== userId)
        }));
        setHasLiked(false);
      } else {
        // 좋아요 추가
        await updateDoc(docRef, {
          likedBy: [...currentLikedBy, userId]
        });
        setContactInfo(prev => ({
          ...prev,
          likedBy: [...currentLikedBy, userId]
        }));
        setHasLiked(true);
      }
    } catch (error) {
      console.error('좋아요 처리 중 오류:', error);
      showToast({
        title: "오류",
        description: "좋아요 처리에 실패했습니다.",
        duration: 2000,
      });
    }
  };

  const handleEdit = async (field: keyof ContactInfo) => {
    if (!isEditable) return;

    let prompt_text = '';
    switch (field) {
      case 'phone':
        prompt_text = '전화번호를 입력하세요 (예: 010-1234-5678)';
        break;
      case 'location':
        prompt_text = '카카오맵 공유 URL을 입력하세요';
        break;
      default:
        prompt_text = `${field} URL을 입력하세요`;
    }

    // 숫자형 필드는 제외하고 문자열 필드만 처리
    if (field !== 'views' && field !== 'likes') {
      const value = prompt(prompt_text, contactInfo[field] as string);
      if (value === null) return;

      const newInfo = { ...contactInfo, [field]: value };
      try {
        await setDoc(doc(db, 'users', finalUid, 'info', 'contact'), newInfo);
        setContactInfo(newInfo);
        alert('저장되었습니다.');
      } catch (error) {
        console.error('저장 실패:', error);
        alert('저장에 실패했습니다.');
      }
    }
  };

  const handleButtonClick = (field: keyof ContactInfo) => {
    if (isEditable) {
      handleEdit(field);
      return;
    }

    const url = contactInfo[field];
    if (!url || url === '') {
      return;
    }

    switch (field) {
      case 'phone':
        window.location.href = `tel:${url}`;
        break;
      case 'location':
        window.open(String(url) || '#', '_blank', 'noopener,noreferrer');
        break;
      default:
        window.open(String(url) || '#', '_blank', 'noopener,noreferrer');
    }
  };

  const handleColorSelect = async (type: 'bgColor' | 'textColor' | 'shadow', color: string) => {
    if (!isEditable || !finalUid) return;

    const newInfo = { ...contactInfo, [type]: color };
    try {
      await setDoc(doc(db, 'users', finalUid, 'info', 'contact'), newInfo);
      setContactInfo(newInfo);
    } catch (error) {
      console.error('색상 저장 실패:', error);
      alert('색상 저장에 실패했습니다.');
    }
  };

  const handleOpacityChange = async (value: number) => {
    if (!isEditable || !finalUid) return;

    const newInfo = { ...contactInfo, bgOpacity: value };
    try {
      await setDoc(doc(db, 'users', finalUid, 'info', 'contact'), newInfo);
      setContactInfo(newInfo);
    } catch (error) {
      console.error('투명도 저장 실패:', error);
      alert('투명도 저장에 실패했습니다.');
    }
  };

  const renderColorSettings = () => {
    if (!isEditable) return null;

    const SHADOW_OPTIONS = [
      { value: 'none', label: '없음' },
      { value: 'sm', label: '약하게' },
      { value: 'md', label: '보통' },
      { value: 'lg', label: '강하게' },
      { value: 'retro', label: '레트로' },
      { value: 'retro-black', label: '레트로-블랙' },
      { value: 'retro-sky', label: '레트로-하늘' },
      { value: 'retro-gray', label: '레트로-회색' },
      { value: 'retro-white', label: '레트로-하얀' },
    ];

    return (
      <div className="w-full px-4 mb-4">
        <button
          onClick={() => setShowColorSettings(!showColorSettings)}
          className="w-full p-2 bg-blue-500/20 text-white rounded-lg mb-2 hover:bg-blue-500/30 transition-all"
        >
          버튼 스타일 설정 {showColorSettings ? '닫기' : '열기'}
        </button>

        {showColorSettings && (
          <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
            <div>
              <label className="text-white text-sm mb-2 block">배경색</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={`bg-${color}`}
                    onClick={() => handleColorSelect('bgColor', color)}
                    className="w-8 h-8 rounded-full border border-white/20"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-white text-sm mb-2 block">텍스트 색상</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={`text-${color}`}
                    onClick={() => handleColorSelect('textColor', color)}
                    className="w-8 h-8 rounded-full border border-white/20"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-white text-sm mb-2 block">배경 투명도</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={contactInfo.bgOpacity ?? 0.2}
                onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-white text-sm mb-2 block">그림자 효과</label>
              <select
                value={contactInfo.shadow}
                onChange={(e) => handleColorSelect('shadow', e.target.value)}
                className="w-full p-2 rounded-lg bg-gray-700 text-white border border-gray-600"
              >
                {SHADOW_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderButtons = () => {
    const buttons: ButtonConfig[] = [
      ...((!isEditable) ? [
        { field: 'views', icon: BsEyeFill, label: '', color: 'text-blue-400/80', count: contactInfo.views || 0 },
        { field: 'likes', icon: FaHeart, label: '', color: 'text-red-500', onClick: handleLike, count: contactInfo.likedBy?.length || 0, isActive: hasLiked }
      ] : []),
      { field: 'phone', icon: BsPhone, label: '전화번호', color: 'text-gray-100/90' },
      { field: 'location', icon: IoLocationSharp, label: '위치', color: 'text-red-500/90' },
      { field: 'instagram', icon: FaInstagram, label: '인스타그램', color: 'text-pink-500/90' },
      { field: 'facebook', icon: FaFacebook, label: '페이스북', color: 'text-blue-600/90' },
      { field: 'youtube', icon: FaYoutube, label: '유튜브', color: 'text-red-600/90' },
      { field: 'kakao', icon: RiKakaoTalkFill, label: '카카오톡', color: 'text-yellow-400/90' },
      { field: 'naver', icon: SiNaver, label: '네이버', color: 'text-green-500/90' },
      { field: 'website', icon: BsGlobe2, label: '웹사이트', color: 'text-blue-400/90' },
      { field: 'shop', icon: FaShoppingBag, label: '쇼핑몰', color: 'text-purple-500/90' },
      { field: 'blog', icon: FaBlogger, label: '블로그', color: 'text-orange-500/90' },
    ];

    // 에디터 모드가 아닐 때는 링크가 있는 버튼만 표시
    const filteredButtons = isEditable 
      ? buttons 
      : buttons.filter(button => {
          if (button.field === 'views' || button.field === 'likes') return true;
          return contactInfo[button.field as keyof ContactInfo] && contactInfo[button.field as keyof ContactInfo] !== '';
        });

    return (
      <div className="w-full my-4">
        {/* 데스크톱 뷰 */}
        <div className="hidden md:grid grid-cols-10 gap-3">
          {filteredButtons.map((button, index) => renderButton(button))}
        </div>

        {/* 모바일 뷰 - 캐러셀 */}
        <div className="md:hidden">
          <Slider {...sliderSettings}>
            {filteredButtons.map((button, index) => (
              <div key={button.field} className="px-1">
                {renderButton(button)}
              </div>
            ))}
          </Slider>
        </div>
      </div>
    );
  };

  const renderButton = (button: ButtonConfig) => {
    const bgColorWithOpacity = contactInfo.bgColor 
      ? `${contactInfo.bgColor}${Math.round((contactInfo.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`
      : 'rgba(96, 165, 250, 0.2)';

    return (
      <button
        key={button.field}
        onClick={() => button.onClick ? button.onClick() : handleButtonClick(button.field as keyof ContactInfo)}
        className={cn(
          "w-full h-[70px] flex flex-col items-center justify-center gap-1 p-2 rounded-xl hover:bg-opacity-30 transition-all",
          isEditable ? 'cursor-pointer' : contactInfo[button.field as keyof ContactInfo] ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
          contactInfo.shadow === 'none' && 'shadow-none',
          contactInfo.shadow === 'sm' && 'shadow-sm',
          contactInfo.shadow === 'md' && 'shadow',
          contactInfo.shadow === 'lg' && 'shadow-lg',
          contactInfo.shadow === 'retro' && 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
          contactInfo.shadow === 'retro-black' && 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
          contactInfo.shadow === 'retro-sky' && 'shadow-[8px_8px_0px_0px_rgba(2,132,199,1)]',
          contactInfo.shadow === 'retro-gray' && 'shadow-[8px_8px_0px_0px_rgba(107,114,128,1)]',
          contactInfo.shadow === 'retro-white' && 'shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]'
        )}
        style={{
          backgroundColor: button.isActive ? bgColorWithOpacity.replace(/0.2/, '0.3') : bgColorWithOpacity,
          color: contactInfo.textColor || '#FFFFFF',
          ...(contactInfo.shadow?.includes('retro') && { 
            border: contactInfo.shadow === 'retro-sky' ? '2px solid rgb(2 132 199)' :
                    contactInfo.shadow === 'retro-gray' ? '2px solid rgb(107 114 128)' :
                    contactInfo.shadow === 'retro-white' ? '2px solid rgb(255 255 255)' :
                    '2px solid rgb(0 0 0)'
          })
        }}
      >
        <button.icon className={`text-2xl ${button.color}`} />
        <span className="text-xs" style={{ color: contactInfo.textColor }}>{button.label}</span>
        {button.count !== undefined && (
          <span className="text-xs opacity-60" style={{ color: contactInfo.textColor }}>{button.count}</span>
        )}
      </button>
    );
  };

  return (
    <div className="w-full px-4 py-2">
      {renderColorSettings()}
      {renderButtons()}
    </div>
  );
} 