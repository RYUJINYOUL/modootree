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
  likedBy: []
};

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
  const pathname = usePathname();
  const isEditable = pathname.startsWith('/editor');
  const { currentUser } = useSelector((state: any) => state.user);
  const finalUid = uid ?? currentUser?.uid;
  const [hasLiked, setHasLiked] = useState(false);
  const { showToast } = useToast();

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
          likes: increment(-1),
          likedBy: currentLikedBy.filter(id => id !== userId)
        });
        setContactInfo(prev => ({
          ...prev,
          likes: Math.max(0, (prev.likes || 0) - 1),
          likedBy: currentLikedBy.filter(id => id !== userId)
        }));
        setHasLiked(false);
      } else {
        // 좋아요 추가
        await updateDoc(docRef, {
          likes: increment(1),
          likedBy: [...currentLikedBy, userId]
        });
        setContactInfo(prev => ({
          ...prev,
          likes: (prev.likes || 0) + 1,
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
    if (!url || typeof url !== 'string') return;

    switch (field) {
      case 'phone':
        window.location.href = `tel:${url}`;
        break;
      case 'location':
      case 'instagram':
      case 'facebook':
      case 'youtube':
      case 'website':
      case 'shop':
      case 'blog':
      case 'kakao':
      case 'naver':
        window.open(url, '_blank');
        break;
    }
  };

  const renderButtons = () => {
    const buttons = [
      ...((!isEditable) ? [
        { field: 'views', icon: BsEyeFill, label: '조회수', color: 'bg-blue-500 hover:bg-blue-600', count: contactInfo.views || 0 },
        { field: 'likes', icon: FaHeart, label: hasLiked ? "좋아요 취소" : "좋아요", color: 'bg-blue-500 hover:bg-blue-600', onClick: handleLike, count: contactInfo.likes || 0, isActive: hasLiked }
      ] : []),
      { field: 'phone', icon: BsPhone, label: '전화번호', color: 'bg-blue-500 hover:bg-blue-600', onClick: () => handleButtonClick('phone') },
      { field: 'location', icon: IoLocationSharp, label: '위치', color: 'bg-blue-500 hover:bg-blue-600', onClick: () => handleButtonClick('location') },
      { field: 'instagram', icon: FaInstagram, label: '인스타그램', color: 'from-purple-600 via-pink-500 to-orange-400', onClick: () => handleButtonClick('instagram') },
      { field: 'kakao', icon: RiKakaoTalkFill, label: '카카오톡', color: 'bg-yellow-400 hover:bg-yellow-500 text-black', onClick: () => handleButtonClick('kakao') },
      { field: 'facebook', icon: FaFacebook, label: '페이스북', color: 'bg-blue-600 hover:bg-blue-700', onClick: () => handleButtonClick('facebook') },
      { field: 'youtube', icon: FaYoutube, label: '유튜브', color: 'bg-red-600 hover:bg-red-700', onClick: () => handleButtonClick('youtube') },
      { field: 'naver', icon: SiNaver, label: '네이버', color: 'bg-green-500 hover:bg-green-600', onClick: () => handleButtonClick('naver') },
      { field: 'website', icon: BsGlobe2, label: '웹사이트', color: 'bg-gray-600 hover:bg-gray-700', onClick: () => handleButtonClick('website') },
      { field: 'shop', icon: FaShoppingBag, label: '쇼핑몰', color: 'bg-pink-500 hover:bg-pink-600', onClick: () => handleButtonClick('shop') },
      { field: 'blog', icon: FaBlogger, label: '블로그', color: 'bg-orange-500 hover:bg-orange-600', onClick: () => handleButtonClick('blog') },
    ] as ButtonConfig[];

    // 모바일에서는 4개, 데스크톱에서는 모든 버튼 표시
    const mainButtons = buttons.slice(0, 4);
    const extraButtons = buttons.slice(4);

    const renderButton = (button: ButtonConfig) => (
      (button.field === 'likes' || button.field === 'views' || contactInfo[button.field as keyof ContactInfo]) && (
        <button
          key={button.field}
          onClick={button.onClick}
          className={`w-16 h-16 md:w-[4.5rem] md:h-[4.5rem] flex flex-col items-center justify-center ${
            button.color.includes('from') ? `bg-gradient-to-br ${button.color}` : button.color
          } rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110 mx-1 my-1`}
          title={button.label}
        >
          <button.icon className={`text-2xl md:text-3xl ${button.count !== undefined ? 'mb-1' : ''} ${button.isActive ? 'text-red-400' : ''}`} />
          {button.count !== undefined && (
            <span className="text-sm font-medium">{button.count}</span>
          )}
        </button>
      )
    );

    return (
      <div className="w-full mt-4">
        {/* 모바일 뷰 */}
        <div className="w-full md:hidden">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {mainButtons.map(renderButton)}
            {extraButtons.some(({ field }) => contactInfo[field as keyof ContactInfo]) && (
              <button
                onClick={() => setShowAllButtons(!showAllButtons)}
                className="w-16 h-16 flex-shrink-0 flex items-center justify-center bg-white hover:bg-gray-100 text-gray-600 rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110 mx-1 border border-gray-200"
                title="더보기"
              >
                <BsThreeDots className="text-2xl" />
              </button>
            )}
          </div>
          
          {showAllButtons && (
            <div className="flex items-center gap-2 overflow-x-auto mt-2 pb-2">
              {extraButtons.map(renderButton)}
            </div>
          )}
        </div>

        {/* 데스크톱 뷰 */}
        <div className="hidden md:flex items-center gap-2 overflow-x-auto pb-2">
          {buttons.map(renderButton)}
        </div>
      </div>
    );
  };

  return renderButtons();
} 