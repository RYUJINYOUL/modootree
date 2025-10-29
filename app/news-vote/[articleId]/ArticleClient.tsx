'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import useAuth from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { User } from 'firebase/auth';
import LoginOutButton from '@/components/ui/LoginOutButton';

const NEWS_CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'current_affairs', label: '시사' },
  { id: 'economy_it', label: '경제' },
  { id: 'entertainment', label: '연예' },
];

interface Article {
  id: string;
  title: string;
  summary: string;
  original_url: string;
  category: string;
  total_votes: number;
  view_count: number;
  vote_options: Array<{ id: string; content: string; votes: number }>;
  youtube_link?: string;
}

interface Comment {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl?: string;
  createdAt: { 
    seconds: number;
    nanoseconds: number;
    toDate: () => Date;
  };
}

export default function ArticleClient({ articleId }: { articleId: string }) {
  const [newsItem, setNewsItem] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      setError(null);
      try {
        const articleRef = doc(db, 'articles', articleId);
        const articleSnap = await getDoc(articleRef);

        if (!articleSnap.exists()) {
          notFound();
          return;
        }

        const data = { id: articleSnap.id, ...articleSnap.data() } as Article;
        setNewsItem(data);

        await updateDoc(articleRef, {
          view_count: (data.view_count || 0) + 1
        });

      } catch (err) {
        console.error('뉴스 기사 로드 실패:', err);
        setError('뉴스 기사를 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    const commentsRef = collection(db, 'articles', articleId, 'comments');
    const commentsQuery = query(commentsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const fetchedComments: Comment[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt
      })) as Comment[];
      setComments(fetchedComments);
    }, (err) => {
      console.error("댓글 실시간 업데이트 실패:", err);
    });

    if (articleId) {
      fetchArticle();
    }
    return () => unsubscribe();
  }, [articleId]);

  const handleVote = useCallback(async (optionId: string) => {
    if (!newsItem) return;

    const votedKey = `voted_news_${newsItem.id}`;
    if (localStorage.getItem(votedKey)) {
      alert('이미 이 뉴스에 투표하셨습니다.');
      return;
    }

    try {
      const response = await fetch('/api/news/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: newsItem.id, optionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '투표 처리 중 오류가 발생했습니다.');
      }

      localStorage.setItem(votedKey, 'true');
      setNewsItem(prevNewsItem => {
        if (!prevNewsItem) return prevNewsItem;
        const updatedOptions = prevNewsItem.vote_options.map((option: any) =>
          option.id === optionId ? { ...option, votes: option.votes + 1 } : option
        );
        return {
          ...prevNewsItem,
          vote_options: updatedOptions,
          total_votes: (prevNewsItem.total_votes || 0) + 1,
        };
      });
      alert('투표가 완료되었습니다!');

    } catch (err) {
      console.error('투표 실패:', err);
      alert(err instanceof Error ? err.message : '투표 처리 중 알 수 없는 오류가 발생했습니다.');
    }
  }, [newsItem]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('댓글을 작성하려면 로그인해야 합니다.');
      return;
    }
    if (!newCommentText.trim()) {
      alert('댓글 내용을 입력해주세요.');
      return;
    }
    setCommentLoading(true);

    try {
      const response = await fetch('/api/news/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await (user as User).getIdToken()}`,
        },
        body: JSON.stringify({ articleId: newsItem?.id, commentText: newCommentText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '댓글 제출에 실패했습니다.');
      }

      setNewCommentText('');
    } catch (err) {
      console.error('댓글 제출 실패:', err);
      alert(err instanceof Error ? err.message : '댓글 제출 중 알 수 없는 오류가 발생했습니다.');
    } finally {
      setCommentLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-cyan-900 text-white/90 flex items-center justify-center">
        <div className="text-center text-gray-400">뉴스 투표를 불러오는 중...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-cyan-900 text-white/90 flex items-center justify-center">
        <div className="text-center text-red-400">{error}</div>
      </main>
    );
  }

  if (!newsItem) {
    return null;
  }

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-cyan-900 text-white/90 relative overflow-hidden">
      <div className="fixed top-0 left-0 right-0 z-20 w-full">
        <LoginOutButton />
      </div>
      <div className="container mx-auto px-4 relative z-10 max-w-2xl mt-[80px]">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">모두트리 AI 투표</h1>
          <p className="text-sm text-gray-400">가입 없이도 투표는 가능, 투표 제안은 회원가입 필수</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20 shadow-lg mb-8">
          <h2 className="text-xl font-bold mb-2">{
            newsItem.category && NEWS_CATEGORIES.find(cat => cat.id === newsItem.category)?.label ? 
            `[${NEWS_CATEGORIES.find(cat => cat.id === newsItem.category)?.label}] ${newsItem.title}` : 
            newsItem.title
          }</h2>
          <p className="text-gray-300 text-sm mb-4">{newsItem.summary}</p>
          <div className="flex items-center justify-between mb-4">
            <a href={newsItem.original_url} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-400 text-xs inline-block">원문 보기 →</a>
          </div>

          <div className="flex justify-end gap-2 mb-6">
            <button
              onClick={() => {
                if (navigator.clipboard && shareUrl) {
                  navigator.clipboard.writeText(shareUrl)
                    .then(() => alert('링크가 클립보드에 복사되었습니다!'))
                    .catch(err => console.error('링크 복사 실패:', err));
                } else {
                  alert('이 브라우저에서는 클립보드 복사 기능을 지원하지 않습니다.');
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-colors text-sm"
            >
              투표 링크 공유
            </button>
            <Link href="/news-vote">
              <button className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-colors text-sm">
                리스트로 이동
              </button>
            </Link>
          </div>

          <div className="space-y-3 mt-4">
            {newsItem.vote_options?.map((option: any) => (
              <button
                key={option.id}
                onClick={() => handleVote(option.id)}
                className="w-full text-left p-4 rounded-lg bg-black/30 hover:bg-black/40 transition-all"
              >
                <div className="flex justify-between items-center">
                  <span className="text-base">{option.content}</span>
                  <span className="text-blue-400 text-sm">{option.votes}표 ({((option.votes / newsItem.total_votes) * 100 || 0).toFixed(1)}%)</span>
                </div>
                <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${(option.votes / newsItem.total_votes) * 100 || 0}%` }}
                  />
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 flex justify-between items-center text-xs text-gray-500">
            <span>총 {newsItem.total_votes}명 참여</span>
            <span>조회수 {newsItem.view_count}</span>
          </div>
        </div>

        <div className="mt-10 p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-blue-500/20 shadow-lg">
          <h3 className="text-xl font-bold mb-4">댓글 ({comments.length})</h3>

          {user ? (
            <form onSubmit={handleCommentSubmit} className="mb-6 space-y-3">
              <Textarea
                placeholder="댓글을 입력해주세요."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                disabled={commentLoading}
                className="bg-gray-800/50 border-blue-500/30 text-white focus:ring-blue-500 focus:border-blue-500"
              />
              <Button
                type="submit"
                disabled={commentLoading || !newCommentText.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-colors"
              >
                {commentLoading ? '등록 중...' : '댓글 등록'}
              </Button>
            </form>
          ) : (
            <div className="text-center text-gray-400 mb-6">
              <Link href="/login" className="text-blue-400 hover:underline">
                댓글을 작성하려면 로그인해주세요.
              </Link>
            </div>
          )}

          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-gray-400 text-center">아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</p>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="flex items-start gap-3 p-3 bg-black/30 rounded-lg">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={comment.authorPhotoUrl || undefined} alt={comment.authorName} />
                    <AvatarFallback>{comment.authorName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{comment.authorName}</span>
                      <span className="text-xs text-gray-400">{formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true, locale: ko })}</span>
                    </div>
                    <p className="text-sm text-gray-200 mt-1">{comment.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

















