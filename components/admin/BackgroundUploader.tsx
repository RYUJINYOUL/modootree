'use client';

import { useState } from 'react';
import { storage, db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

type VideoSource = 'youtube' | 'pixabay' | null;

export default function BackgroundUploader() {
  const [type, setType] = useState<'image' | 'video'>('image');
  const [videoSource, setVideoSource] = useState<VideoSource>(null);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const validateVideoUrl = (url: string, source: VideoSource) => {
    if (source === 'youtube') {
      return url.includes('youtube.com/') || url.includes('youtu.be/');
    } else if (source === 'pixabay') {
      return url.includes('pixabay.com/');
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalUrl = url;
      
      if (type === 'image' && file) {
        const storageRef = ref(storage, `backgrounds/${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        finalUrl = await getDownloadURL(snapshot.ref);
      }

      if (type === 'video' && !validateVideoUrl(url, videoSource)) {
        alert('올바른 URL을 입력해주세요.');
        setLoading(false);
        return;
      }

      await addDoc(collection(db, 'backgrounds'), {
        type: type === 'video' ? videoSource : 'image',
        url: finalUrl,
        title,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setFile(null);
      setUrl('');
      setTitle('');
      alert('배경이 성공적으로 등록되었습니다.');
    } catch (error) {
      console.error('Error uploading background:', error);
      alert('배경 등록 중 오류가 발생했습니다.');
    }

    setLoading(false);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">새 배경 추가</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-2">배경 유형</label>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as 'image' | 'video');
              setVideoSource(null);
            }}
            className="w-full p-2 border rounded"
          >
            <option value="image">이미지</option>
            <option value="video">영상</option>
          </select>
        </div>

        {type === 'video' && (
          <div>
            <label className="block mb-2">영상 소스</label>
            <select
              value={videoSource || ''}
              onChange={(e) => setVideoSource(e.target.value as VideoSource)}
              className="w-full p-2 border rounded"
            >
              <option value="">선택해주세요</option>
              <option value="youtube">유튜브</option>
              <option value="pixabay">픽사베이</option>
            </select>
          </div>
        )}

        <div>
          <label className="block mb-2">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        {type === 'image' ? (
          <div>
            <label className="block mb-2">이미지 파일</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
        ) : (
          <div>
            <label className="block mb-2">영상 URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder={videoSource === 'youtube' ? 'YouTube URL을 입력하세요' : 'Pixabay URL을 입력하세요'}
              required
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? '처리중...' : '등록하기'}
        </button>
      </form>
    </div>
  );
} 