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

export default function InterestAnalysisPage() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    image: null,
    previewUrl: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const { currentUser } = useSelector((state) => state.user) || {};

  // 실시간 데이터 로드
  useEffect(() => {
    const analysisRef = collection(db, 'interest-analysis');
    const q = query(analysisRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const analysisData = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          analysisData.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
          });
        });
        
        setAnalyses(analysisData);
        setLoading(false);
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleImageUpload = async (file) => {
    if (!file) return null;
    
    const storage = getStorage();
    const fileRef = ref(storage, `interest-analysis/${currentUser.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  };

  const handleAnalyze = async (imageUrl, description) => {
    try {
      // AI 분석 요청
      const response = await fetch('/api/analyze-interest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          imageUrl,
          description
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.analysis;
      }
      return "AI 분석에 실패했습니다. 나중에 다시 시도해주세요.";
    } catch (error) {
      console.error('AI 분석 중 오류:', error);
      return "AI 분석 중 오류가 발생했습니다.";
    }
  };

  return (
    <>
      <LoginOutButton />
      <Header />
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-gray-900 text-white/90 relative">
        <div className="container mx-auto px-4 py-10">
          {/* 제목과 업로드 버튼 */}
          <div className="relative flex items-center justify-center mb-6">
            <h1 className="text-2xl font-bold text-white text-center">
              관심도 분석
            </h1>
            {currentUser?.uid && (
              <div className="absolute right-0">
                <Button
                  onClick={() => setShowUploadForm(true)}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  사진 업로드
                </Button>
              </div>
            )}
          </div>

          {/* 업로드 모달 */}
          <Dialog open={showUploadForm} onOpenChange={setShowUploadForm}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>사진 업로드</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">제목</label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="제목을 입력하세요"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">상황 설명</label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="모임 상황을 설명해주세요 (예: 친구들과의 모임, 소개팅 등)"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">사진</label>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById('image-upload').click()}
                      >
                        사진 선택
                      </Button>
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setUploadForm({
                              ...uploadForm,
                              image: file,
                              previewUrl: URL.createObjectURL(file)
                            });
                          }
                        }}
                        className="hidden"
                      />
                    </div>

                    {/* 이미지 미리보기 */}
                    {uploadForm.previewUrl && (
                      <div className="relative">
                        <img
                          src={uploadForm.previewUrl}
                          alt="미리보기"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => setUploadForm({
                            ...uploadForm,
                            image: null,
                            previewUrl: ''
                          })}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowUploadForm(false)}>
                  취소
                </Button>
                <Button
                  disabled={isSaving || !uploadForm.title || !uploadForm.description || !uploadForm.image}
                  onClick={async () => {
                    if (!currentUser) {
                      alert('로그인이 필요합니다.');
                      return;
                    }

                    setIsSaving(true);
                    try {
                      // 이미지 업로드
                      const imageUrl = await handleImageUpload(uploadForm.image);
                      
                      // AI 분석 요청
                      const analysis = await handleAnalyze(imageUrl, uploadForm.description);

                      // Firestore에 저장
                      const analysisData = {
                        title: uploadForm.title,
                        description: uploadForm.description,
                        imageUrl,
                        analysis,
                        createdAt: serverTimestamp(),
                        userId: currentUser.uid,
                        author: {
                          uid: currentUser.uid,
                          displayName: currentUser.displayName || currentUser.email?.split('@')[0],
                          email: currentUser.email,
                          photoURL: currentUser.photoURL
                        }
                      };

                      await addDoc(collection(db, 'interest-analysis'), analysisData);
                      
                      setShowUploadForm(false);
                      setUploadForm({
                        title: '',
                        description: '',
                        image: null,
                        previewUrl: ''
                      });
                    } catch (error) {
                      console.error('저장 중 오류:', error);
                      alert('저장 중 오류가 발생했습니다.');
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                >
                  {isSaving ? '분석 중...' : '분석하기'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 분석 결과 목록 */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          ) : analyses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">아직 분석된 사진이 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {analyses.map((analysis) => (
                <div 
                  key={analysis.id}
                  className="bg-gray-800 rounded-lg overflow-hidden"
                >
                  <img
                    src={analysis.imageUrl}
                    alt={analysis.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="text-lg font-semibold mb-2">{analysis.title}</h3>
                    <p className="text-gray-400 text-sm mb-4">{analysis.description}</p>
                    <div className="bg-violet-500/10 p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                            <span className="text-sm font-medium text-violet-200">AI</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-violet-100 whitespace-pre-wrap">
                            {analysis.analysis}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
