'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
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
  bgColor?: string;
  textColor?: string;
  bgOpacity?: number;
  shadow?: string;
  shadowColor?: string;
  shadowOpacity?: number;
  rounded?: string;
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
  bgColor: '#60A5FA',
  textColor: '#FFFFFF',
  bgOpacity: 0.2,
  shadow: 'none',
  shadowColor: '#000000',
  shadowOpacity: 0.2,
  rounded: 'md'
};

const COLOR_PALETTE = [
  'transparent',
  '#000000', '#FFFFFF', '#F87171', '#FBBF24',
  '#34D399', '#60A5FA', '#A78BFA', '#F472B6',
];

const COLOR_PALETTE_NO_TRANSPARENT = [
  '#000000', '#FFFFFF', '#F87171', '#FBBF24',
  '#34D399', '#60A5FA', '#A78BFA', '#F472B6',
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

  const handleColorSelect = async (type: 'bgColor' | 'textColor' | 'shadow' | 'shadowColor' | 'rounded', color: string) => {
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

  const handleBgOpacityChange = async (value: number) => {
    if (!isEditable || !finalUid) return;

    const newInfo = { ...contactInfo, bgOpacity: value };
    try {
      await setDoc(doc(db, 'users', finalUid, 'info', 'contact'), newInfo);
      setContactInfo(newInfo);
    } catch (error) {
      console.error('배경 투명도 저장 실패:', error);
      alert('배경 투명도 저장에 실패했습니다.');
    }
  };

  const handleShadowOpacityChange = async (value: number) => {
    if (!isEditable || !finalUid) return;

    const newInfo = { ...contactInfo, shadowOpacity: value };
    try {
      await setDoc(doc(db, 'users', finalUid, 'info', 'contact'), newInfo);
      setContactInfo(newInfo);
    } catch (error) {
      console.error('그림자 투명도 저장 실패:', error);
      alert('그림자 투명도 저장에 실패했습니다.');
    }
  };

  const getShadowStyle = () => {
    const shadowColor = contactInfo.shadowColor 
      ? `rgba(${parseInt(contactInfo.shadowColor.slice(1, 3), 16)}, ${parseInt(contactInfo.shadowColor.slice(3, 5), 16)}, ${parseInt(contactInfo.shadowColor.slice(5, 7), 16)}, ${contactInfo.shadowOpacity ?? 0.2})`
      : 'rgba(0, 0, 0, 0.2)';
    
    switch (contactInfo.shadow) {
      case 'none':
        return 'none';
      case 'sm':
        return `0 1px 2px ${shadowColor}`;
      case 'md':
        return `0 4px 6px ${shadowColor}`;
      case 'lg':
        return `0 10px 15px ${shadowColor}`;
      case 'retro':
        return `8px 8px 0px 0px ${shadowColor}`;
      case 'float':
        return `0 10px 20px -5px ${shadowColor}`;
      case 'glow':
        return `0 0 20px ${shadowColor}`;
      case 'inner':
        return `inset 0 2px 4px ${shadowColor}`;
      case 'sharp':
        return `-10px 10px 0px ${shadowColor}`;
      case 'soft':
        return `0 5px 15px ${shadowColor}`;
      case 'stripe':
        return `4px 4px 0 ${shadowColor}, 8px 8px 0 ${shadowColor}, 12px 12px 0 ${shadowColor}`;
      case 'cross':
        return `4px 4px 0 ${shadowColor}, -4px -4px 0 ${shadowColor}, 4px -4px 0 ${shadowColor}, -4px 4px 0 ${shadowColor}`;
      case 'diagonal':
        return `4px 4px 0 ${shadowColor}, 8px 8px 0 ${shadowColor}, 12px 12px 0 ${shadowColor}, -4px -4px 0 ${shadowColor}, -8px -8px 0 ${shadowColor}, -12px -12px 0 ${shadowColor}`;
      default:
        return 'none';
    }
  };

  const getButtonSpacing = (shadowType: string | undefined) => {
    switch (shadowType) {
      case 'stripe':
      case 'cross':
      case 'diagonal':
        return 'my-4 md:my-2'; // 모바일에서 더 큰 여백
      case 'retro':
      case 'sharp':
        return 'my-3 md:my-2'; // 중간 크기 여백
      default:
        return 'my-2'; // 기본 여백
    }
  };

  const renderColorSettings = () => {
    if (!isEditable) return null;

    // hex to rgba 변환 함수
    const hexToRgba = (hex: string, opacity: number) => {
      if (hex === 'transparent') return 'transparent';
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };

    return (
      <div className="w-full px-4 mb-4">
        <button
          onClick={() => setShowColorSettings(!showColorSettings)}
          className="w-full p-2 rounded-lg mb-2 hover:bg-opacity-30 transition-all"
          style={{ 
            backgroundColor: contactInfo.bgColor === 'transparent' 
              ? 'transparent' 
              : hexToRgba(contactInfo.bgColor || '#60A5FA', contactInfo.bgOpacity || 0.2),
            color: contactInfo.textColor 
          }}
        >
          버튼 스타일 설정 {showColorSettings ? '닫기' : '열기'}
        </button>

        {showColorSettings && (
          <div className="flex flex-col gap-4 bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-700">
            {/* 1. 배경색 설정 */}
            <div className="flex flex-col gap-2 bg-gray-700/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">배경색</span>
                <div className="flex flex-wrap gap-1 max-w-[calc(100%-6rem)]">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorSelect('bgColor', color)}
                      className={cn(
                        "w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110",
                        contactInfo.bgColor === color && "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">투명도</span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={contactInfo.bgOpacity ?? 0.2}
                  onChange={(e) => handleBgOpacityChange(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-100 w-12 text-right">
                  {(contactInfo.bgOpacity ?? 0.2).toFixed(1)}
                </span>
              </div>
            </div>

            {/* 2. 텍스트 색상 설정 */}
            <div className="flex items-center gap-2 bg-gray-700/50 p-3 rounded-lg">
              <span className="text-sm font-medium text-gray-100 w-24">텍스트</span>
              <div className="flex flex-wrap gap-1 max-w-[calc(100%-6rem)]">
                {COLOR_PALETTE_NO_TRANSPARENT.map((color) => (
                  <button
                    key={`text-${color}`}
                    onClick={() => handleColorSelect('textColor', color)}
                    className={cn(
                      "w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110",
                      contactInfo.textColor === color && "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* 3. 그림자 색상 설정 */}
            <div className="flex flex-col gap-2 bg-gray-700/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">그림자</span>
                <div className="flex flex-wrap gap-1 max-w-[calc(100%-6rem)]">
                  {COLOR_PALETTE_NO_TRANSPARENT.map((color) => (
                    <button
                      key={`shadow-${color}`}
                      onClick={() => handleColorSelect('shadowColor', color)}
                      className={cn(
                        "w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110",
                        contactInfo.shadowColor === color && "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">투명도</span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={contactInfo.shadowOpacity ?? 0.2}
                  onChange={(e) => handleShadowOpacityChange(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-100 w-12 text-right">
                  {(contactInfo.shadowOpacity ?? 0.2).toFixed(1)}
                </span>
              </div>
            </div>

            {/* 4. 모서리와 그림자 스타일 설정 */}
            <div className="flex flex-col gap-2 bg-gray-700/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">모서리</span>
                <select
                  value={contactInfo.rounded || 'md'}
                  onChange={(e) => handleColorSelect('rounded', e.target.value)}
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
                <span className="text-sm font-medium text-gray-100 w-24">효과</span>
                <select
                  value={contactInfo.shadow || 'none'}
                  onChange={(e) => handleColorSelect('shadow', e.target.value)}
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
    );
  };

  const renderButtons = () => {
    const buttons: ButtonConfig[] = [
      // 좋아요와 조회수 제거
      { field: 'phone', icon: BsPhone, label: '전화번호', color: 'text-blue-500/90' },
      { field: 'location', icon: IoLocationSharp, label: '위치', color: 'text-red-500/90' },
      { field: 'instagram', icon: FaInstagram, label: '인스타', color: 'text-pink-500/90' },
      { field: 'facebook', icon: FaFacebook, label: '페이스북', color: 'text-blue-600/90' },
      { field: 'youtube', icon: FaYoutube, label: '유튜브', color: 'text-red-600/90' },
      { field: 'kakao', icon: RiKakaoTalkFill, label: '카카오톡', color: 'text-yellow-400/90' },
      { 
        field: 'naver', 
        icon: () => (
          <Image 
            src="/Image/sns/naver.png" 
            alt="네이버" 
            width={30} 
            height={30} 
            className="opacity-90"
          />
        ), 
        label: '네이버', 
        color: 'text-green-500/90' 
      },
      { field: 'website', icon: BsGlobe2, label: '웹사이트', color: 'text-blue-400/90' },
      { field: 'shop', icon: FaShoppingBag, label: '쇼핑몰', color: 'text-purple-500/90' },
      { field: 'blog', icon: FaBlogger, label: '블로그', color: 'text-orange-500/90' },
    ];

    // 에디터 모드가 아닐 때는 링크가 있는 버튼만 표시
    const filteredButtons = isEditable 
      ? buttons 
      : buttons.filter(button => {
          // 좋아요와 조회수 조건 제거
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
              <div key={button.field} className={cn(
                "px-1",
                getButtonSpacing(contactInfo.shadow)
              )}>
                {renderButton(button)}
              </div>
            ))}
          </Slider>
        </div>
      </div>
    );
  };

  const renderButton = (button: ButtonConfig) => {
    // hex to rgba 변환 함수
    const hexToRgba = (hex: string, opacity: number) => {
      if (hex === 'transparent') return 'transparent';
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };

    // 배경색 처리 - 투명색일 경우 opacity 무시
    const bgColor = contactInfo.bgColor === 'transparent'
      ? 'transparent'
      : hexToRgba(contactInfo.bgColor || '#60A5FA', contactInfo.bgOpacity || 0.2);

    return (
      <button
        key={button.field}
        onClick={() => button.onClick ? button.onClick() : handleButtonClick(button.field as keyof ContactInfo)}
        className={cn(
          "w-full h-[70px] flex flex-col items-center justify-center gap-1 p-2 transition-all",
          isEditable ? 'cursor-pointer' : contactInfo[button.field as keyof ContactInfo] ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
          contactInfo.rounded === 'none' && 'rounded-none',
          contactInfo.rounded === 'sm' && 'rounded',
          contactInfo.rounded === 'md' && 'rounded-lg',
          contactInfo.rounded === 'lg' && 'rounded-xl',
          contactInfo.rounded === 'full' && 'rounded-full',
        )}
        style={{
          backgroundColor: button.isActive ? hexToRgba(contactInfo.bgColor || '#60A5FA', (contactInfo.bgOpacity || 0.2) * 1.5) : bgColor,
          color: contactInfo.textColor || '#FFFFFF',
          boxShadow: getShadowStyle(),
          borderColor: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(contactInfo.shadow || '') ? contactInfo.shadowColor || '#000000' : undefined,
          borderWidth: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(contactInfo.shadow || '') ? '2px' : undefined,
          borderStyle: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(contactInfo.shadow || '') ? 'solid' : undefined,
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