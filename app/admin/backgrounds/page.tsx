'use client';

import { useState } from 'react';
import BackgroundUploader from '@/components/admin/BackgroundUploader';
import BackgroundList from '@/components/admin/BackgroundList';

export default function BackgroundManagementPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">배경 관리</h1>
      <div className="space-y-8">
        <BackgroundUploader />
        <BackgroundList />
      </div>
    </div>
  );
} 