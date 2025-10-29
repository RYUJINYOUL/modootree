'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { MessageSquare, User, ArrowLeft } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  searchResults?: {
    title: string;
    description: string;
    link: string;
  }[];
}

interface DailyChat {
  messages: ChatMessage[];
  date: string;
}

export default function ChatDetailPage({ params }: { params: { id: string } }) {
  const { currentUser } = useSelector((state: any) => state.user);
  const [chat, setChat] = useState<DailyChat | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'full' | 'summary'>('full');

  useEffect(() => {
    const fetchChat = async () => {
      if (!currentUser?.uid) return;

      try {
        const chatDoc = await getDoc(doc(db, 'dailyChats', params.id));
        if (chatDoc.exists()) {
          const [dateStr] = chatDoc.id.split('_');
          setChat({
            messages: chatDoc.data().messages || [],
            date: dateStr
          });
        }
      } catch (error) {
        console.error('Error fetching chat:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChat();
  }, [currentUser?.uid, params.id]);

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">로그인이 필요합니다.</p>
      </div>
    );
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!chat) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">대화를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-auto w-full">
      <div className="w-full space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/profile/chats"
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold">
              {format(new Date(chat.date), 'PPP', { locale: ko })}의 대화
            </h1>
          </div>
          <Tabs value={activeTab} onValueChange={(value: 'full' | 'summary') => setActiveTab(value)}>
            <TabsList className="grid w-[200px] grid-cols-2">
              <TabsTrigger value="full">전체</TabsTrigger>
              <TabsTrigger value="summary">요약</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* 전체 대화 내용 */}
        {activeTab === 'full' && (
          <div className="space-y-6">
            {chat.messages.map((message, index) => (
              <div 
                key={index}
                className={`flex gap-4 ${
                  message.role === 'assistant' ? 'bg-gray-800' : ''
                } rounded-lg p-4`}
              >
                <div className="flex-shrink-0">
                  {message.role === 'user' ? (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <User className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
                      <span className="text-sm font-bold">AI</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-gray-200 whitespace-pre-wrap">{message.content}</p>
                  {message.searchResults && message.searchResults.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm text-gray-400">참고 자료:</p>
                      {message.searchResults.map((result, idx) => (
                        <a
                          key={idx}
                          href={result.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          <p className="font-medium text-blue-400 mb-1">{result.title}</p>
                          <p className="text-sm text-gray-400 line-clamp-2">{result.description}</p>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 요약 보기 */}
        {activeTab === 'summary' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-center text-gray-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-blue-400" />
              <p>요약 기능은 준비 중입니다.</p>
              <p className="text-sm mt-2">
                일기 작성, 메모 정리, 건강 분석 등 다양한 방식의 요약 기능이 추가될 예정입니다.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}











