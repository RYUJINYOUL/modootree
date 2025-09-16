'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { db } from '@/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, Upload } from 'lucide-react';
import Header from '@/components/Header';
import LoginOutButton from '@/components/ui/LoginOutButton';

export default function JoyPage() {
  const currentUser = useSelector((state) => state.user.currentUser) || {};
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    description: '',
    imageFile: null,
    imageUrl: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [analyzingPosts, setAnalyzingPosts] = useState({});

  // 게시물 실시간 로드
  useEffect(() => {
    const postsQuery = query(
      collection(db, 'joy'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const newPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(newPosts);
    });

    return () => unsubscribe();
  }, []);

  // AI 분석 요청 처리
  const handleAnalyze = async (post) => {
    if (analyzingPosts[post.id]) return;
    if (post.aiResponse) {
      alert('이미 분석이 완료된 사진입니다.');
      return;
    }
    
    setAnalyzingPosts(prev => ({ ...prev, [post.id]: true }));
    try {
      const response = await fetch('/api/analyze-interest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: post.imageUrl,
          description: post.description,
          postId: post.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API 오류 응답:', errorData);
        throw new Error(errorData.error || '분석 요청이 실패했습니다.');
      }

      const data = await response.json();
      console.log('분석 결과:', data);

      const aiResponse = typeof data.response === 'object' 
        ? JSON.stringify(data.response, null, 2)
        : data.response;
      
      // Firestore 업데이트
      const postRef = doc(db, 'joy', post.id);
      await setDoc(postRef, {
        aiResponse
      }, { merge: true });

      // 상태 업데이트
      setPosts(prevPosts => 
        prevPosts.map(p => 
          p.id === post.id ? { ...p, aiResponse } : p
        )
      );

      // 선택된 게시물이 현재 분석 중인 게시물이면 상태 업데이트
      if (selectedPost?.id === post.id) {
        setSelectedPost(prev => ({
          ...prev,
          aiResponse
        }));
      }

      alert('분석이 완료되었습니다!');
    } catch (error) {
      console.error('AI 분석 실패:', error);
      alert(error.message || 'AI 분석 중 오류가 발생했습니다.');
    } finally {
      setAnalyzingPosts(prev => {
        const newState = { ...prev };
        delete newState[post.id];
        return newState;
      });
    }
  };
  // ... (이전 코드와 동일)

  return (
    <>
      <LoginOutButton />
      <Header />
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-gray-900 text-white/90 relative">
        <div className="container mx-auto px-4 py-10">
          {/* 제목 수정 */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex-grow">
              <h1 className="text-2xl font-bold text-white text-center">
                재미있는 관심도 분석 🎉
              </h1>
            </div>
            <div className="flex-shrink-0 ml-4">
              {currentUser?.uid && (
                  <Button
                    onClick={() => setShowUploadForm(true)}
                    variant="default"
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    사진 업로드
                  </Button>
              )}
            </div>
          </div>

          {/* 설명 추가 */}
          <div className="text-center mb-8">
            <p className="text-gray-300">
              모임 사진을 올리면 AI가 재미있게 분석해드려요! 
              <br />
              <span className="text-sm text-gray-400">(재미로만 봐주세요 😉)</span>
            </p>
          </div>

          {/* 업로드 폼 다이얼로그 */}
          <Dialog open={showUploadForm} onOpenChange={setShowUploadForm}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>사진 업로드</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer"
                  onClick={() => document.getElementById('imageInput').click()}>
                  {uploadForm.imageUrl ? (
                    <div className="relative w-full">
                      <img
                        src={uploadForm.imageUrl}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadForm(prev => ({
                            ...prev,
                            imageFile: null,
                            imageUrl: ''
                          }));
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">클릭하여 사진 선택</p>
                    </div>
                  )}
                </div>
                <input
                  id="imageInput"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadForm(prev => ({
                        ...prev,
                        imageFile: file,
                        imageUrl: URL.createObjectURL(file)
                      }));
                    }
                  }}
                />
                <textarea
                  placeholder="사진에 대한 설명을 입력해주세요..."
                  className="w-full p-2 border rounded-lg text-black"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={async () => {
                    if (!uploadForm.imageFile || !uploadForm.description) {
                      alert('사진과 설명을 모두 입력해주세요.');
                      return;
                    }

                    setIsUploading(true);
                    try {
                      // 이미지 업로드
                      const storage = getStorage();
                      const imageRef = ref(storage, `joy/${currentUser.uid}/${Date.now()}_${uploadForm.imageFile.name}`);
                      await uploadBytes(imageRef, uploadForm.imageFile);
                      const imageUrl = await getDownloadURL(imageRef);

                      // Firestore에 데이터 저장
                      await addDoc(collection(db, 'joy'), {
                        userId: currentUser.uid,
                        imageUrl,
                        description: uploadForm.description,
                        createdAt: serverTimestamp(),
                        aiResponse: null
                      });

                      // 폼 초기화
                      setUploadForm({
                        description: '',
                        imageFile: null,
                        imageUrl: ''
                      });
                      setShowUploadForm(false);
                    } catch (error) {
                      console.error('업로드 실패:', error);
                      alert('업로드 중 오류가 발생했습니다.');
                    } finally {
                      setIsUploading(false);
                    }
                  }}
                  disabled={isUploading}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {isUploading ? '업로드 중...' : '업로드'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 업로드된 사진들 표시 영역 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map(post => (
              <div
                key={post.id}
                className="bg-white/10 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => setSelectedPost(post)}
              >
                <div className="relative aspect-video">
                  <img
                    src={post.imageUrl}
                    alt={post.description}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-300 line-clamp-2">{post.description}</p>
                  {post.aiResponse ? (
                    <div className="mt-3 p-3 bg-blue-500/20 rounded-lg">
                      <p className="text-sm text-blue-200">{post.aiResponse}</p>
                    </div>
                  ) : currentUser?.uid === post.userId && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnalyze(post);
                      }}
                      className="mt-3 w-full bg-blue-500 hover:bg-blue-600"
                      disabled={analyzingPosts[post.id]}
                    >
                      {analyzingPosts[post.id] ? '분석 중...' : 'AI 분석 요청'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 선택된 게시물 상세 보기 */}
          <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>관심도 분석</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative aspect-video">
                  <img
                    src={selectedPost?.imageUrl}
                    alt={selectedPost?.description}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <p className="text-gray-300">{selectedPost?.description}</p>
                {selectedPost?.aiResponse && (
                  <div className="p-4 bg-blue-500/20 rounded-lg">
                    <p className="text-blue-200">{selectedPost.aiResponse}</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
}
