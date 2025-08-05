'use client';

import React, { useState, useEffect } from 'react';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  where,
  serverTimestamp,
  onSnapshot,
  increment,
  writeBatch,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import app from '@/firebase';
import { useSelector } from 'react-redux';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Heart,
  MessageCircle,
  MoreVertical,
  Image as ImageIcon,
  Smile,
  Send,
  X,
  ChevronDown,
  Search,
  PlusCircle,
  Edit2,
  Trash2,
} from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const db = getFirestore(app);
const storage = getStorage(app);

const POSTS_PER_PAGE = 10;

// 카테고리 정의
const CATEGORIES = [
  { id: 'all', name: '전체' },
  { id: 'notice', name: '공지사항' },
  { id: 'free', name: '자유게시판' },
  { id: 'qna', name: 'Q&A' },
  { id: 'share', name: '정보공유' },
];

const Board = ({ username, uid }) => {
  const pathname = usePathname();
  const isEditable = pathname ? pathname.startsWith('/editor') : false;
  const [posts, setPosts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('title');
  const [selectedPost, setSelectedPost] = useState(null);
  const [isWriting, setIsWriting] = useState(false);
  const [tags, setTags] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [categories, setCategories] = useState(CATEGORIES);
  const [isEditingCategories, setIsEditingCategories] = useState(false);
  const [newCategory, setNewCategory] = useState({ id: '', name: '' });
  const [editingCategory, setEditingCategory] = useState(null);

  const { currentUser } = useSelector((state) => state.user);
  const finalUid = uid ?? currentUser?.uid;

  // 현재 사용자 정보 가져오기
  const getCurrentUserInfo = () => {
    if (!currentUser) return null;

    // undefined 값이 들어가지 않도록 필터링
    const userInfo = {
      uid: currentUser.uid,
      displayName: currentUser.displayName || username || currentUser.email?.split('@')[0] || '익명',
      photoURL: currentUser.photoURL || null,
      email: currentUser.email || null
    };

    // undefined 값을 가진 필드 제거
    Object.keys(userInfo).forEach(key => {
      if (userInfo[key] === undefined) {
        delete userInfo[key];
      }
    });

    return userInfo;
  };

  // 게시글 불러오기
  const fetchPosts = async (isFirstPage = false) => {
    try {
      let q;
      if (selectedCategory === 'all') {
        // 전체 카테고리일 때는 category 필드로 필터링하지 않음
        q = query(
          collection(db, 'users', finalUid, 'posts'),
          orderBy('createdAt', 'desc'),
          limit(POSTS_PER_PAGE),
          ...(isFirstPage ? [] : [startAfter(lastVisible)])
        );
      } else {
        // 특정 카테고리 선택시
        q = query(
          collection(db, 'users', finalUid, 'posts'),
          where('category', '==', selectedCategory),
          orderBy('createdAt', 'desc'),
          limit(POSTS_PER_PAGE),
          ...(isFirstPage ? [] : [startAfter(lastVisible)])
        );
      }

      const snapshot = await getDocs(q);
      const postList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));

      if (isFirstPage) {
        setPosts(postList);
      } else {
        setPosts(prev => [...prev, ...postList]);
      }

      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === POSTS_PER_PAGE);
    } catch (error) {
      console.error('게시글 로드 실패:', error);
    }
  };

  // 이미지 업로드 함수 수정
  const handleImageUpload = async (file) => {
    if (!file) return null;

    try {
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      // board 경로 사용
      const storageRef = ref(storage, `board/${finalUid}/${fileName}`);
      
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      return { url, path: snapshot.ref.fullPath };
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      if (error.code === 'storage/unauthorized') {
        alert('이미지 업로드 권한이 없습니다. 관리자에게 문의하세요.');
      } else {
        alert('이미지 업로드에 실패했습니다. 다시 시도해주세요.');
      }
      throw error;
    }
  };

  // 검색 기능
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchPosts(true);
      return;
    }

    try {
      const q = query(
        collection(db, 'users', finalUid, 'posts'),
        where(searchType, '>=', searchQuery),
        where(searchType, '<=', searchQuery + '\uf8ff'),
        limit(POSTS_PER_PAGE)
      );

      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));

      setPosts(results);
      setHasMore(false);
    } catch (error) {
      console.error('검색 실패:', error);
    }
  };

  // 이벤트 핸들러 추가
  const handleButtonClick = (e, action) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    action();
  };

  // 게시글 작성 폼 제출 핸들러
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }

    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      setLoading(true);
      let imageData = null;

      if (imageFile) {
        imageData = await handleImageUpload(imageFile);
      }

      const postData = {
        title: title.trim(),
        content: content.trim(),
        category: selectedCategory === 'all' ? 'free' : selectedCategory,
        author: {
          uid: currentUser.uid,
          displayName: currentUser.displayName || username || currentUser.email?.split('@')[0] || '익명',
          photoURL: currentUser.photoURL || null,
          email: currentUser.email || null
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        likes: 0,
        likedBy: [],
        viewCount: 0,
        commentCount: 0,
        isNotice: selectedCategory === 'notice',
        tags: tags || [],
        ...(imageData && { image: imageData }),
      };

      await addDoc(collection(db, 'users', finalUid, 'posts'), postData);

      setTitle('');
      setContent('');
      setImageFile(null);
      setImagePreview('');
      setTags([]);
      setIsWriting(false);
    } catch (error) {
      console.error('게시글 작성 실패:', error);
      alert('게시글 작성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 게시글 삭제 함수 수정
  const handleDelete = async (post) => {
    if (!isEditable && currentUser?.uid !== post.author?.uid) {
      alert('삭제 권한이 없습니다.');
      return;
    }

    if (!window.confirm('정말 이 게시글을 삭제하시겠습니까?\n삭제된 게시글은 복구할 수 없습니다.')) {
      return;
    }

    try {
      const batch = writeBatch(db);

      // 게시글에 달린 모든 댓글 삭제
      const commentsQuery = query(
        collection(db, 'users', finalUid, 'posts', post.id, 'comments')
      );
      const commentsSnapshot = await getDocs(commentsQuery);
      commentsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 게시글 이미지가 있다면 Storage에서 삭제
      if (post.image?.path) {
        try {
          const imageRef = ref(storage, post.image.path);
          await deleteObject(imageRef);
        } catch (error) {
          console.error('이미지 삭제 실패:', error);
          // 이미지 삭제 실패해도 게시글은 삭제 진행
        }
      }

      // 게시글 삭제
      batch.delete(doc(db, 'users', finalUid, 'posts', post.id));

      await batch.commit();
      
      // 상세보기가 열려있었다면 닫기
      setSelectedPost(null);
      
      alert('게시글이 삭제되었습니다.');
    } catch (error) {
      console.error('게시글 삭제 실패:', error);
      alert('게시글 삭제에 실패했습니다.');
    }
  };

  // 좋아요 기능
  const handleLike = async (post) => {
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      const postRef = doc(db, 'users', finalUid, 'posts', post.id);
      const hasLiked = post.likedBy?.includes(currentUser.uid);

      await updateDoc(postRef, {
        likes: hasLiked ? (post.likes || 1) - 1 : (post.likes || 0) + 1,
        likedBy: hasLiked
          ? post.likedBy.filter(uid => uid !== currentUser.uid)
          : [...(post.likedBy || []), currentUser.uid],
      });
    } catch (error) {
      console.error('좋아요 실패:', error);
    }
  };

  // 태그 관리
  const handleAddTag = (tag) => {
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // 댓글 불러오기
  const fetchComments = async (postId) => {
    try {
      const q = query(
        collection(db, 'users', finalUid, 'posts', postId, 'comments'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const commentList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      
      setComments(commentList);
    } catch (error) {
      console.error('댓글 로드 실패:', error);
    }
  };

  // 댓글 작성
  const handleAddComment = async (postId) => {
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (!newComment.trim()) {
      alert('댓글 내용을 입력해주세요.');
      return;
    }

    try {
      const userInfo = getCurrentUserInfo();
      if (!userInfo) {
        throw new Error('사용자 정보를 가져올 수 없습니다.');
      }

      const commentData = {
        content: newComment.trim(),
        author: userInfo,
        createdAt: serverTimestamp(),
        parentId: replyTo?.id || null,
        likes: 0,
        likedBy: []
      };

      const batch = writeBatch(db);

      // 댓글 추가
      const commentRef = doc(collection(db, 'users', finalUid, 'posts', postId, 'comments'));
      batch.set(commentRef, commentData);

      // 게시글의 댓글 수 증가
      const postRef = doc(db, 'users', finalUid, 'posts', postId);
      batch.update(postRef, {
        commentCount: increment(1)
      });

      await batch.commit();

      setNewComment('');
      setReplyTo(null);
    } catch (error) {
      console.error('댓글 작성 실패:', error);
      alert('댓글 작성에 실패했습니다.');
    }
  };

  // 댓글 삭제
  const handleDeleteComment = async (postId, commentId) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;

    try {
      await deleteDoc(
        doc(db, 'users', finalUid, 'posts', postId, 'comments', commentId)
      );

      // 게시글의 댓글 수 감소
      const postRef = doc(db, 'users', finalUid, 'posts', postId);
      await updateDoc(postRef, {
        commentCount: increment(-1)
      });

      fetchComments(postId);
    } catch (error) {
      console.error('댓글 삭제 실패:', error);
      alert('댓글 삭제에 실패했습니다.');
    }
  };

  // 댓글 좋아요
  const handleCommentLike = async (postId, comment) => {
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      const commentRef = doc(
        db, 
        'users', 
        finalUid, 
        'posts', 
        postId, 
        'comments', 
        comment.id
      );
      const hasLiked = comment.likedBy.includes(currentUser.uid);

      await updateDoc(commentRef, {
        likes: hasLiked ? comment.likes - 1 : comment.likes + 1,
        likedBy: hasLiked
          ? comment.likedBy.filter(uid => uid !== currentUser.uid)
          : [...comment.likedBy, currentUser.uid],
      });

      fetchComments(postId);
    } catch (error) {
      console.error('댓글 좋아요 실패:', error);
    }
  };

  // 조회수 증가 함수 추가
  const incrementViewCount = async (postId) => {
    try {
      const postRef = doc(db, 'users', finalUid, 'posts', postId);
      
      // 현재 사용자의 조회 기록을 로컬 스토리지에서 확인
      const viewedPosts = JSON.parse(localStorage.getItem('viewedPosts') || '{}');
      const lastViewTime = viewedPosts[postId];
      const now = Date.now();
      
      // 같은 게시글을 30분 이내에 다시 보면 조회수 증가하지 않음
      if (!lastViewTime || now - lastViewTime > 30 * 60 * 1000) {
        await updateDoc(postRef, {
          viewCount: increment(1)
        });
        
        // 조회 시간 기록
        viewedPosts[postId] = now;
        localStorage.setItem('viewedPosts', JSON.stringify(viewedPosts));
      }
    } catch (error) {
      console.error('조회수 업데이트 실패:', error);
    }
  };

  // 게시글 선택 핸들러 수정
  const handlePostSelect = (post) => {
    setSelectedPost(post);
    incrementViewCount(post.id);
  };

  // 카테고리 불러오기
  useEffect(() => {
    if (!finalUid) return;

    const loadCategories = async () => {
      try {
        const docRef = doc(db, 'users', finalUid, 'settings', 'boardCategories');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const loadedCategories = docSnap.data().categories;
          // '전체' 카테고리는 항상 첫 번째로
          setCategories([
            { id: 'all', name: '전체' },
            ...loadedCategories.filter(cat => cat.id !== 'all')
          ]);
        }
      } catch (error) {
        console.error('카테고리 로드 실패:', error);
      }
    };

    loadCategories();
  }, [finalUid]);

  // 카테고리 저장
  const saveCategories = async (updatedCategories) => {
    try {
      const docRef = doc(db, 'users', finalUid, 'settings', 'boardCategories');
      await setDoc(docRef, {
        categories: updatedCategories.filter(cat => cat.id !== 'all') // '전체' 카테고리는 저장하지 않음
      });
      
      setCategories([
        { id: 'all', name: '전체' },
        ...updatedCategories.filter(cat => cat.id !== 'all')
      ]);
    } catch (error) {
      console.error('카테고리 저장 실패:', error);
      alert('카테고리 저장에 실패했습니다.');
    }
  };

  // 카테고리 추가 폼 제출 핸들러
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!newCategory.id.trim() || !newCategory.name.trim()) {
      alert('카테고리 ID와 이름을 모두 입력해주세요.');
      return;
    }

    if (categories.some(cat => cat.id === newCategory.id)) {
      alert('이미 존재하는 카테고리 ID입니다.');
      return;
    }

    const updatedCategories = [...categories, newCategory];
    await saveCategories(updatedCategories);
    setNewCategory({ id: '', name: '' });
  };

  // 카테고리 수정
  const handleUpdateCategory = async (category) => {
    if (!category.id.trim() || !category.name.trim()) {
      alert('카테고리 ID와 이름을 모두 입력해주세요.');
      return;
    }

    const updatedCategories = categories.map(cat =>
      cat.id === category.id ? category : cat
    );
    await saveCategories(updatedCategories);
    setEditingCategory(null);
  };

  // 카테고리 삭제
  const handleDeleteCategory = async (categoryId) => {
    if (categoryId === 'all') {
      alert('기본 카테고리는 삭제할 수 없습니다.');
      return;
    }

    if (!window.confirm('이 카테고리를 삭제하시겠습니까?\n해당 카테고리의 게시글은 자유게시판으로 이동됩니다.')) {
      return;
    }

    try {
      // 해당 카테고리의 게시글을 자유게시판으로 이동
      const postsQuery = query(
        collection(db, 'users', finalUid, 'posts'),
        where('category', '==', categoryId)
      );
      const snapshot = await getDocs(postsQuery);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { category: 'free' });
      });

      // 카테고리 목록에서 삭제
      const updatedCategories = categories.filter(cat => cat.id !== categoryId);
      await saveCategories(updatedCategories);
      
      await batch.commit();
    } catch (error) {
      console.error('카테고리 삭제 실패:', error);
      alert('카테고리 삭제에 실패했습니다.');
    }
  };

  // 카테고리 관리 UI
  const CategoryManager = () => (
    <Dialog open={isEditingCategories} onOpenChange={setIsEditingCategories}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>카테고리 관리</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* 새 카테고리 추가 */}
          <form onSubmit={handleCategorySubmit} className="flex gap-2">
            <Input
              type="text"
              placeholder="카테고리 ID (영문/숫자)"
              value={newCategory.id}
              onChange={(e) => setNewCategory(prev => ({ ...prev, id: e.target.value.toLowerCase() }))}
              className="flex-1"
            />
            <Input
              type="text"
              placeholder="카테고리 이름"
              value={newCategory.name}
              onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
              className="flex-1"
            />
            <Button type="submit">
              <PlusCircle className="w-4 h-4 mr-1" />
              추가
            </Button>
          </form>

          {/* 카테고리 목록 */}
          <div className="space-y-2">
            {categories.map(category => (
              <div key={category.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                {editingCategory?.id === category.id ? (
                  <form 
                    className="flex items-center gap-2 w-full"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleUpdateCategory(editingCategory);
                    }}
                  >
                    <Input
                      type="text"
                      value={editingCategory.name}
                      onChange={(e) => setEditingCategory(prev => ({ ...prev, name: e.target.value }))}
                      className="flex-1"
                    />
                    <Button type="submit">저장</Button>
                    <Button type="button" variant="ghost" onClick={() => setEditingCategory(null)}>
                      취소
                    </Button>
                  </form>
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
                          onClick={(e) => handleButtonClick(e, () => setEditingCategory(category))}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleButtonClick(e, () => handleDeleteCategory(category.id))}
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

  // 컴포넌트 마운트 시 게시글 로드
  useEffect(() => {
    if (!finalUid) return;
    fetchPosts(true);
  }, [finalUid, selectedCategory, sortBy]);

  // 실시간 게시글 업데이트
  useEffect(() => {
    if (!finalUid) return;

    const q = query(
      collection(db, 'users', finalUid, 'posts'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      setPosts(postList);

      // 현재 선택된 게시글이 있다면 해당 게시글 정보도 업데이트
      if (selectedPost) {
        const updatedPost = postList.find(post => post.id === selectedPost.id);
        if (updatedPost) {
          setSelectedPost(updatedPost);
        }
      }
    });

    return () => unsubscribe();
  }, [finalUid]);

  // 실시간 댓글 업데이트
  useEffect(() => {
    if (!selectedPost) return;

    const q = query(
      collection(db, 'users', finalUid, 'posts', selectedPost.id, 'comments'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      setComments(commentList);
    });

    return () => unsubscribe();
  }, [selectedPost?.id]);

  // 게시글 상세보기에서 useEffect 추가
  useEffect(() => {
    if (selectedPost) {
      fetchComments(selectedPost.id);
    }
  }, [selectedPost]);

  // 게시글 카드 컴포넌트 수정
  const PostCard = ({ post }) => {
    const authorName = post.author?.displayName || '익명';
    const authorInitial = authorName.charAt(0).toUpperCase();
    const canManagePost = isEditable || currentUser?.uid === post.author?.uid;

    return (
      <div 
        className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer relative"
        onClick={() => handlePostSelect(post)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {post.isNotice && (
              <Badge variant="destructive">공지</Badge>
            )}
            <h3 className="text-lg font-semibold">{post.title}</h3>
          </div>
          {canManagePost && (
              <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(post);
                }}>
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        
        <p className="text-gray-600 line-clamp-2 mb-4">{post.content}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Heart className={`w-4 h-4 ${post.likedBy?.includes(currentUser?.uid) ? 'fill-red-500 text-red-500' : ''}`} />
              {post.likes || 0}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              {post.commentCount || 0}
            </span>
            <span className="flex items-center gap-1">
              👁️ {post.viewCount || 0}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarImage src={post.author?.photoURL || null} />
              <AvatarFallback>
                {authorInitial}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">
              {authorName}
            </span>
          </div>
        </div>

        {post.tags?.length > 0 && (
          <div className="flex gap-1 mt-2">
            {post.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            </div>
          )}
      </div>
    );
  };

  // 댓글 카드 컴포넌트
  const CommentCard = ({ comment, postId }) => (
    <div className={`${comment.parentId ? 'ml-8' : ''} bg-gray-50 rounded-lg p-4 mb-2`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="w-6 h-6">
            <AvatarImage src={comment.author.photoURL} />
            <AvatarFallback>
              {comment.author.displayName[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <span className="font-medium text-sm">
              {comment.author.displayName}
            </span>
            <span className="text-xs text-gray-500 ml-2">
              {comment.createdAt.toLocaleString()}
            </span>
          </div>
        </div>
        {(isEditable || currentUser?.uid === comment.author.uid) && (
            <Button
              variant="ghost"
              size="sm"
            onClick={() => handleDeleteComment(postId, comment.id)}
            >
            <X className="w-4 h-4" />
            </Button>
        )}
      </div>
      <p className="mt-2 text-sm text-gray-700">{comment.content}</p>
      <div className="flex items-center gap-4 mt-2">
              <Button
                variant="ghost"
                size="sm"
          onClick={() => handleCommentLike(postId, comment)}
          className={comment.likedBy?.includes(currentUser?.uid) ? 'text-red-500' : ''}
              >
          <Heart className="w-4 h-4 mr-1" />
          {comment.likes}
              </Button>
        {!comment.parentId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReplyTo(comment)}
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            답글
                </Button>
        )}
          </div>
            </div>
  );

  return (
    <div className="w-full max-w-[1100px] mx-auto p-4 space-y-6">
      {/* 헤더 영역 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">게시판</h1>
        <div className="flex gap-2">
          {isEditable && (
            <Button 
              type="button"
              variant="outline" 
              onClick={(e) => handleButtonClick(e, () => setIsEditingCategories(true))}
            >
              카테고리 관리
            </Button>
          )}
          <Button 
            type="button"
            onClick={(e) => handleButtonClick(e, () => setIsWriting(true))}
          >
            글쓰기
          </Button>
        </div>
      </div>

      {/* 카테고리 관리 다이얼로그 */}
      <CategoryManager />

      {/* 카테고리 및 검색 */}
      <div className="flex flex-col gap-4">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList>
            {CATEGORIES.map(category => (
              <TabsTrigger key={category.id} value={category.id}>
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="title">제목</option>
            <option value="content">내용</option>
            <option value="author.displayName">작성자</option>
          </select>
          <Input
            placeholder="검색어를 입력하세요"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleSearch}>
            <Search className="w-4 h-4" />
          </Button>
    </div>

        <div className="flex justify-end">
        <Tabs value={sortBy} onValueChange={setSortBy}>
          <TabsList>
            <TabsTrigger value="latest">최신순</TabsTrigger>
            <TabsTrigger value="likes">인기순</TabsTrigger>
          </TabsList>
        </Tabs>
        </div>
      </div>

      {/* 게시글 목록 */}
      <div className="space-y-4">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
        {hasMore && (
            <Button
            variant="outline"
            className="w-full"
            onClick={() => fetchPosts()}
          >
            <ChevronDown className="w-4 h-4 mr-2" />
            더 보기
            </Button>
        )}
      </div>

      {/* 글쓰기 다이얼로그 */}
      <Dialog open={isWriting} onOpenChange={setIsWriting}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>글쓰기</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              {categories.filter(c => c.id !== 'all').map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            
            <Input
              type="text"
              placeholder="제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

        <Textarea
              placeholder="내용을 입력하세요... (마크다운 사용 가능)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px]"
            />

            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={(e) => handleButtonClick(e, () => handleRemoveTag(tag))}
                >
                  {tag} <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
              <Input
                type="text"
                placeholder="태그 입력 후 Enter"
                className="w-32"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag(e.target.value);
                    e.target.value = '';
                  }
                }}
              />
            </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  setImageFile(file);
                  const reader = new FileReader();
                  reader.onload = (e) => setImagePreview(e.target.result);
                  reader.readAsDataURL(file);
                }
              }}
              className="hidden"
              id="imageUpload"
            />
            <Button
                type="button"
              variant="outline"
                onClick={(e) => handleButtonClick(e, () => document.getElementById('imageUpload').click())}
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              이미지 첨부
            </Button>
            {imagePreview && (
              <div className="relative">
                <Image
                  src={imagePreview}
                  alt="미리보기"
                  width={40}
                  height={40}
                  className="rounded object-cover"
                />
                <Button
                    type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute -top-2 -right-2 p-0 h-5 w-5"
                    onClick={(e) => handleButtonClick(e, () => {
                    setImageFile(null);
                    setImagePreview('');
                    })}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>

            <DialogFooter>
          <Button
                type="button" 
                variant="outline" 
                onClick={(e) => handleButtonClick(e, () => setIsWriting(false))}
          >
                취소
          </Button>
              <Button type="submit" disabled={loading}>
                {loading ? '저장 중...' : '저장'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 게시글 상세보기 다이얼로그 */}
      {selectedPost && (
        <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>{selectedPost.title}</DialogTitle>
                {(isEditable || currentUser?.uid === selectedPost.author?.uid) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => {
                        if (window.confirm('게시글을 삭제하시겠습니까?')) {
                          handleDelete(selectedPost);
                          setSelectedPost(null);
                        }
                      }}>
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
        </div>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={selectedPost.author.photoURL} />
                    <AvatarFallback>
                      {selectedPost.author.displayName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span>{selectedPost.author.displayName}</span>
                </div>
                <span>{selectedPost.createdAt.toLocaleString()}</span>
      </div>

              <div className="prose max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selectedPost.content}
                </ReactMarkdown>
              </div>

              {selectedPost.image && (
                <div className="mt-4">
                  <Image
                    src={selectedPost.image.url}
                    alt="첨부 이미지"
                    width={500}
                    height={300}
                    className="rounded-lg object-cover"
                  />
                </div>
              )}

              <div className="flex items-center gap-4">
          <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLike(selectedPost)}
                  className={selectedPost.likedBy?.includes(currentUser?.uid) ? 'text-red-500' : ''}
                >
                  <Heart className="w-4 h-4 mr-1" />
                  {selectedPost.likes}
          </Button>
      </div>

              {selectedPost.tags?.length > 0 && (
                <div className="flex gap-1">
                  {selectedPost.tags.map(tag => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* 댓글 섹션 추가 */}
              <div className="mt-8 border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">
                  댓글 {selectedPost.commentCount}
                </h3>

                {/* 댓글 작성 폼 */}
                <div className="flex gap-2 mb-4">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={replyTo ? `${replyTo.author.displayName}님에게 답글 작성` : "댓글을 입력하세요"}
                    className="flex-1"
                  />
          <Button
                    className="self-end"
                    onClick={() => handleAddComment(selectedPost.id)}
          >
                    작성
          </Button>
                </div>

                {/* 답글 작성 중인 경우 표시 */}
                {replyTo && (
                  <div className="flex items-center gap-2 mb-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    <MessageCircle className="w-4 h-4" />
                    {replyTo.author.displayName}님에게 답글 작성 중
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyTo(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* 댓글 목록 */}
                <div className="space-y-4">
                  {comments.map(comment => (
                    <CommentCard 
                      key={comment.id} 
                      comment={comment}
                      postId={selectedPost.id}
                    />
                  ))}
      </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Board; 