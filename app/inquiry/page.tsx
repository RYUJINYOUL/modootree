'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { MessageCircle, Send, Lock } from 'lucide-react';
import { useSelector } from 'react-redux';
import { loadSlim } from "tsparticles-slim";
import Particles from "react-tsparticles";
import Header from '@/components/Header';
import LoginOutButton from '@/components/ui/LoginOutButton';

import MainHeader from '@/components/MainHeader';
// Footer import 제거

const ParticlesComponent = () => {
  const particlesInit = useCallback(async (engine: any) => {
    await loadSlim(engine);
  }, []);

  return (
    <Particles
      className="w-full h-full"
      init={particlesInit}
      options={{
        fpsLimit: 120,
        particles: {
          color: {
            value: "#ffffff",
          },
          links: {
            color: "#ffffff",
            distance: 150,
            enable: true,
            opacity: 0.2,
            width: 1,
          },
          move: {
            enable: true,
            outModes: {
              default: "bounce",
            },
            random: false,
            speed: 1,
            straight: false,
          },
          number: {
            density: {
              enable: true,
              area: 800,
            },
            value: 80,
          },
          opacity: {
            value: 0.2,
          },
          shape: {
            type: "circle",
          },
          size: {
            value: { min: 1, max: 3 },
          },
        },
        detectRetina: true,
      }}
    />
  );
};

interface Reply {
  id: string;
  inquiryId: string;
  content: string;
  email: string;
  createdAt: any;
}

interface Inquiry {
  id: string;
  content: string;
  email: string;
  createdAt: any;
  status: string;
  isPrivate?: boolean; // 비공개 글 여부 추가
  authorUid?: string; // 작성자 UID 추가 (비공개 글 권한 확인용)
}

