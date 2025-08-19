'use client';

import React, { useState, useEffect } from 'react';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import app from '@/firebase';
import { useSelector } from 'react-redux';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Edit2, Plus, Trash2, Settings, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Input } from '../ui/input';

const db = getFirestore(app);

// 기본 카테고리 수정
const DEFAULT_CATEGORIES = [
  { id: 'development', name: '개발' },
  { id: 'design', name: '디자인' },
  { id: 'planning', name: '기획/PM' },
  { id: 'marketing', name: '마케팅' },
  { id: 'business', name: '사업/운영' },
  { id: 'content', name: '콘텐츠' },
  { id: 'etc', name: '기타' }
];

const COLOR_PALETTE = [
  'transparent',
  '#000000', '#FFFFFF', '#F87171', '#FBBF24',
  '#34D399', '#60A5FA', '#A78BFA', '#F472B6',
];

const SkillProgress = ({ username, uid }) => {
  const pathname = usePathname();
  const isEditable = pathname ? pathname.startsWith('/editor') : false;
  const [skills, setSkills] = useState({});
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [newTag, setNewTag] = useState('');
  // styleSettings에서 progressGradient 제거
  const [styleSettings, setStyleSettings] = useState({
    bgColor: '#60A5FA',
    textColor: '#FFFFFF',
    bgOpacity: 0.2,
    shadow: 'none',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    rounded: 'md',
    progressColor: '#60A5FA'
  });

  // 카테고리 관리 state 추가
  const [isEditingCategories, setIsEditingCategories] = useState(false);
  const [newCategory, setNewCategory] = useState({ id: '', name: '' });

  const { currentUser } = useSelector((state) => state.user);
  const finalUid = uid ?? currentUser?.uid;

  // 스타일 설정 저장
  const saveStyleSettings = async (newSettings) => {
    if (!finalUid) return;
    try {
      await setDoc(doc(db, 'users', finalUid, 'settings', 'skillProgress'), newSettings, { merge: true });
      setStyleSettings(newSettings);
    } catch (error) {
      console.error('스타일 설정 저장 실패:', error);
    }
  };

  // 스킬 데이터 로드
  useEffect(() => {
    const loadSkills = async () => {
      if (!finalUid) return;
      try {
        const docRef = doc(db, 'users', finalUid, 'skills', 'data');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSkills(docSnap.data());
        }
      } catch (error) {
        console.error('스킬 데이터 로드 실패:', error);
      }
    };

    const loadStyleSettings = async () => {
      if (!finalUid) return;
      try {
        const docRef = doc(db, 'users', finalUid, 'settings', 'skillProgress');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setStyleSettings(docSnap.data());
        }
      } catch (error) {
        console.error('스타일 설정 로드 실패:', error);
      }
    };

    loadSkills();
    loadStyleSettings();
  }, [finalUid]);

  // 카테고리 저장 함수
  const saveCategories = async (updatedCategories) => {
    if (!finalUid) return;
    try {
      await setDoc(doc(db, 'users', finalUid, 'settings', 'skillCategories'), {
        categories: updatedCategories
      });
      setCategories(updatedCategories);
    } catch (error) {
      console.error('카테고리 저장 실패:', error);
    }
  };

  // 카테고리 로드
  useEffect(() => {
    const loadCategories = async () => {
      if (!finalUid) return;
      try {
        const docRef = doc(db, 'users', finalUid, 'settings', 'skillCategories');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCategories(docSnap.data().categories);
        } else {
          setCategories(DEFAULT_CATEGORIES);
        }
      } catch (error) {
        console.error('카테고리 로드 실패:', error);
        setCategories(DEFAULT_CATEGORIES);
      }
    };
    loadCategories();
  }, [finalUid]);

  // 카테고리 추가
  const handleAddCategory = async () => {
    if (!newCategory.id || !newCategory.name) {
      alert('카테고리 ID와 이름을 모두 입력해주세요.');
      return;
    }
    const updatedCategories = [...categories, newCategory];
    await saveCategories(updatedCategories);
    setNewCategory({ id: '', name: '' });
  };

  // 카테고리 삭제
  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('이 카테고리를 삭제하시겠습니까?\n해당 카테고리의 스킬들도 함께 삭제됩니다.')) return;
    
    const updatedCategories = categories.filter(cat => cat.id !== categoryId);
    await saveCategories(updatedCategories);
    
    // 해당 카테고리의 스킬들도 삭제
    const updatedSkills = { ...skills };
    delete updatedSkills[categoryId];
    await setDoc(doc(db, 'users', finalUid, 'skills', 'data'), updatedSkills);
    setSkills(updatedSkills);
  };

  // 스킬 저장
  const handleSaveSkill = async (e) => {
    e.preventDefault();
    if (!editingSkill || !editingSkill.name || !editingSkill.category) {
      alert('스킬 이름과 카테고리를 입력해주세요.');
      return;
    }

    try {
      const updatedSkills = {
        ...skills,
        [editingSkill.category]: {
          ...(skills[editingSkill.category] || {}),
          [editingSkill.name]: {
            progress: editingSkill.progress || 0,
            description: editingSkill.description || '',
            years: editingSkill.years || 0,
            tags: editingSkill.tags || [], // 해시태그 배열 추가
          },
        },
      };

      await setDoc(doc(db, 'users', finalUid, 'skills', 'data'), updatedSkills);
      setSkills(updatedSkills);
      setEditingSkill(null);
      setIsEditing(false);
    } catch (error) {
      console.error('스킬 저장 실패:', error);
      alert('스킬 저장에 실패했습니다.');
    }
  };

  // 해시태그 추가
  const handleAddTag = (e) => {
    e.preventDefault();
    if (!newTag.trim()) return;

    const tag = newTag.startsWith('#') ? newTag : `#${newTag}`;
    const currentTags = editingSkill.tags || [];
    
    if (!currentTags.includes(tag)) {
      setEditingSkill(prev => ({
        ...prev,
        tags: [...currentTags, tag]
      }));
    }
    setNewTag('');
  };

  // 해시태그 삭제
  const handleRemoveTag = (tagToRemove) => {
    setEditingSkill(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(tag => tag !== tagToRemove)
    }));
  };

  // 스킬 삭제
  const handleDeleteSkill = async (category, skillName) => {
    if (!window.confirm('이 스킬을 삭제하시겠습니까?')) return;

    try {
      const categorySkills = { ...skills[category] };
      delete categorySkills[skillName];

      const updatedSkills = {
        ...skills,
        [category]: categorySkills,
      };

      await setDoc(doc(db, 'users', finalUid, 'skills', 'data'), updatedSkills);
      setSkills(updatedSkills);
    } catch (error) {
      console.error('스킬 삭제 실패:', error);
      alert('스킬 삭제에 실패했습니다.');
    }
  };

  // 스타일 객체 생성
  const getStyleObject = () => {
    const shadowColor = styleSettings.shadowColor 
      ? `rgba(${parseInt(styleSettings.shadowColor.slice(1, 3), 16)}, ${parseInt(styleSettings.shadowColor.slice(3, 5), 16)}, ${parseInt(styleSettings.shadowColor.slice(5, 7), 16)}, ${styleSettings.shadowOpacity ?? 0.2})`
      : 'rgba(0, 0, 0, 0.2)';

    const style = {
      backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
      color: styleSettings.textColor,
    };

    if (['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(styleSettings.shadow)) {
      style.borderColor = styleSettings.shadowColor || '#000000';
      style.borderWidth = '2px';
      style.borderStyle = 'solid';
    }

    switch (styleSettings.shadow) {
      case 'none': style.boxShadow = 'none'; break;
      case 'sm': style.boxShadow = `0 1px 2px ${shadowColor}`; break;
      case 'md': style.boxShadow = `0 4px 6px ${shadowColor}`; break;
      case 'lg': style.boxShadow = `0 10px 15px ${shadowColor}`; break;
      case 'retro': style.boxShadow = `8px 8px 0px 0px ${shadowColor}`; break;
      case 'float': style.boxShadow = `0 10px 20px -5px ${shadowColor}`; break;
      case 'glow': style.boxShadow = `0 0 20px ${shadowColor}`; break;
      case 'inner': style.boxShadow = `inset 0 2px 4px ${shadowColor}`; break;
      case 'sharp': style.boxShadow = `-10px 10px 0px ${shadowColor}`; break;
      case 'soft': style.boxShadow = `0 5px 15px ${shadowColor}`; break;
      case 'stripe': style.boxShadow = `4px 4px 0 ${shadowColor}, 8px 8px 0 ${shadowColor}, 12px 12px 0 ${shadowColor}`; break;
      case 'cross': style.boxShadow = `4px 4px 0 ${shadowColor}, -4px -4px 0 ${shadowColor}, 4px -4px 0 ${shadowColor}, -4px 4px 0 ${shadowColor}`; break;
      case 'diagonal': style.boxShadow = `4px 4px 0 ${shadowColor}, 8px 8px 0 ${shadowColor}, 12px 12px 0 ${shadowColor}, -4px -4px 0 ${shadowColor}, -8px -8px 0 ${shadowColor}, -12px -12px 0 ${shadowColor}`; break;
      default: style.boxShadow = 'none';
    }

    return style;
  };

  // 스타일 설정 UI
  const renderColorSettings = () => {
    if (!isEditable) return null;

    return (
      <div className="w-full max-w-[1100px] mb-4">
        <button
          onClick={() => setShowColorSettings(!showColorSettings)}
          className="w-full p-2 rounded-lg mb-2 hover:bg-opacity-30 transition-all"
          style={{ 
            backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
            color: styleSettings.textColor 
          }}
        >
          스킬 프로그레스 스타일 설정 {showColorSettings ? '닫기' : '열기'}
        </button>

        {showColorSettings && (
          <div className="flex flex-col gap-4 bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-700">
            {/* 배경색 설정 */}
            <div className="flex flex-col gap-2 bg-gray-700/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">배경색</span>
                <div className="flex flex-wrap gap-1">
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

            {/* 텍스트 색상 설정 추가 */}
            <div className="flex items-center gap-2 bg-gray-700/50 p-3 rounded-lg">
              <span className="text-sm font-medium text-gray-100 w-24">텍스트 색상</span>
              <div className="flex flex-wrap gap-1">
                {COLOR_PALETTE.map((color) => (
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

            {/* 프로그레스 바 색상 */}
            <div className="flex items-center gap-2 bg-gray-700/50 p-3 rounded-lg">
              <span className="text-sm font-medium text-gray-100 w-24">프로그레스 바</span>
              <div className="flex flex-wrap gap-1">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={`progress-${color}`}
                    onClick={() => saveStyleSettings({ ...styleSettings, progressColor: color })}
                    className={cn(
                      "w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110",
                      styleSettings.progressColor === color && "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* 모서리 설정 */}
            <div className="flex items-center gap-2 bg-gray-700/50 p-3 rounded-lg">
              <span className="text-sm font-medium text-gray-100 w-24">모서리</span>
              <select
                value={styleSettings.rounded || 'md'}
                onChange={(e) => saveStyleSettings({ ...styleSettings, rounded: e.target.value })}
                className="px-3 py-1.5 bg-gray-800 text-gray-100 rounded-lg border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">각진</option>
                <option value="sm">약간 둥근</option>
                <option value="md">둥근</option>
                <option value="lg">많이 둥근</option>
                <option value="full">완전 둥근</option>
              </select>
            </div>

            {/* 그림자 설정 */}
            <div className="flex flex-col gap-2 bg-gray-700/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">그림자 종류</span>
                <select
                  value={styleSettings.shadow || 'none'}
                  onChange={(e) => saveStyleSettings({ ...styleSettings, shadow: e.target.value })}
                  className="px-3 py-1.5 bg-gray-800 text-gray-100 rounded-lg border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              {/* 그림자 색상 */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">그림자 색상</span>
                <div className="flex flex-wrap gap-1">
                  {COLOR_PALETTE.map((color) => (
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

              {/* 그림자 투명도 */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">그림자 투명도</span>
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
          </div>
        )}
      </div>
    );
  };

  return (
    <div className='pt-5 md:flex md:flex-col md:items-center md:justify-center md:w-full px-2'>
      <div className="w-full max-w-[1100px] space-y-6 mt-8">
        {renderColorSettings()}

        {/* 헤더 */}
        <div 
          className={cn(
            "relative flex items-center justify-between text-[21px] font-bold w-full p-4 backdrop-blur-sm tracking-tight",
            styleSettings.rounded === 'none' && 'rounded-none',
            styleSettings.rounded === 'sm' && 'rounded',
            styleSettings.rounded === 'md' && 'rounded-lg',
            styleSettings.rounded === 'lg' && 'rounded-xl',
            styleSettings.rounded === 'full' && 'rounded-full'
          )}
          style={getStyleObject()}
        >
          <h1 className="text-xl font-semibold">포트폴리오</h1>
          <div className="flex gap-2">
            {isEditable && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditingCategories(true)}
                >
                  <Settings className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditingSkill({
                      name: '',
                      category: '',
                      progress: 0,
                      description: '',
                      years: 0,
                    });
                    setIsEditing(true);
                  }}
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 카테고리 관리 다이얼로그 */}
        <Dialog open={isEditingCategories} onOpenChange={setIsEditingCategories}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>카테고리 관리</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* 카테고리 추가 폼 */}
              <div className="flex gap-2">
                <Input
                  placeholder="카테고리 ID (영문)"
                  value={newCategory.id}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, id: e.target.value.toLowerCase() }))}
                />
                <Input
                  placeholder="카테고리 이름"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                />
                <Button onClick={handleAddCategory}>추가</Button>
              </div>

              {/* 카테고리 목록 */}
              <div className="space-y-2">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                    <div>
                      <span className="font-medium">{category.name}</span>
                      <span className="ml-2 text-sm text-gray-500">({category.id})</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 스킬 목록 */}
        <div className="space-y-8">
          {categories.map((category) => (
            <div 
              key={category.id}
              className={cn(
                "p-4 backdrop-blur-sm",
                styleSettings.rounded === 'none' && 'rounded-none',
                styleSettings.rounded === 'sm' && 'rounded',
                styleSettings.rounded === 'md' && 'rounded-lg',
                styleSettings.rounded === 'lg' && 'rounded-xl',
                styleSettings.rounded === 'full' && 'rounded-full'
              )}
              style={getStyleObject()}
            >
              <h2 className="text-lg font-semibold mb-4" style={{ color: styleSettings.textColor }}>{category.name}</h2>
              <div className="space-y-4">
                {skills[category.id] && Object.entries(skills[category.id]).map(([skillName, skill]) => (
                  <div key={skillName} className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium" style={{ color: styleSettings.textColor }}>{skillName}</span>
                        {skill.years > 0 && (
                          <span className="text-sm" style={{ color: styleSettings.textColor, opacity: 0.7 }}>{skill.years}년</span>
                        )}
                      </div>
                      {isEditable && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingSkill({
                                name: skillName,
                                category: category.id,
                                ...skill
                              });
                              setIsEditing(true);
                            }}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                            style={{ color: styleSettings.textColor }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSkill(category.id, skillName)}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                            style={{ color: styleSettings.textColor }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="relative h-2 bg-gray-200/20 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${skill.progress}%`,
                          backgroundColor: styleSettings.progressColor
                        }}
                      />
                    </div>
                    {skill.description && (
                      <p className="mt-2 text-sm" style={{ color: styleSettings.textColor, opacity: 0.7 }}>{skill.description}</p>
                    )}
                    {skill.tags && skill.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {skill.tags.map(tag => (
                          <span 
                            key={tag} 
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ 
                              backgroundColor: `${styleSettings.progressColor}20`,
                              color: styleSettings.textColor
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 스킬 편집 다이얼로그 */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingSkill?.name ? '스킬 수정' : '스킬 추가'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveSkill} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">카테고리</label>
                <select
                  value={editingSkill?.category || ''}
                  onChange={(e) => setEditingSkill(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-2 rounded-lg border bg-transparent"
                >
                  <option value="">카테고리 선택</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">스킬 이름</label>
                <Input
                  value={editingSkill?.name || ''}
                  onChange={(e) => setEditingSkill(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="예: React"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">숙련도 ({editingSkill?.progress || 0}%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editingSkill?.progress || 0}
                  onChange={(e) => setEditingSkill(prev => ({ ...prev, progress: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">경험 연도</label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={editingSkill?.years || 0}
                  onChange={(e) => setEditingSkill(prev => ({ ...prev, years: parseFloat(e.target.value) }))}
                  placeholder="예: 2.5"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">설명 (선택사항)</label>
                <Input
                  value={editingSkill?.description || ''}
                  onChange={(e) => setEditingSkill(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="스킬에 대한 간단한 설명"
                />
              </div>
              
              {/* 해시태그 입력 섹션 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">해시태그</label>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="#태그입력"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddTag(e);
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddTag}>추가</Button>
                </div>

                {/* 태그 목록 */}
                {editingSkill?.tags && editingSkill.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {editingSkill.tags.map(tag => (
                      <span 
                        key={tag} 
                        className="flex items-center gap-1 text-sm bg-blue-500/20 text-blue-700 px-2 py-0.5 rounded-full"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  취소
                </Button>
                <Button type="submit">저장</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SkillProgress; 