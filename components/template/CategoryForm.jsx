import React from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { PlusCircle } from 'lucide-react';

const CategoryForm = ({
  category,
  onChange,
  onSubmit,
  onCancel,
  showIdField = true,
  submitLabel = '추가',
  showCancelButton = false
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSubmit(category);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      {showIdField && (
        <Input
          type="text"
          placeholder="카테고리 ID (영문/숫자)"
          value={category.id}
          onChange={(e) => onChange({ ...category, id: e.target.value.toLowerCase() })}
          className="flex-1"
          disabled={!showIdField}
        />
      )}
      <Input
        type="text"
        placeholder="카테고리 이름"
        value={category.name}
        onChange={(e) => onChange({ ...category, name: e.target.value })}
        className="flex-1"
      />
      <Button type="submit">
        {submitLabel === '추가' && <PlusCircle className="w-4 h-4 mr-1" />}
        {submitLabel}
      </Button>
      {showCancelButton && (
        <Button type="button" variant="ghost" onClick={onCancel}>
          취소
        </Button>
      )}
    </form>
  );
};

export default CategoryForm; 