export default function InquiryPage() {
  const [content, setContent] = useState('');
  const [email, setEmail] = useState('');
  const [isPrivate, setIsPrivate] = useState(false); // 비공개 글 상태 추가
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [replies, setReplies] = useState<{ [key: string]: Reply[] }>({});
  const [replyContent, setReplyContent] = useState('');
  const [showReplyForm, setShowReplyForm] = useState<string | null>(null);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const { currentUser } = useSelector((state: any) => state.user);

  useEffect(() => {
    const q = query(
      collection(db, 'inquiries'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const inquiriesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Inquiry[];
      
      // 비공개 글 필터링: 공개 글이거나 본인이 작성한 비공개 글만 표시
      const filteredInquiries = inquiriesList.filter(inquiry => {
        if (!inquiry.isPrivate) return true; // 공개 글은 모두 표시
        return currentUser && inquiry.authorUid === currentUser.uid; // 비공개 글은 작성자만 표시
      });
      
      setInquiries(filteredInquiries);

      // 각 문의에 대한 답글 가져오기
      inquiriesList.forEach(inquiry => {
        const replyQuery = query(
          collection(db, 'replies'),
          where('inquiryId', '==', inquiry.id),
          orderBy('createdAt', 'asc')
        );

        onSnapshot(replyQuery, (replySnapshot) => {
          const replyList = replySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Reply[];

          setReplies(prev => ({
            ...prev,
            [inquiry.id]: replyList
          }));
        });
      });
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content || !email) {
      alert('이메일과 문의 내용을 모두 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const inquiryData = {
        content: content.trim(),
        email: email.trim(),
        createdAt: serverTimestamp(),
        status: 'pending',
        isPrivate: isPrivate,
        authorUid: currentUser?.uid || null // 로그인한 사용자의 UID 저장
      };

      await addDoc(collection(db, 'inquiries'), inquiryData);

      setSubmitMessage('문의가 성공적으로 등록되었습니다.');
      setContent('');
      setEmail('');
      setIsPrivate(false); // 비공개 상태도 초기화
    } catch (error) {
      console.error('문의 제출 중 오류:', error);
      setSubmitMessage('문의 등록 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplySubmit = async (inquiryId: string) => {
    if (!currentUser) {
      alert('답글을 작성하려면 로그인이 필요합니다.');
      return;
    }

    if (!replyContent) {
      alert('답글 내용을 입력해주세요.');
      return;
    }

    setIsSubmittingReply(true);
    try {
      const replyData = {
        inquiryId,
        content: replyContent.trim(),
        email: currentUser.email,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'replies'), replyData);

      setReplyContent('');
      setShowReplyForm(null);
    } catch (error) {
      console.error('답글 제출 중 오류:', error);
      alert('답글 등록 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-black to-blue-950 relative">
        <div className="absolute inset-0 z-0">
      <ParticlesComponent />
        </div>
        <div className="relative z-20">
      <LoginOutButton />
        </div>
        <div className="relative z-10">
          <Header />
        </div>
        <div className="flex-1 relative z-10">
          <div className="max-w-[800px] mx-auto px-4 py-16">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">말씀, 감사합니다.</h2>
          
          {submitMessage && (
            <div className="mb-8 p-4 rounded-lg bg-blue-500/20 text-white text-center">
              {submitMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500"
                placeholder="이메일을 입력해주세요"
                required
              />
            </div>

            <div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500 min-h-[100px]"
                placeholder="의견 작성해 주세요"
                required
              />
            </div>

            {/* 비공개 글 체크박스 */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPrivate"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="isPrivate" className="text-white/80 text-sm cursor-pointer">
                비공개 글로 작성 (본인만 볼 수 있습니다)
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {isSubmitting ? '등록 중...' : '등록하기'}
              </button>
              <a
                href="http://pf.kakao.com/_pGNPn/chat"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
              >
                카톡문의
              </a>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          {inquiries.map((inquiry) => (
            <div
              key={inquiry.id}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className="text-white/70 text-sm">
                    {inquiry.email.split('@')[0]}
                  </div>
                  {inquiry.isPrivate && (
                    <span className="flex items-center gap-1 px-2 py-1 text-xs bg-red-500/20 text-red-300 rounded-full border border-red-500/30">
                      <Lock className="w-3 h-3" />
                      비공개
                    </span>
                  )}
                </div>
                <div className="text-white/50 text-xs">
                  {formatDate(inquiry.createdAt)}
                </div>
              </div>
              <p className="text-white whitespace-pre-wrap mb-4">{inquiry.content}</p>
              
              {/* 답글 목록 */}
              {replies[inquiry.id]?.length > 0 && (
                <div className="mt-4 space-y-3 pl-4 border-l-2 border-blue-500/30">
                  {replies[inquiry.id].map((reply) => (
                    <div key={reply.id} className="bg-blue-500/10 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-blue-300 text-sm">
                          {reply.email.split('@')[0]}
                        </div>
                        <div className="text-blue-200/50 text-xs">
                          {formatDate(reply.createdAt)}
                        </div>
                      </div>
                      <p className="text-blue-100 whitespace-pre-wrap">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 답글 작성 버튼 */}
              <div className="mt-4 flex items-center gap-2">
                {currentUser ? (
                  <button
                    onClick={() => setShowReplyForm(showReplyForm === inquiry.id ? null : inquiry.id)}
                    className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    답글 달기
                  </button>
                ) : (
                  <span className="text-sm text-gray-400">답글을 작성하려면 로그인이 필요합니다.</span>
                )}
              </div>

              {/* 답글 작성 폼 */}
              {showReplyForm === inquiry.id && currentUser && (
                <div className="mt-4 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500"
                      placeholder="답글을 입력하세요"
                      required
                    />
                    <button
                      onClick={() => handleReplySubmit(inquiry.id)}
                      disabled={isSubmittingReply}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      {isSubmittingReply ? '등록 중...' : '등록'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
      </div>
    </>
  );

  function formatDate(timestamp: any) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
} 