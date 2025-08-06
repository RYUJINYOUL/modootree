import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Edit2, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { useDebounce } from '../../hooks/useDebounce';
import CategoryForm from './CategoryForm';

const CategoryManager = ({ 
  isOpen, 
  onOpenChange, 
  categories, 
  onAddCategory, 
  onUpdateCategory, 
  onDeleteCategory 
}) => {
  const [localNewCategory, setLocalNewCategory] = useState({ id: '', name: '' });
  const [localEditingCategory, setLocalEditingCategory] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);

  const debouncedNewCategory = useDebounce(localNewCategory, 300);
  const debouncedEditingCategory = useDebounce(localEditingCategory, 300);

  const handleCategorySubmit = (category) => {
    if (!category.id.trim() || !category.name.trim()) {
      alert('카테고리 ID와 이름을 모두 입력해주세요.');
      return;
    }

    if (categories.some(cat => cat.id === category.id)) {
      alert('이미 존재하는 카테고리 ID입니다.');
      return;
    }

    onAddCategory(category);
    setLocalNewCategory({ id: '', name: '' });
  };

  const handleUpdateCategory = (category) => {
    if (!category.id.trim() || !category.name.trim()) {
      alert('카테고리 ID와 이름을 모두 입력해주세요.');
      return;
    }

    onUpdateCategory(category);
    setEditingCategory(null);
    setLocalEditingCategory(null);
  };

  const handleButtonClick = (e, action) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    action();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>카테고리 관리</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* 새 카테고리 추가 */}
          <CategoryForm
            category={localNewCategory}
            onChange={setLocalNewCategory}
            onSubmit={handleCategorySubmit}
          />

          {/* 카테고리 목록 */}
          <div className="space-y-2">
            {categories.map(category => (
              <div key={category.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                {editingCategory?.id === category.id ? (
                  <CategoryForm
                    category={localEditingCategory}
                    onChange={setLocalEditingCategory}
                    onSubmit={() => handleUpdateCategory(debouncedEditingCategory)}
                    onCancel={() => {
                      setEditingCategory(null);
                      setLocalEditingCategory(null);
                    }}
                    showIdField={false}
                    submitLabel="저장"
                    showCancelButton={true}
                  />
                ) : (
                  <>
                    <span className="flex-1">
                      {category.name}
                      <span className="text-sm text-gray-500 ml-2">({category.id})</span>
                    </span>
                    {category.id !== 'all' && (
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleButtonClick(e, () => {
                            setEditingCategory(category);
                            setLocalEditingCategory(category);
                          })}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleButtonClick(e, () => onDeleteCategory(category.id))}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryManager; 