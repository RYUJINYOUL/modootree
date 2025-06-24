'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/firebase';
import { FaInstagram, FaFacebook, FaYoutube, FaShoppingBag, FaBlogger, FaLink, FaHeart } from 'react-icons/fa';
import { BsPhone, BsGlobe2, BsEyeFill } from 'react-icons/bs';
import { IoLocationSharp } from 'react-icons/io5';
import { RiKakaoTalkFill } from 'react-icons/ri';
import { SiNaver } from 'react-icons/si';
import { useToast } from '@/components/ui/use-toast';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

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

export default function ContactButtons({ username, uid }: ContactButtonsProps) {
  const [contactInfo, setContactInfo] = useState<ContactInfo>(DEFAULT_CONTACT);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const isEditable = pathname.startsWith('/editor');
  const { currentUser } = useSelector((state: any) => state.user);
  const finalUid = uid ?? currentUser?.uid;
  const [hasLiked, setHasLiked] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      // 조회수 버튼
      <div key="views" className="px-[5px]">
        <button
          className="w-14 h-14 md:w-16 md:h-16 flex flex-col items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-all duration-200 shadow-md hover:shadow-lg"
          title="조회수"
        >
          <BsEyeFill className="text-xl md:text-2xl mb-1 text-white" />
          <span className="text-xs font-medium text-white">{(contactInfo?.views || 0).toLocaleString()}</span>
        </button>
      </div>,

      // 좋아요 버튼
      <div key="likes" className="px-[5px]">
        <button
          onClick={handleLike}
          className={`w-14 h-14 md:w-16 md:h-16 flex flex-col items-center justify-center 
            ${hasLiked 
              ? 'bg-blue-500 hover:bg-blue-600' 
              : 'bg-blue-500 hover:bg-blue-600'
            } text-white rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110`}
          title={hasLiked ? "좋아요 취소" : "좋아요"}
          disabled={isEditable}
        >
          <FaHeart className={`text-xl md:text-2xl mb-1 ${
            hasLiked ? 'text-red-400' : 'text-white'
          }`} />
          <span className="text-xs font-medium text-white">{(contactInfo?.likes || 0).toLocaleString()}</span>
        </button>
      </div>
    ];

    // 전화번호 버튼
    if (isEditable || contactInfo.phone) {
      buttons.push(
        <div key="phone" className="px-[5px]">
          <button
            onClick={() => handleButtonClick('phone')}
            className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center ${
              contactInfo.phone ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-200 hover:bg-gray-300'
            } ${contactInfo.phone ? 'text-white' : 'text-gray-600'} rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110`}
            title={isEditable ? (contactInfo.phone ? "전화번호 수정" : "전화번호 추가") : contactInfo.phone}
          >
            <BsPhone className="text-2xl md:text-3xl" />
          </button>
        </div>
      );
    }

    // 위치 버튼
    if (isEditable || contactInfo.location) {
      buttons.push(
        <div key="location" className="px-[5px]">
          <button
            onClick={() => handleButtonClick('location')}
            className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center ${
              contactInfo.location ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-200 hover:bg-gray-300'
            } ${contactInfo.location ? 'text-white' : 'text-gray-600'} rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110`}
            title={isEditable ? (contactInfo.location ? "위치 수정" : "위치 추가") : "위치 보기"}
          >
            <IoLocationSharp className="text-2xl md:text-3xl" />
          </button>
        </div>
      );
    }

    // 인스타그램 버튼
    if (isEditable || contactInfo.instagram) {
      buttons.push(
        <div key="instagram" className="px-[5px]">
          <button
            onClick={() => handleButtonClick('instagram')}
            className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center ${
              contactInfo.instagram ? 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400' : 'bg-gray-200 hover:bg-gray-300'
            } ${contactInfo.instagram ? 'text-white' : 'text-gray-600'} rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110`}
            title={isEditable ? (contactInfo.instagram ? "인스타그램 수정" : "인스타그램 추가") : "인스타그램으로 이동"}
          >
            <FaInstagram className="text-2xl md:text-3xl" />
          </button>
        </div>
      );
    }

    // 페이스북 버튼
    if (isEditable || contactInfo.facebook) {
      buttons.push(
        <div key="facebook" className="px-[5px]">
          <button
            onClick={() => handleButtonClick('facebook')}
            className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center ${
              contactInfo.facebook ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-200 hover:bg-gray-300'
            } ${contactInfo.facebook ? 'text-white' : 'text-gray-600'} rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110`}
            title={isEditable ? (contactInfo.facebook ? "페이스북 수정" : "페이스북 추가") : "페이스북으로 이동"}
          >
            <FaFacebook className="text-2xl md:text-3xl" />
          </button>
        </div>
      );
    }

    // 유튜브 버튼
    if (isEditable || contactInfo.youtube) {
      buttons.push(
        <div key="youtube" className="px-[5px]">
          <button
            onClick={() => handleButtonClick('youtube')}
            className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center ${
              contactInfo.youtube ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-200 hover:bg-gray-300'
            } ${contactInfo.youtube ? 'text-white' : 'text-gray-600'} rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110`}
            title={isEditable ? (contactInfo.youtube ? "유튜브 수정" : "유튜브 추가") : "유튜브로 이동"}
          >
            <FaYoutube className="text-2xl md:text-3xl" />
          </button>
        </div>
      );
    }

    // 카카오톡 버튼
    if (isEditable || contactInfo.kakao) {
      buttons.push(
        <div key="kakao" className="px-[5px]">
          <button
            onClick={() => handleButtonClick('kakao')}
            className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center ${
              contactInfo.kakao ? 'bg-yellow-400 hover:bg-yellow-500' : 'bg-gray-200 hover:bg-gray-300'
            } ${contactInfo.kakao ? 'text-black' : 'text-gray-600'} rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110`}
            title={isEditable ? (contactInfo.kakao ? "카카오톡 수정" : "카카오톡 추가") : "카카오톡으로 이동"}
          >
            <RiKakaoTalkFill className="text-2xl md:text-3xl" />
          </button>
        </div>
      );
    }

    // 네이버 버튼
    if (isEditable || contactInfo.naver) {
      buttons.push(
        <div key="naver" className="px-[5px]">
          <button
            onClick={() => handleButtonClick('naver')}
            className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center ${
              contactInfo.naver ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-200 hover:bg-gray-300'
            } ${contactInfo.naver ? 'text-white' : 'text-gray-600'} rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110`}
            title={isEditable ? (contactInfo.naver ? "네이버 수정" : "네이버 추가") : "네이버로 이동"}
          >
            <SiNaver className="text-2xl md:text-3xl" />
          </button>
        </div>
      );
    }

    // 웹사이트 버튼
    if (isEditable || contactInfo.website) {
      buttons.push(
        <div key="website" className="px-[5px]">
          <button
            onClick={() => handleButtonClick('website')}
            className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center ${
              contactInfo.website ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'
            } ${contactInfo.website ? 'text-white' : 'text-gray-600'} rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110`}
            title={isEditable ? (contactInfo.website ? "웹사이트 수정" : "웹사이트 추가") : "웹사이트로 이동"}
          >
            <BsGlobe2 className="text-2xl md:text-3xl" />
          </button>
        </div>
      );
    }

    // 쇼핑몰 버튼
    if (isEditable || contactInfo.shop) {
      buttons.push(
        <div key="shop" className="px-[5px]">
          <button
            onClick={() => handleButtonClick('shop')}
            className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center ${
              contactInfo.shop ? 'bg-pink-500 hover:bg-pink-600' : 'bg-gray-200 hover:bg-gray-300'
            } ${contactInfo.shop ? 'text-white' : 'text-gray-600'} rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110`}
            title={isEditable ? (contactInfo.shop ? "쇼핑몰 수정" : "쇼핑몰 추가") : "쇼핑몰로 이동"}
          >
            <FaShoppingBag className="text-2xl md:text-3xl" />
          </button>
        </div>
      );
    }

    // 블로그 버튼
    if (isEditable || contactInfo.blog) {
      buttons.push(
        <div key="blog" className="px-[5px]">
          <button
            onClick={() => handleButtonClick('blog')}
            className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center ${
              contactInfo.blog ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-200 hover:bg-gray-300'
            } ${contactInfo.blog ? 'text-white' : 'text-gray-600'} rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110`}
            title={isEditable ? (contactInfo.blog ? "블로그 수정" : "블로그 추가") : "블로그로 이동"}
          >
            <FaBlogger className="text-2xl md:text-3xl" />
          </button>
        </div>
      );
    }

    return buttons;
  };

  return (
    <div className="w-full max-w-[1100px] mx-auto p-4">
      {isMobile ? (
        <Slider
          dots={false}
          arrows={false}
          infinite={false}
          speed={500}
          slidesToScroll={3}
          variableWidth={true}
          autoplay={true}
          autoplaySpeed={3000}
          className="sns-carousel"
        >
          {renderButtons()}
        </Slider>
      ) : (
        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
          {renderButtons()}
        </div>
      )}

      <style jsx global>{`
        .sns-carousel {
          margin: 0 -5px;
        }
        .sns-carousel .slick-track {
          display: flex;
          align-items: center;
          padding: 20px 0;
        }
        .sns-carousel .slick-slide {
          display: flex;
          justify-content: center;
        }
        .sns-carousel .slick-list {
          overflow: visible;
        }
      `}</style>
    </div>
  );
} 