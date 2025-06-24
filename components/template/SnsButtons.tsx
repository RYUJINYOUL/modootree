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

  return (
    <div className="w-full max-w-[1100px] mx-auto p-4">
      <div className="flex flex-wrap gap-4 md:gap-6 justify-start items-start">
        {/* 조회수 버튼 */}
        <button
          className="w-14 h-14 md:w-16 md:h-16 flex flex-col items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-all duration-200 shadow-md hover:shadow-lg"
          title="조회수"
        >
          <BsEyeFill className="text-xl md:text-2xl mb-1 text-white" />
          <span className="text-xs font-medium text-white">{(contactInfo?.views || 0).toLocaleString()}</span>
        </button>

        {/* 좋아요 버튼 */}
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

        {/* 전화번호 버튼 */}
        <button
          onClick={() => handleButtonClick('phone')}
          className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110"
          title={isEditable ? "전화번호 수정" : contactInfo.phone || "전화번호"}
        >
          <BsPhone className="text-2xl md:text-3xl" />
        </button>

        <button
          onClick={() => handleButtonClick('location')}
          className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110"
          title={isEditable ? "위치 정보 수정" : "오시는 길"}
        >
          <IoLocationSharp className="text-2xl md:text-3xl" />
        </button>

        {/* SNS 버튼 */}
        {contactInfo.instagram && (
          <button
            onClick={() => handleButtonClick('instagram')}
            className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110"
            title={isEditable ? "Instagram 링크 수정" : "인스타그램"}
          >
            <FaInstagram className="text-2xl md:text-3xl" />
          </button>
        )}

        {contactInfo.kakao && (
          <button
            onClick={() => handleButtonClick('kakao')}
            className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center bg-yellow-400 hover:bg-yellow-500 text-black rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110"
            title={isEditable ? "Kakao 링크 수정" : "카카오"}
          >
            <RiKakaoTalkFill className="text-2xl md:text-3xl" />
          </button>
        )}

        {contactInfo.naver && (
          <button
            onClick={() => handleButtonClick('naver')}
            className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center bg-green-600 hover:bg-green-700 text-white rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110"
            title={isEditable ? "Naver 링크 수정" : "네이버"}
          >
            <SiNaver className="text-2xl md:text-3xl" />
          </button>
        )}

        {contactInfo.facebook && (
          <button
            onClick={() => handleButtonClick('facebook')}
            className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110"
            title={isEditable ? "Facebook 링크 수정" : "페이스북"}
          >
            <FaFacebook className="text-2xl md:text-3xl" />
          </button>
        )}

        {contactInfo.youtube && (
          <button
            onClick={() => handleButtonClick('youtube')}
            className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110"
            title={isEditable ? "YouTube 링크 수정" : "유튜브"}
          >
            <FaYoutube className="text-2xl md:text-3xl" />
          </button>
        )}

        {contactInfo.website && (
          <button
            onClick={() => handleButtonClick('website')}
            className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center bg-sky-500 hover:bg-sky-600 text-white rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110"
            title={isEditable ? "링크 수정" : "링크"}
          >
            <FaLink className="text-2xl md:text-3xl" />
          </button>
        )}

        {contactInfo.shop && (
          <button
            onClick={() => handleButtonClick('shop')}
            className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110"
            title={isEditable ? "링크 수정" : "링크"}
          >
            <FaLink className="text-2xl md:text-3xl" />
          </button>
        )}

        {contactInfo.blog && (
          <button
            onClick={() => handleButtonClick('blog')}
            className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110"
            title={isEditable ? "링크 수정" : "링크"}
          >
            <FaLink className="text-2xl md:text-3xl" />
          </button>
        )}

        {isEditable && (
          <>
            {!contactInfo.instagram && (
              <button
                onClick={() => handleEdit('instagram')}
                className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full transition-all duration-200 hover:scale-110"
                title="Instagram 링크 추가"
              >
                <FaInstagram className="text-2xl md:text-3xl" />
              </button>
            )}
            {!contactInfo.kakao && (
              <button
                onClick={() => handleEdit('kakao')}
                className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full transition-all duration-200 hover:scale-110"
                title="Kakao 링크 추가"
              >
                <RiKakaoTalkFill className="text-2xl md:text-3xl" />
              </button>
            )}
            {!contactInfo.naver && (
              <button
                onClick={() => handleEdit('naver')}
                className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full transition-all duration-200 hover:scale-110"
                title="Naver 링크 추가"
              >
                <SiNaver className="text-2xl md:text-3xl" />
              </button>
            )}
            {!contactInfo.facebook && (
              <button
                onClick={() => handleEdit('facebook')}
                className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full transition-all duration-200 hover:scale-110"
                title="Facebook 링크 추가"
              >
                <FaFacebook className="text-2xl md:text-3xl" />
              </button>
            )}
            {!contactInfo.youtube && (
              <button
                onClick={() => handleEdit('youtube')}
                className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full transition-all duration-200 hover:scale-110"
                title="YouTube 링크 추가"
              >
                <FaYoutube className="text-2xl md:text-3xl" />
              </button>
            )}
            {!contactInfo.website && (
              <button
                onClick={() => handleEdit('website')}
                className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full transition-all duration-200 hover:scale-110"
                title="링크 추가"
              >
                <FaLink className="text-2xl md:text-3xl" />
              </button>
            )}
            {!contactInfo.shop && (
              <button
                onClick={() => handleEdit('shop')}
                className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full transition-all duration-200 hover:scale-110"
                title="링크 추가"
              >
                <FaLink className="text-2xl md:text-3xl" />
              </button>
            )}
            {!contactInfo.blog && (
              <button
                onClick={() => handleEdit('blog')}
                className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full transition-all duration-200 hover:scale-110"
                title="링크 추가"
              >
                <FaLink className="text-2xl md:text-3xl" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
} 