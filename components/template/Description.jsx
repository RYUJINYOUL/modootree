'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useSelector } from 'react-redux';
import { Edit2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLOR_PALETTE = [
  'transparent',
  '#000000', '#FFFFFF', '#F87171', '#FBBF24',
  '#34D399', '#60A5FA', '#A78BFA', '#F472B6',
];

const COLOR_PALETTE_NO_TRANSPARENT = [
  '#000000', '#FFFFFF', '#F87171', '#FBBF24',
  '#34D399', '#60A5FA', '#A78BFA', '#F472B6',
];

export default function Description({ username, uid }) {
  const pathname = usePathname();
  const isEditable = pathname ? pathname.startsWith('/editor') : false;
  const { currentUser } = useSelector((state) => state.user);
  const finalUid = uid ?? currentUser?.uid;
  const canEdit = isEditable && (currentUser?.uid === finalUid);

  const [description, setDescription] = useState('설명을 입력하세요');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [styleSettings, setStyleSettings] = useState({
    bgColor: 'transparent',
    textColor: '#FFFFFF',
    bgOpacity: 1,
    shadow: 'none',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    rounded: 'md',
    marginTop: 0,    // 상단 여백 추가
    marginBottom: 0, // 하단 여백 추가
    fontSize: 16,    // 폰트 크기 추가 (설명은 기본값을 16px로 설정)
    width: 100      // 폭 설정 추가 (백분율)
  });

  // 설명 저장
  const handleDescriptionSave = async (newDescription) => {
    if (!finalUid || !canEdit) return;
    try {
      // Firebase 연결 상태 체크
      if (!navigator.onLine) {
        alert('인터넷 연결을 확인해주세요.');
        return;
      }

      const docRef = doc(db, 'users', finalUid, 'info', 'descriptionSettings');
      await setDoc(docRef, { description: newDescription }, { merge: true });
      setDescription(newDescription);
      setIsEditingDescription(false);
    } catch (error) {
      console.error('설명 저장 실패:', error);
      // 오프라인 에러 구분
      if (error.code === 'failed-precondition' || error.message.includes('offline')) {
        alert('인터넷 연결을 확인해주세요.');
      } else {
        alert('설명 저장에 실패했습니다. 다시 시도해주세요.');
      }
      // 에러 발생 시 편집 모드 유지
      setIsEditingDescription(true);
    }
  };

  // 설명 불러오기
  const loadDescription = async () => {
    if (!finalUid) return;
    try {
      // Firebase 연결 상태 체크
      if (!navigator.onLine) {
        console.warn('오프라인 상태: 설명을 불러올 수 없습니다.');
        return;
      }

      const docRef = doc(db, 'users', finalUid, 'info', 'descriptionSettings');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().description) {
        setDescription(docSnap.data().description);
      }
    } catch (error) {
      console.error('설명 불러오기 실패:', error);
      // 오프라인 에러는 조용히 처리
      if (!error.message.includes('offline')) {
        alert('설명을 불러오는데 실패했습니다.');
      }
    }
  };

  useEffect(() => {
    loadDescription();
  }, [finalUid]);

  // 스타일 설정 저장
  const saveStyleSettings = async (newSettings) => {
    if (!finalUid) return;
    try {
      // Firebase 연결 상태 체크
      if (!navigator.onLine) {
        alert('인터넷 연결을 확인해주세요.');
        return;
      }

      await setDoc(doc(db, 'users', finalUid, 'settings', 'description'), newSettings, { merge: true });
      setStyleSettings(newSettings);
    } catch (error) {
      console.error('스타일 설정 저장 실패:', error);
      // 오프라인 에러 구분
      if (error.code === 'failed-precondition' || error.message.includes('offline')) {
        alert('인터넷 연결을 확인해주세요.');
      } else {
        alert('스타일 설정 저장에 실패했습니다.');
      }
    }
  };

  // 스타일 설정 불러오기
  const loadStyleSettings = async () => {
    if (!finalUid) return;
    try {
      // Firebase 연결 상태 체크
      if (!navigator.onLine) {
        console.warn('오프라인 상태: 스타일 설정을 불러올 수 없습니다.');
        return;
      }

      const docRef = doc(db, 'users', finalUid, 'settings', 'description');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setStyleSettings(docSnap.data());
      }
    } catch (error) {
      console.error('스타일 설정 불러오기 실패:', error);
      // 오프라인 에러는 조용히 처리
      if (!error.message.includes('offline')) {
        alert('스타일 설정을 불러오는데 실패했습니다.');
      }
    }
  };

  useEffect(() => {
    loadStyleSettings();
  }, [finalUid]);

  // 온라인 상태 모니터링
  useEffect(() => {
    const handleOnline = () => {
      // 온라인 상태가 되면 데이터 다시 로드
      loadDescription();
      loadStyleSettings();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const renderColorSettings = () => {
    if (!pathname?.startsWith('/editor')) return null;

    return (
      <div className="w-full max-w-[1100px] mb-4 px-4 py-4">
        {showColorSettings && (
          <div className="flex flex-col gap-4 bg-gray-800/90 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-gray-700">
            {/* 1. 배경색 설정 */}
            <div className="flex flex-col gap-2 bg-gray-700/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">배경색</span>
                <div className="flex flex-wrap gap-1 max-w-[calc(100%-6rem)]">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color}
                      onClick={() => saveStyleSettings({ ...styleSettings, bgColor: color })}
                      className={cn(
                        "w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110",
                        styleSettings.bgColor === color && "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800"
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
                  value={styleSettings.bgOpacity ?? 0.2}
                  onChange={(e) => saveStyleSettings({ ...styleSettings, bgOpacity: parseFloat(e.target.value) })}
                  className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-100 w-12 text-right">
                  {(styleSettings.bgOpacity ?? 0.2).toFixed(1)}
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
                    onClick={() => saveStyleSettings({ ...styleSettings, textColor: color })}
                    className={cn(
                      "w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110",
                      styleSettings.textColor === color && "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800"
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
                      onClick={() => saveStyleSettings({ ...styleSettings, shadowColor: color })}
                      className={cn(
                        "w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110",
                        styleSettings.shadowColor === color && "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800"
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
                  value={styleSettings.shadowOpacity ?? 0.2}
                  onChange={(e) => saveStyleSettings({ ...styleSettings, shadowOpacity: parseFloat(e.target.value) })}
                  className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-100 w-12 text-right">
                  {(styleSettings.shadowOpacity ?? 0.2).toFixed(1)}
                </span>
              </div>
            </div>

            {/* 4. 모서리와 그림자 스타일 설정 */}
            <div className="flex flex-col gap-4 bg-gray-700/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">모서리</span>
                <select
                  value={styleSettings.rounded || 'md'}
                  onChange={(e) => saveStyleSettings({ ...styleSettings, rounded: e.target.value })}
                  className="px-3 py-1.5 bg-gray-800 text-gray-100 rounded-lg border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32 overflow-y-auto"
                >
                  <option value="none">각진</option>
                  <option value="sm">약간 둥근</option>
                  <option value="md">둥근</option>
                  <option value="lg">많이 둥근</option>
                  <option value="full">완전 둥근</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">그림자</span>
                <select
                  value={styleSettings.shadow || 'none'}
                  onChange={(e) => saveStyleSettings({ ...styleSettings, shadow: e.target.value })}
                  className="px-3 py-1.5 bg-gray-800 text-gray-100 rounded-lg border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32 overflow-y-auto"
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

            {/* 5. 여백 설정 */}
            <div className="flex flex-col gap-2 bg-gray-700/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
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
              <div className="flex items-center gap-2">
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
            </div>

            {/* 6. 폰트 크기 설정 */}
            <div className="flex items-center gap-2 bg-gray-700/50 p-3 rounded-lg">
              <span className="text-sm font-medium text-gray-100 w-24">폰트 크기</span>
              <input
                type="range"
                min={12}
                max={36}
                step={1}
                value={styleSettings.fontSize}
                onChange={(e) => saveStyleSettings({ ...styleSettings, fontSize: parseInt(e.target.value) })}
                className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm text-gray-100 w-12 text-right">
                {styleSettings.fontSize}px
              </span>
            </div>

            {/* 7. 폭 설정 추가 */}
            <div className="flex items-center gap-2 bg-gray-700/50 p-3 rounded-lg">
              <span className="text-sm font-medium text-gray-100 w-24">폭</span>
              <input
                type="range"
                min={30}
                max={100}
                step={5}
                value={styleSettings.width}
                onChange={(e) => saveStyleSettings({ ...styleSettings, width: parseInt(e.target.value) })}
                className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm text-gray-100 w-12 text-right">
                {styleSettings.width}%
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const getStyleObject = () => {
    const shadowColor = styleSettings.shadowColor 
      ? `rgba(${parseInt(styleSettings.shadowColor.slice(1, 3), 16)}, ${parseInt(styleSettings.shadowColor.slice(3, 5), 16)}, ${parseInt(styleSettings.shadowColor.slice(5, 7), 16)}, ${styleSettings.shadowOpacity ?? 0.2})`
      : 'rgba(0, 0, 0, 0.2)';

    // 배경색 처리 - 투명색일 경우 opacity 무시
    const bgColor = styleSettings.bgColor === 'transparent' 
      ? 'transparent' 
      : styleSettings.bgColor;

    // hex to rgba 변환 함수
    const hexToRgba = (hex, opacity) => {
      if (hex === 'transparent') return 'transparent';
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };

    // 기본 스타일 객체
    const baseStyle = {
      backgroundColor: bgColor === 'transparent' ? 'transparent' : hexToRgba(bgColor, styleSettings.bgOpacity),
      color: styleSettings.textColor
    };
    
    switch (styleSettings.shadow) {
      case 'none':
        return {
          ...baseStyle,
          boxShadow: 'none'
        };
      case 'sm':
        return {
          ...baseStyle,
          boxShadow: `0 1px 2px ${shadowColor}`
        };
      case 'md':
        return {
          ...baseStyle,
          boxShadow: `0 4px 6px ${shadowColor}`
        };
      case 'lg':
        return {
          ...baseStyle,
          boxShadow: `0 10px 15px ${shadowColor}`
        };
      case 'retro':
        return {
          ...baseStyle,
          boxShadow: `8px 8px 0px 0px ${shadowColor}`,
          borderColor: styleSettings.shadowColor || '#000000',
          borderWidth: '2px',
          borderStyle: 'solid'
        };
      case 'float':
        return {
          ...baseStyle,
          boxShadow: `0 10px 20px -5px ${shadowColor}`
        };
      case 'glow':
        return {
          ...baseStyle,
          boxShadow: `0 0 20px ${shadowColor}`
        };
      case 'inner':
        return {
          ...baseStyle,
          boxShadow: `inset 0 2px 4px ${shadowColor}`
        };
      case 'sharp':
        return {
          ...baseStyle,
          boxShadow: `-10px 10px 0px ${shadowColor}`,
          borderColor: styleSettings.shadowColor || '#000000',
          borderWidth: '2px',
          borderStyle: 'solid'
        };
      case 'soft':
        return {
          ...baseStyle,
          boxShadow: `0 5px 15px ${shadowColor}`
        };
      case 'stripe':
        return {
          ...baseStyle,
          boxShadow: `4px 4px 0 ${shadowColor}, 8px 8px 0 ${shadowColor}, 12px 12px 0 ${shadowColor}`,
          borderColor: styleSettings.shadowColor || '#000000',
          borderWidth: '2px',
          borderStyle: 'solid'
        };
      case 'cross':
        return {
          ...baseStyle,
          boxShadow: `4px 4px 0 ${shadowColor}, -4px -4px 0 ${shadowColor}, 4px -4px 0 ${shadowColor}, -4px 4px 0 ${shadowColor}`,
          borderColor: styleSettings.shadowColor || '#000000',
          borderWidth: '2px',
          borderStyle: 'solid'
        };
      case 'diagonal':
        return {
          ...baseStyle,
          boxShadow: `4px 4px 0 ${shadowColor}, 8px 8px 0 ${shadowColor}, 12px 12px 0 ${shadowColor}, -4px -4px 0 ${shadowColor}, -8px -8px 0 ${shadowColor}, -12px -12px 0 ${shadowColor}`,
          borderColor: styleSettings.shadowColor || '#000000',
          borderWidth: '2px',
          borderStyle: 'solid'
        };
      default:
        return {
          ...baseStyle,
          boxShadow: 'none'
        };
    }
  };

  return (
    <div className='flex flex-col items-center justify-center w-full'>
      <div className="w-full max-w-[1100px] px-4">
        {showColorSettings && (
          <div className="flex flex-col gap-4 bg-gray-800/90 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-gray-700">
            {/* 1. 배경색 설정 */}
            <div className="flex flex-col gap-2 bg-gray-700/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">배경색</span>
                <div className="flex flex-wrap gap-1 max-w-[calc(100%-6rem)]">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color}
                      onClick={() => saveStyleSettings({ ...styleSettings, bgColor: color })}
                      className={cn(
                        "w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110",
                        styleSettings.bgColor === color && "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800"
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
                  value={styleSettings.bgOpacity ?? 0.2}
                  onChange={(e) => saveStyleSettings({ ...styleSettings, bgOpacity: parseFloat(e.target.value) })}
                  className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-100 w-12 text-right">
                  {(styleSettings.bgOpacity ?? 0.2).toFixed(1)}
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
                    onClick={() => saveStyleSettings({ ...styleSettings, textColor: color })}
                    className={cn(
                      "w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110",
                      styleSettings.textColor === color && "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800"
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
                      onClick={() => saveStyleSettings({ ...styleSettings, shadowColor: color })}
                      className={cn(
                        "w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110",
                        styleSettings.shadowColor === color && "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800"
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
                  value={styleSettings.shadowOpacity ?? 0.2}
                  onChange={(e) => saveStyleSettings({ ...styleSettings, shadowOpacity: parseFloat(e.target.value) })}
                  className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-100 w-12 text-right">
                  {(styleSettings.shadowOpacity ?? 0.2).toFixed(1)}
                </span>
              </div>
            </div>

            {/* 4. 모서리와 그림자 스타일 설정 */}
            <div className="flex flex-col gap-4 bg-gray-700/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">모서리</span>
                <select
                  value={styleSettings.rounded || 'md'}
                  onChange={(e) => saveStyleSettings({ ...styleSettings, rounded: e.target.value })}
                  className="px-3 py-1.5 bg-gray-800 text-gray-100 rounded-lg border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32 overflow-y-auto"
                >
                  <option value="none">각진</option>
                  <option value="sm">약간 둥근</option>
                  <option value="md">둥근</option>
                  <option value="lg">많이 둥근</option>
                  <option value="full">완전 둥근</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">그림자</span>
                <select
                  value={styleSettings.shadow || 'none'}
                  onChange={(e) => saveStyleSettings({ ...styleSettings, shadow: e.target.value })}
                  className="px-3 py-1.5 bg-gray-800 text-gray-100 rounded-lg border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32 overflow-y-auto"
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

            {/* 5. 여백 설정 */}
            <div className="flex flex-col gap-2 bg-gray-700/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
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
              <div className="flex items-center gap-2">
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
            </div>

            {/* 6. 폰트 크기 설정 */}
            <div className="flex items-center gap-2 bg-gray-700/50 p-3 rounded-lg">
              <span className="text-sm font-medium text-gray-100 w-24">폰트 크기</span>
              <input
                type="range"
                min={12}
                max={36}
                step={1}
                value={styleSettings.fontSize}
                onChange={(e) => saveStyleSettings({ ...styleSettings, fontSize: parseInt(e.target.value) })}
                className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm text-gray-100 w-12 text-right">
                {styleSettings.fontSize}px
              </span>
            </div>

            {/* 7. 폭 설정 추가 */}
            <div className="flex items-center gap-2 bg-gray-700/50 p-3 rounded-lg">
              <span className="text-sm font-medium text-gray-100 w-24">폭</span>
              <input
                type="range"
                min={30}
                max={100}
                step={5}
                value={styleSettings.width}
                onChange={(e) => saveStyleSettings({ ...styleSettings, width: parseInt(e.target.value) })}
                className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm text-gray-100 w-12 text-right">
                {styleSettings.width}%
              </span>
            </div>
          </div>
        )}
      </div>
      <div 
        className={cn(
          "relative flex items-center justify-center font-bold w-full rounded-2xl p-4 backdrop-blur-sm tracking-tight group",
          styleSettings.rounded === 'none' && 'rounded-none',
          styleSettings.rounded === 'sm' && 'rounded',
          styleSettings.rounded === 'md' && 'rounded-lg',
          styleSettings.rounded === 'lg' && 'rounded-xl',
          styleSettings.rounded === 'full' && 'rounded-full'
        )}
        style={{
          ...getStyleObject(),
          marginTop: `${styleSettings.marginTop}rem`,
          marginBottom: `${styleSettings.marginBottom}rem`,
          fontSize: `${styleSettings.fontSize}px`,
          maxWidth: `${styleSettings.width}%`
        }}
      >
        <div className="relative w-full flex flex-col items-center">
          {isEditingDescription ? (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => handleDescriptionSave(description)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.shiftKey) {
                  e.preventDefault();
                  handleDescriptionSave(description);
                }
              }}
              className="w-full bg-transparent border-b border-white/30 focus:border-white/60 outline-none text-center px-2 py-1 resize-none"
              style={{ color: styleSettings.textColor, fontSize: `${styleSettings.fontSize}px` }}
              rows={3}
              autoFocus
            />
          ) : (
            <div className="w-full flex items-center justify-center">
              <div className="flex-1" />
              <span className="text-center whitespace-pre-wrap">{description}</span>
              <div className="flex-1 flex justify-end">
                {canEdit && (
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => setIsEditingDescription(true)}
                      className="p-1 rounded-lg hover:bg-white/10 transition-colors md:opacity-0 md:group-hover:opacity-100"
                    >
                      <Edit2 className="w-4 h-4" style={{ color: styleSettings.textColor }} />
                    </button>
                    <button
                      onClick={() => setShowColorSettings(!showColorSettings)}
                      className="p-1 rounded-lg hover:bg-white/10 transition-colors md:opacity-0 md:group-hover:opacity-100"
                    >
                      <Settings className="w-4 h-4" style={{ color: styleSettings.textColor }} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 