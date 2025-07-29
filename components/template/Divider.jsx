'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useSelector } from 'react-redux';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLOR_PALETTE = [
  'transparent',
  '#000000', '#FFFFFF', '#F87171', '#FBBF24',
  '#34D399', '#60A5FA', '#A78BFA', '#F472B6',
];

const DIVIDER_STYLES = {
  solid: "border-t border-solid",
  dashed: "border-t border-dashed",
  dotted: "border-t border-dotted",
  double: "border-t-2 border-double",
  gradient: "h-px bg-gradient-to-r",
  shadow: "h-px shadow-divider",
  pattern: "h-px bg-pattern",
  wave: "h-px bg-wave",
  icon: "h-px flex items-center justify-center",
  zigzag: "h-px bg-zigzag"
};

export default function Divider({ username, uid }) {
  const pathname = usePathname();
  const isEditable = pathname ? pathname.startsWith('/editor') : false;
  const { currentUser } = useSelector((state) => state.user);
  const finalUid = uid ?? currentUser?.uid;
  const canEdit = isEditable && (currentUser?.uid === finalUid);

  const [showSettings, setShowSettings] = useState(false);
  const [styleSettings, setStyleSettings] = useState({
    color: '#FFFFFF',
    opacity: 1,
    width: 100, // percentage
    thickness: 1, // pixels
    style: 'solid',
    orientation: 'horizontal',
    marginTop: 0,    // 상단 여백 초기값 0
    marginBottom: 0  // 하단 여백 초기값 0.6rem (약 10px)
  });

  // 스타일 설정 저장
  const saveStyleSettings = async (newSettings) => {
    if (!finalUid) return;
    try {
      if (!navigator.onLine) {
        alert('인터넷 연결을 확인해주세요.');
        return;
      }

      await setDoc(doc(db, 'users', finalUid, 'settings', 'divider'), newSettings, { merge: true });
      setStyleSettings(newSettings);
    } catch (error) {
      console.error('스타일 설정 저장 실패:', error);
      if (error.code === 'failed-precondition' || error.message.includes('offline')) {
        alert('인터넷 연결을 확인해주세요.');
      } else {
        alert('스타일 설정 저장에 실패했습니다.');
      }
    }
  };

  // 스타일 설정 불러오기
  useEffect(() => {
    const loadStyleSettings = async () => {
      if (!finalUid) return;
      try {
        if (!navigator.onLine) {
          console.warn('오프라인 상태: 스타일 설정을 불러올 수 없습니다.');
          return;
        }

        const docRef = doc(db, 'users', finalUid, 'settings', 'divider');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setStyleSettings(docSnap.data());
        }
      } catch (error) {
        console.error('스타일 설정 불러오기 실패:', error);
        if (!error.message.includes('offline')) {
          alert('스타일 설정을 불러오는데 실패했습니다.');
        }
      }
    };
    loadStyleSettings();
  }, [finalUid]);

  const renderSettings = () => {
    if (!pathname?.startsWith('/editor')) return null;

    return (
      <div className="w-full max-w-[1100px] mb-4">

        {showSettings && (
          <div className="flex flex-col gap-4 bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-700">
            {/* 1. 색상 설정 */}
            <div className="flex items-center gap-2 bg-gray-700/50 p-3 rounded-lg">
              <span className="text-sm font-medium text-gray-100 w-24">색상</span>
              <div className="flex flex-wrap gap-1 max-w-[calc(100%-6rem)]">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    onClick={() => saveStyleSettings({ ...styleSettings, color })}
                    className={cn(
                      "w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110",
                      styleSettings.color === color && "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* 2. 투명도 설정 */}
            <div className="flex items-center gap-2 bg-gray-700/50 p-3 rounded-lg">
              <span className="text-sm font-medium text-gray-100 w-24">투명도</span>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.1}
                value={styleSettings.opacity}
                onChange={(e) => saveStyleSettings({ ...styleSettings, opacity: parseFloat(e.target.value) })}
                className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm text-gray-100 w-12 text-right">
                {styleSettings.opacity.toFixed(1)}
              </span>
            </div>

            {/* 3. 너비 설정 */}
            <div className="flex items-center gap-2 bg-gray-700/50 p-3 rounded-lg">
              <span className="text-sm font-medium text-gray-100 w-24">너비</span>
              <input
                type="range"
                min={10}
                max={100}
                step={10}
                value={styleSettings.width}
                onChange={(e) => saveStyleSettings({ ...styleSettings, width: parseInt(e.target.value) })}
                className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm text-gray-100 w-12 text-right">
                {styleSettings.width}%
              </span>
            </div>

            {/* 4. 두께 설정 */}
            <div className="flex items-center gap-2 bg-gray-700/50 p-3 rounded-lg">
              <span className="text-sm font-medium text-gray-100 w-24">두께</span>
              <input
                type="range"
                min={1}
                max={10}
                value={styleSettings.thickness}
                onChange={(e) => saveStyleSettings({ ...styleSettings, thickness: parseInt(e.target.value) })}
                className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm text-gray-100 w-12 text-right">
                {styleSettings.thickness}px
              </span>
            </div>

            {/* 상단 여백 설정 */}
            <div className="flex items-center gap-2 bg-gray-700/50 p-3 rounded-lg">
              <span className="text-sm font-medium text-gray-100 w-24">상단 여백</span>
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={styleSettings.marginTop}
                onChange={(e) => saveStyleSettings({ ...styleSettings, marginTop: parseFloat(e.target.value) })}
                className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm text-gray-100 w-12 text-right">
                {styleSettings.marginTop}rem
              </span>
            </div>

            {/* 하단 여백 설정 */}
            <div className="flex items-center gap-2 bg-gray-700/50 p-3 rounded-lg">
              <span className="text-sm font-medium text-gray-100 w-24">하단 여백</span>
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={styleSettings.marginBottom}
                onChange={(e) => saveStyleSettings({ ...styleSettings, marginBottom: parseFloat(e.target.value) })}
                className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm text-gray-100 w-12 text-right">
                {styleSettings.marginBottom}rem
              </span>
            </div>

            {/* 6. 스타일 선택 */}
            <div className="flex items-center gap-2 bg-gray-700/50 p-3 rounded-lg">
              <span className="text-sm font-medium text-gray-100 w-24">스타일</span>
              <select
                value={styleSettings.style}
                onChange={(e) => saveStyleSettings({ ...styleSettings, style: e.target.value })}
                className="flex-1 px-3 py-1.5 bg-gray-800 text-gray-100 rounded-lg border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="solid">실선</option>
                <option value="dashed">파선</option>
                <option value="dotted">점선</option>
                <option value="double">이중선</option>
                <option value="gradient">그라데이션</option>
                <option value="shadow">그림자</option>
                <option value="pattern">패턴</option>
                <option value="wave">물결</option>
                <option value="icon">아이콘</option>
                <option value="zigzag">지그재그</option>
              </select>
            </div>

            {/* 7. 방향 선택 */}
            <div className="flex items-center gap-2 bg-gray-700/50 p-3 rounded-lg">
              <span className="text-sm font-medium text-gray-100 w-24">방향</span>
              <select
                value={styleSettings.orientation}
                onChange={(e) => saveStyleSettings({ ...styleSettings, orientation: e.target.value })}
                className="flex-1 px-3 py-1.5 bg-gray-800 text-gray-100 rounded-lg border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="horizontal">가로</option>
                <option value="vertical">세로</option>
              </select>
            </div>
          </div>
        )}
      </div>
    );
  };

  const getDividerStyle = () => {
    const baseStyle = {
      opacity: styleSettings.opacity,
      width: styleSettings.orientation === 'horizontal' ? `${styleSettings.width}%` : `${styleSettings.thickness}px`,
      height: styleSettings.orientation === 'vertical' ? `${styleSettings.width}%` : `${styleSettings.thickness}px`,
      marginTop: `${styleSettings.marginTop}rem`,
      marginBottom: `${styleSettings.marginBottom}rem`,
      marginLeft: 'auto',
      marginRight: 'auto'
    };

    // 투명색 처리를 위한 색상 값 설정
    const color = styleSettings.color === 'transparent' ? 'transparent' : styleSettings.color;

    switch (styleSettings.style) {
      case 'solid':
      case 'dashed':
      case 'dotted':
      case 'double':
        return {
          ...baseStyle,
          borderColor: color
        };
      case 'gradient':
        return {
          ...baseStyle,
          background: color === 'transparent' 
            ? 'transparent'
            : `linear-gradient(${styleSettings.orientation === 'horizontal' ? '90deg' : '0deg'}, transparent, ${color}, transparent)`
        };
      case 'shadow':
        return {
          ...baseStyle,
          backgroundColor: color,
          boxShadow: color === 'transparent' ? 'none' : `0 0 4px ${color}`
        };
      case 'pattern':
        return {
          ...baseStyle,
          backgroundImage: color === 'transparent' 
            ? 'none'
            : `repeating-linear-gradient(45deg, ${color}, ${color} 1px, transparent 1px, transparent 10px)`
        };
      case 'wave':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          backgroundImage: color === 'transparent'
            ? 'none'
            : `url("data:image/svg+xml,%3Csvg width='100' height='10' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 0 5 Q 25 0, 50 5 T 100 5' stroke='${encodeURIComponent(color)}' fill='none'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat-x',
          backgroundSize: '100px 10px'
        };
      case 'icon':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          '&::before, &::after': {
            content: '""',
            flex: 1,
            borderTop: `1px solid ${color}`
          }
        };
      case 'zigzag':
        return {
          ...baseStyle,
          backgroundImage: color === 'transparent'
            ? 'none'
            : `linear-gradient(45deg, transparent 33.333%, ${color} 33.333%, ${color} 66.667%, transparent 66.667%), linear-gradient(-45deg, transparent 33.333%, ${color} 33.333%, ${color} 66.667%, transparent 66.667%)`,
          backgroundSize: '10px 10px',
          backgroundColor: 'transparent'
        };
      default:
        return baseStyle;
    }
  };

  return (
    <div className='flex flex-col items-center justify-center w-full'>
      <div className="w-full max-w-[1100px] px-4">
        {renderSettings()}
        <div className="relative w-full flex flex-col items-center justify-center group">
          {canEdit && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="absolute left-1/2 -translate-x-1/2 -top-4 p-1 rounded-lg hover:bg-white/10 transition-colors md:opacity-0 md:group-hover:opacity-100"
            >
              <Settings className="w-4 h-4" style={{ color: styleSettings.color }} />
            </button>
          )}
          <div
            className={cn(
              "transition-all w-full",
              DIVIDER_STYLES[styleSettings.style],
              styleSettings.orientation === 'vertical' && "h-full inline-block"
            )}
            style={getDividerStyle()}
          />
        </div>
      </div>
    </div>
  );
} 