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
import { getAuth, GoogleAuthProvider, signInWithPopup, browserLocalPersistence } from "firebase/auth";
import KakaoAuthButton from '@/components/auth/KakaoAuthButton';
import { useSelector, useDispatch } from 'react-redux';
import { usePathname } from 'next/navigation';
import { setUser } from "@/store/userSlice";
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
  ChevronLeft,
  ChevronRight,
  Settings,
  PenSquare
} from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useDebounce } from '../../hooks/useDebounce';
import CategoryManager from './CategoryManager';
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from '@/lib/utils';
import { sendNotification } from '@/lib/utils/notification-manager';
import { useToast } from '@/components/ui/use-toast';

const db = getFirestore(app);
const storage = getStorage(app);

const POSTS_PER_PAGE = 10;

// 카테고리 정의
const CATEGORIES = [
  { id: 'all', name: '전체' },
  { id: 'category', name: '카테고리1' },
  { id: 'category2', name: '카테고리2' },
  { id: 'category3', name: '카테고리3' },
  { id: 'category4', name: '카테고리4' },
];

// 색상 팔레트 추가
const COLOR_PALETTE = [
  'transparent',
  '#000000', '#FFFFFF', '#F87171', '#FBBF24',
  '#34D399', '#60A5FA', '#A78BFA', '#F472B6',
];

const Board = ({ username, uid }) => {
  const pathname = usePathname();
  const isEditable = pathname ? pathname.startsWith('/editor') : false;
  const { toast } = useToast();
  const { currentUser } = useSelector((state) => state.user);
  const finalUid = uid ?? currentUser?.uid;

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
  const [categories, setCategories] = useState([{ id: 'all', name: '전체' }]);
  const [isEditingCategories, setIsEditingCategories] = useState(false);
  const [newCategory, setNewCategory] = useState({ id: '', name: '' });
  const [editingCategory, setEditingCategory] = useState(null);
  // 글쓰기 폼의 카테고리 상태 추가
  const [writeFormCategory, setWriteFormCategory] = useState('');

  // 컴포넌트 내부에 로컬 상태 추가
  const [localNewCategory, setLocalNewCategory] = useState({ id: '', name: '' });
  const [localEditingCategory, setLocalEditingCategory] = useState(null);

  // 디바운스된 값 생성
  const debouncedNewCategory = useDebounce(localNewCategory, 300);
  const debouncedEditingCategory = useDebounce(localEditingCategory, 300);

  // useEffect로 디바운스된 값이 변경될 때만 실제 상태 업데이트
  useEffect(() => {
    if (debouncedNewCategory) {
      setNewCategory(debouncedNewCategory);
    }
  }, [debouncedNewCategory]);

  useEffect(() => {
    if (debouncedEditingCategory) {
      setEditingCategory(debouncedEditingCategory);
    }
  }, [debouncedEditingCategory]);

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

  // fetchPosts 함수 수정
  const fetchPosts = async (isFirstPage = false) => {
    try {
      let q;
      const baseQuery = collection(db, 'users', finalUid, 'posts');
      
      // 정렬 조건 설정
      const orderByConditions = sortBy === 'latest' 
        ? [orderBy('createdAt', 'desc')]
        : [orderBy('likes', 'desc'), orderBy('createdAt', 'desc')];

      if (selectedCategory === 'all') {
        // 전체 카테고리일 때
        q = query(
          baseQuery,
          ...orderByConditions,
          orderBy('isNotice', 'desc'),
          limit(POSTS_PER_PAGE),
          ...(isFirstPage ? [] : [startAfter(lastVisible)])
        );
      } else {
        // 특정 카테고리 선택시
        q = query(
          baseQuery,
          where('category', '==', selectedCategory),
          ...orderByConditions,
          orderBy('isNotice', 'desc'),
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
                  toast.error("이미지 업로드 권한이 없습니다. 관리자에게 문의하세요.", {
            title: "이미지 업로드 오류",
            duration: 5000
          });
      } else {
        toast.error("이미지 업로드에 실패했습니다. 다시 시도해주세요.", {
          title: "이미지 업로드 오류",
          duration: 5000
        });
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

  // 알림 표시 함수
  const showToast = (title, description) => {
    if (toast) {
      toast({
        title,
        description,
        duration: 3000
      });
    }
  };

  // 게시글 작성 폼 제출 핸들러
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!title.trim() || !content.trim()) {
      toast.error("제목과 내용을 모두 입력해주세요.", {
        title: "입력 오류"
      });
      return;
    }

    if (!writeFormCategory) {
      toast.error("카테고리를 선택해주세요.", {
        title: "입력 오류"
      });
      return;
    }

    if (!currentUser || !currentUser.uid) {
      setShowLoginModal(true);
      return;
    }

    try {
      setLoading(true);
      let imageData = null;

      // 이미지 업로드 처리
      if (imageFile) {
        try {
          imageData = await handleImageUpload(imageFile);
        } catch (error) {
          toast({
            title: "이미지 업로드 실패",
            description: error.code === 'storage/unauthorized' 
              ? "이미지 업로드 권한이 없습니다. 관리자에게 문의하세요."
              : "이미지 업로드에 실패했습니다. 다시 시도해주세요."
          });
          setLoading(false);
          return;
        }
      }

      const postData = {
        title: title.trim(),
        content: content.trim(),
        category: writeFormCategory,
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
        isNotice: writeFormCategory === 'notice',
        tags: tags || [],
        ...(imageData && { image: imageData }),
      };

      // 1. 게시글 저장
      const postRef = await addDoc(collection(db, 'users', finalUid, 'posts'), postData);

      // 2. 알림 전송 (실패해도 게시글 저장에는 영향 없음)
      try {
        await sendNotification(finalUid, {
          type: 'questbook2',
          title: '새로운 방명록이 등록되었습니다',
          content: `${postData.author.displayName}: ${postData.title}`,
          sourceTemplate: 'questbook2',
          metadata: {
            authorName: postData.author.displayName,
            authorEmail: currentUser?.email || '',
            postId: postRef.id,
            postTitle: postData.title,
            postContent: postData.content.substring(0, 200)
          }
        });
      } catch (error) {
        console.error('알림 전송 실패:', error);
        // 알림 전송 실패를 무시
      }

      // 폼 초기화 (상태 업데이트를 한 번에 처리)
      setTitle('');
      setContent('');
      setImageFile(null);
      setImagePreview('');
      setTags([]);
      setWriteFormCategory('');
      setIsWriting(false);
      
      // 성공 메시지
      toast.success("게시글이 작성되었습니다.", {
        title: "성공"
      });

    } catch (error) {
      console.error('게시글 작성 실패:', error);
      toast.error("게시글 작성에 실패했습니다.", {
        title: "오류"
      });
    } finally {
      setLoading(false);
    }
  };

  // 게시글 삭제 함수 수정
  const handleDelete = async (post) => {
    if (!isEditable && currentUser?.uid !== post.author?.uid && currentUser?.uid !== finalUid) {
      console.error("삭제 권한이 없습니다.");
      return;
    }

    if (!window.confirm('정말 이 게시글을 삭제하시겠습니까?\n삭제된 게시글은 복구할 수 없습니다.')) {
      return;
    }

    try {
      // 게시글에 달린 모든 댓글 삭제
      const commentsQuery = query(
        collection(db, 'users', finalUid, 'posts', post.id, 'comments')
      );
      const commentsSnapshot = await getDocs(commentsQuery);
      const batch = writeBatch(db);
      commentsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

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
      const postRef = doc(db, 'users', finalUid, 'posts', post.id);
      await deleteDoc(postRef);
      
      // 상태 업데이트
      setPosts(prevPosts => prevPosts.filter(p => p.id !== post.id));
      setSelectedPost(null);
      setComments([]);
      setNewComment('');
      setReplyTo(null);
      
      console.log("게시글이 삭제되었습니다.");
    } catch (error) {
      console.error('게시글 삭제 실패:', error);
      console.error("게시글 삭제에 실패했습니다.");
    }
  };

  // 좋아요 기능
  const handleLike = async (post) => {
    if (!currentUser || !currentUser.uid) {
      setShowLoginModal(true);
      return;
    }

    try {
      const postRef = doc(db, 'users', finalUid, 'posts', post.id);
      const hasLiked = post.likedBy?.includes(currentUser.uid);

      // 낙관적 업데이트: UI를 즉시 업데이트
      const updatedPost = {
        ...post,
        likes: hasLiked ? (post.likes || 1) - 1 : (post.likes || 0) + 1,
        likedBy: hasLiked
          ? post.likedBy.filter(uid => uid !== currentUser.uid)
          : [...(post.likedBy || []), currentUser.uid],
      };

      // 선택된 게시글인 경우 업데이트
      if (selectedPost?.id === post.id) {
        setSelectedPost(updatedPost);
      }

      // 게시글 목록 업데이트
      setPosts(prevPosts =>
        prevPosts.map(p => p.id === post.id ? updatedPost : p)
      );

      // 서버 업데이트
      await updateDoc(postRef, {
        likes: updatedPost.likes,
        likedBy: updatedPost.likedBy,
      });
    } catch (error) {
      console.error('좋아요 실패:', error);
      // 에러 발생 시 원래 상태로 되돌리기
      toast({
        title: "오류",
        description: "좋아요 처리에 실패했습니다.",
        duration: 3000
      });
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
    if (!currentUser || !currentUser.uid) {
      setShowLoginModal(true);
      return;
    }

    if (!newComment.trim()) {
      showToast("입력 오류", "댓글 내용을 입력해주세요.");
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
      showToast("성공", "댓글이 작성되었습니다.");
    } catch (error) {
      console.error('댓글 작성 실패:', error);
      showToast("오류", "댓글 작성에 실패했습니다.");
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
      showToast("성공", "댓글이 삭제되었습니다.");
    } catch (error) {
      console.error('댓글 삭제 실패:', error);
      showToast("오류", "댓글 삭제에 실패했습니다.");
    }
  };

  // 댓글 좋아요
  const handleCommentLike = async (postId, comment) => {
    if (!currentUser || !currentUser.uid) {
      setShowLoginModal(true);
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
      showToast("성공", "댓글 좋아요가 추가되었습니다.");
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
      toast({
        title: "오류",
        description: "카테고리 저장에 실패했습니다.",
        duration: 3000
      });
    }
  };

  // 카테고리 추가 폼 제출 핸들러
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!newCategory.id.trim() || !newCategory.name.trim()) {
      showToast("입력 오류", "카테고리 ID와 이름을 모두 입력해주세요.");
      return;
    }

    if (categories.some(cat => cat.id === newCategory.id)) {
      showToast("오류", "이미 존재하는 카테고리 ID입니다.");
      return;
    }

    const updatedCategories = [...categories, newCategory];
    await saveCategories(updatedCategories);
    setNewCategory({ id: '', name: '' });
    showToast("성공", "카테고리가 추가되었습니다.");
  };

  // 카테고리 수정
  const handleUpdateCategory = async (category) => {
    if (!category.id.trim() || !category.name.trim()) {
      showToast("입력 오류", "카테고리 ID와 이름을 모두 입력해주세요.");
      return;
    }

    const updatedCategories = categories.map(cat =>
      cat.id === category.id ? category : cat
    );
    await saveCategories(updatedCategories);
    setEditingCategory(null);
    showToast("성공", "카테고리가 수정되었습니다.");
  };

  // 카테고리 삭제
  const handleDeleteCategory = async (categoryId) => {
    if (categoryId === 'all') {
      showToast("오류", "기본 카테고리는 삭제할 수 없습니다.");
      return;
    }

    if (!window.confirm('이 카테고리를 삭제하시겠습니까?\n해당 카테고리의 게시글은 전체로 이동됩니다.')) {
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
      showToast("성공", "카테고리가 삭제되었습니다.");
    } catch (error) {
      console.error('카테고리 삭제 실패:', error);
      toast({
        title: "오류",
        description: "카테고리 삭제에 실패했습니다.",
        duration: 3000
      });
    }
  };

  // 카테고리 변경 시 게시글 다시 로드
  useEffect(() => {
    if (!finalUid) return;
    fetchPosts(true);
  }, [finalUid, selectedCategory, sortBy]);

  // 실시간 업데이트 수정
  useEffect(() => {
    if (!finalUid) return;

    let unsubscribe = () => {};

    const fetchAndSubscribe = async () => {
      try {
        const baseQuery = collection(db, 'users', finalUid, 'posts');
        let q;

        if (selectedCategory === 'all') {
          q = query(
            baseQuery,
            orderBy('createdAt', 'desc'),
            orderBy('isNotice', 'desc'),
            limit(POSTS_PER_PAGE)
          );
        } else {
          q = query(
            baseQuery,
            where('category', '==', selectedCategory),
            orderBy('createdAt', 'desc'),
            orderBy('isNotice', 'desc'),
            limit(POSTS_PER_PAGE)
          );
        }

        unsubscribe = onSnapshot(q, (snapshot) => {
          const postList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
          }));
          
          setPosts(postList);

          // 현재 선택된 게시글이 있고, 해당 게시글이 삭제되었다면 선택 해제
          if (selectedPost) {
            const stillExists = postList.some(post => post.id === selectedPost.id);
            if (!stillExists) {
              setSelectedPost(null);
            }
          }
        }, (error) => {
          console.error('Posts snapshot error:', error);
          console.error('게시글 목록을 불러오는데 실패했습니다.');
        });
      } catch (error) {
        console.error('Subscribe error:', error);
        console.error('게시글 목록 구독에 실패했습니다.');
      }
    };

    fetchAndSubscribe();

    return () => {
      unsubscribe();
    };
  }, [finalUid, selectedCategory]);

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

  // 카테고리 실시간 업데이트 리스너 추가
  useEffect(() => {
    if (!finalUid) return;

    const docRef = doc(db, 'users', finalUid, 'settings', 'boardCategories');
    const unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        const loadedCategories = doc.data().categories;
        setCategories([
          { id: 'all', name: '전체' },
          ...loadedCategories
        ]);
      }
    });

    return () => unsubscribe();
  }, [finalUid]);

  // 카테고리 변경 시 정렬 초기화
  useEffect(() => {
    if (selectedCategory !== 'all') {
      setSortBy('latest'); // 전체가 아닌 카테고리 선택 시 항상 최신순으로
    }
  }, [selectedCategory]);

  // 스크롤 상태 관리를 위한 state 추가
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(true);

  // 스크롤 이벤트 핸들러
  const handleTabsScroll = (e) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.target;
    setShowLeftScroll(scrollLeft > 0);
    setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 10);
  };

  // 캐로셀 설정 수정
  const [emblaRef] = useEmblaCarousel({
    align: 'start',
    dragFree: true,
    containScroll: 'trimSnaps'
  });

  // 카테고리 탭 부분 스타일 수정
  const PostCard = ({ post }) => {
    const authorName = post.author?.displayName || '익명';
    const authorInitial = authorName.charAt(0).toUpperCase();

    return (
      <div 
        className={cn(
          "bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer relative",
          styleSettings.rounded === 'none' && 'rounded-none',
          styleSettings.rounded === 'sm' && 'rounded',
          styleSettings.rounded === 'md' && 'rounded-lg',
          styleSettings.rounded === 'lg' && 'rounded-xl',
          styleSettings.rounded === 'full' && 'rounded-full'
        )}
        style={getStyleObject()}
        onClick={() => handlePostSelect(post)}
      >
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-base font-semibold" style={{ color: styleSettings.textColor }}>{post.title}</h3>
              {post.isNotice && (
                <Badge variant="destructive" className="text-xs px-2 py-0">공지</Badge>
              )}
              <Badge 
                variant="outline" 
                className="text-xs px-2 py-0"
                style={{ color: styleSettings.textColor, borderColor: styleSettings.textColor }}
              >
                {categories.find(cat => cat.id === post.category)?.name || '자유게시판'}
              </Badge>
            </div>
            
            <p className="text-sm line-clamp-2 mb-3 whitespace-pre-wrap break-words" style={{ color: styleSettings.textColor }}>{post.content}</p>
            
            <div className="flex items-center gap-3 text-xs" style={{ color: styleSettings.textColor }}>
              <span className="flex items-center gap-1">
                <Heart className={`w-3 h-3 ${post.likedBy?.includes(currentUser?.uid) ? 'fill-red-500 text-red-500' : ''}`} />
                {post.likes || 0}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                {post.commentCount || 0}
              </span>
              <span className="flex items-center gap-1">
                👁️ {post.viewCount || 0}
              </span>
              <Avatar className="w-5 h-5">
                <AvatarImage src={post.author?.photoURL || null} />
                <AvatarFallback className="text-xs">
                  {authorInitial}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {post.image && (
            <div className="flex-shrink-0 w-16 h-16 relative">
              <Image
                src={post.image.url}
                alt="게시글 이미지"
                fill
                className="rounded-md object-cover"
              />
            </div>
          )}
        </div>
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

  // 공통 클래스 수정 - 배경색 관련 스타일 모두 제거
  const tabTriggerClasses = "shrink-0 bg-transparent hover:bg-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 h-8 rounded-full transition-colors";

  // Board 컴포넌트 내부에 스타일 관련 상태 추가
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [styleSettings, setStyleSettings] = useState({
    bgColor: '#60A5FA',
    textColor: '#FFFFFF',
    bgOpacity: 0.2,
    shadow: 'none',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    rounded: 'md'
  });

  // 스타일 설정 저장 함수
  const saveStyleSettings = async (newSettings) => {
    if (!finalUid) return;
    try {
      await setDoc(doc(db, 'users', finalUid, 'settings', 'boardStyle'), newSettings, { merge: true });
      setStyleSettings(newSettings);
    } catch (error) {
      console.error('스타일 설정 저장 실패:', error);
    }
  };

  // 스타일 설정 불러오기
  useEffect(() => {
    const loadStyleSettings = async () => {
      if (!finalUid) return;
      try {
        const docRef = doc(db, 'users', finalUid, 'settings', 'boardStyle');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setStyleSettings(docSnap.data());
        }
      } catch (error) {
        console.error('스타일 설정 불러오기 실패:', error);
      }
    };
    loadStyleSettings();
  }, [finalUid]);

  // 스타일 객체 생성 함수
  const getStyleObject = () => {
    const shadowColor = styleSettings.shadowColor 
      ? `rgba(${parseInt(styleSettings.shadowColor.slice(1, 3), 16)}, ${parseInt(styleSettings.shadowColor.slice(3, 5), 16)}, ${parseInt(styleSettings.shadowColor.slice(5, 7), 16)}, ${styleSettings.shadowOpacity ?? 0.2})`
      : 'rgba(0, 0, 0, 0.2)';

    const style = {
      backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
      color: styleSettings.textColor
    };

    // 특정 그림자 스타일에 대해서만 테두리 추가
    if (['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(styleSettings.shadow)) {
      style.borderColor = styleSettings.shadowColor || '#000000';
      style.borderWidth = '2px';
      style.borderStyle = 'solid';
    }

    // 그림자 스타일 적용
    switch (styleSettings.shadow) {
      case 'none':
        style.boxShadow = 'none';
        break;
      case 'sm':
        style.boxShadow = `0 1px 2px ${shadowColor}`;
        break;
      case 'md':
        style.boxShadow = `0 4px 6px ${shadowColor}`;
        break;
      case 'lg':
        style.boxShadow = `0 10px 15px ${shadowColor}`;
        break;
      case 'retro':
        style.boxShadow = `8px 8px 0px 0px ${shadowColor}`;
        break;
      case 'float':
        style.boxShadow = `0 10px 20px -5px ${shadowColor}`;
        break;
      case 'glow':
        style.boxShadow = `0 0 20px ${shadowColor}`;
        break;
      case 'inner':
        style.boxShadow = `inset 0 2px 4px ${shadowColor}`;
        break;
      case 'sharp':
        style.boxShadow = `-10px 10px 0px ${shadowColor}`;
        break;
      case 'soft':
        style.boxShadow = `0 5px 15px ${shadowColor}`;
        break;
      case 'stripe':
        style.boxShadow = `4px 4px 0 ${shadowColor}, 8px 8px 0 ${shadowColor}, 12px 12px 0 ${shadowColor}`;
        break;
      case 'cross':
        style.boxShadow = `4px 4px 0 ${shadowColor}, -4px -4px 0 ${shadowColor}, 4px -4px 0 ${shadowColor}, -4px 4px 0 ${shadowColor}`;
        break;
      case 'diagonal':
        style.boxShadow = `4px 4px 0 ${shadowColor}, 8px 8px 0 ${shadowColor}, 12px 12px 0 ${shadowColor}, -4px -4px 0 ${shadowColor}, -8px -8px 0 ${shadowColor}, -12px -12px 0 ${shadowColor}`;
        break;
      default:
        style.boxShadow = 'none';
    }

    return style;
  };

  // 스타일 설정 UI 렌더링 함수
  const renderColorSettings = () => {
    if (!isEditable) return null;

    return (
      <div className="w-full max-w-[1100px] mb-4">
        <button
          onClick={() => setShowColorSettings(!showColorSettings)}
          className="w-full p-2 rounded-lg mb-2 hover:bg-opacity-30 transition-all"
          style={{ 
            backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
            color: styleSettings.textColor 
          }}
        >
          게시판 스타일 설정 {showColorSettings ? '닫기' : '열기'}
        </button>

        {showColorSettings && (
          <div className="flex flex-col gap-4 bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-700">
            {/* 배경색 설정 */}
            <div className="flex flex-col gap-2 bg-gray-700/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">배경색</span>
                <div className="flex flex-wrap gap-1">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color}
                      onClick={() => saveStyleSettings({ ...styleSettings, bgColor: color })}
                      className={cn(
                        "w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110",
                        styleSettings.bgColor === color && "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">투명도</span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={styleSettings.bgOpacity ?? 0.2}
                  onChange={(e) => saveStyleSettings({ ...styleSettings, bgOpacity: parseFloat(e.target.value) })}
                  className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-100 w-12 text-right">
                  {(styleSettings.bgOpacity ?? 0.2).toFixed(1)}
                </span>
              </div>
            </div>

            {/* 텍스트 색상 설정 */}
            <div className="flex items-center gap-2 bg-gray-700/50 p-3 rounded-lg">
              <span className="text-sm font-medium text-gray-100 w-24">텍스트</span>
              <div className="flex flex-wrap gap-1">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={`text-${color}`}
                    onClick={() => saveStyleSettings({ ...styleSettings, textColor: color })}
                    className={cn(
                      "w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110",
                      styleSettings.textColor === color && "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* 그림자 설정 UI 수정 */}
            <div className="flex flex-col gap-2 bg-gray-700/50 p-3 rounded-lg">
              {/* 그림자 종류 */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">그림자 종류</span>
                <select
                  value={styleSettings.shadow || 'none'}
                  onChange={(e) => saveStyleSettings({ ...styleSettings, shadow: e.target.value })}
                  className="px-3 py-1.5 bg-gray-800 text-gray-100 rounded-lg border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="none">없음</option>
                  <option value="sm">약한</option>
                  <option value="md">보통</option>
                  <option value="lg">강한</option>
                  <option value="retro">레트로</option>
                  <option value="float">플로팅</option>
                  <option value="glow">글로우</option>
                  <option value="inner">이너</option>
                  <option value="sharp">샤프</option>
                  <option value="soft">소프트</option>
                  <option value="stripe">스트라이프</option>
                  <option value="cross">크로스</option>
                  <option value="diagonal">대각선</option>
                </select>
              </div>
              {/* 그림자 색상 */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">그림자 색상</span>
                <div className="flex flex-wrap gap-1">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={`shadow-${color}`}
                      onClick={() => saveStyleSettings({ ...styleSettings, shadowColor: color })}
                      className={cn(
                        "w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110",
                        styleSettings.shadowColor === color && "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              {/* 그림자 투명도 */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">그림자 투명도</span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={styleSettings.shadowOpacity ?? 0.2}
                  onChange={(e) => saveStyleSettings({ ...styleSettings, shadowOpacity: parseFloat(e.target.value) })}
                  className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-100 w-12 text-right">
                  {(styleSettings.shadowOpacity ?? 0.2).toFixed(1)}
                </span>
              </div>
            </div>

            {/* 그림자 설정 */}
            <div className="flex items-center gap-2 bg-gray-700/50 p-3 rounded-lg">
              <span className="text-sm font-medium text-gray-100 w-24">모서리</span>
              <select
                value={styleSettings.rounded || 'md'}
                onChange={(e) => saveStyleSettings({ ...styleSettings, rounded: e.target.value })}
                className="px-3 py-1.5 bg-gray-800 text-gray-100 rounded-lg border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">각진</option>
                <option value="sm">약간 둥근</option>
                <option value="md">둥근</option>
                <option value="lg">많이 둥근</option>
                <option value="full">완전 둥근</option>
              </select>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 공통 카테고리 스타일 정의
  const categoryStyles = "shrink-0 hover:!bg-gray-200 data-[state=active]:!text-black h-9 px-4 rounded-full transition-colors";

  // 최상단에 스타일 정의
  const baseTabStyles = {
    container: "w-full",
    list: "flex gap-[5px] justify-start pl-4 p-0 border-0 bg-transparent",
    trigger: "shrink-0 transition-all"
  };

  // handleEdit 함수 추가
  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editingDiary || !editingDiary.title || !editingDiary.content) {
      showToast("입력 오류", "제목과 내용을 모두 입력해주세요.");
      return;
    }

    try {
      const postRef = doc(db, 'users', finalUid, 'posts', editingDiary.id);
      await updateDoc(postRef, {
        title: editingDiary.title,
        content: editingDiary.content,
        updatedAt: new Date().toISOString()
      });

      setEditingDiary(null);
      showToast("성공", "게시글이 수정되었습니다.");
    } catch (error) {
      console.error('게시글 수정 실패:', error);
      showToast("오류", "게시글 수정에 실패했습니다.");
    }
  };

  // editingDiary state 추가
  const [editingDiary, setEditingDiary] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const dispatch = useDispatch();

  return (
    <div className='pt-5 md:flex md:flex-col md:items-center md:justify-center md:w-full px-2'>
      <div className="w-full max-w-[1100px] space-y-6 mt-8">
        {renderColorSettings()}

        {/* 정렬 옵션 UI */}
        <div className="flex justify-end">
          <div 
            className={cn(
              "inline-flex rounded-lg",
              styleSettings.rounded === 'none' && 'rounded-none',
              styleSettings.rounded === 'sm' && 'rounded',
              styleSettings.rounded === 'md' && 'rounded-lg',
              styleSettings.rounded === 'lg' && 'rounded-xl',
              styleSettings.rounded === 'full' && 'rounded-full'
            )}
            style={getStyleObject()}
          >
            <Tabs 
              value={sortBy} 
              onValueChange={setSortBy}
              className="[&_button]:text-inherit min-w-fit"
            >
              <TabsList className="h-9 bg-transparent p-1">
                {isEditable && (
                  <TabsTrigger 
                    value="category"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsEditingCategories(true);
                      setSortBy('latest');
                    }}
                    style={{ color: styleSettings.textColor }}
                    className="px-3 data-[state=active]:bg-white/10 text-sm"
                  >
                    카테고리
                  </TabsTrigger>
                )}
                <TabsTrigger 
                  value="write" 
                  onClick={(e) => {
                    e.preventDefault();
                    if (!currentUser || !currentUser.uid) {
                      setShowLoginModal(true);
                      return;
                    }
                    setIsWriting(true);
                    setSortBy('latest');
                  }}
                  style={{ color: styleSettings.textColor }}
                  className="px-3 data-[state=active]:bg-white/10 text-sm"
                >
                  글쓰기
                </TabsTrigger>
                <TabsTrigger 
                  value="search"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsSearchOpen(true);
                    setSortBy('latest');
                  }}
                  style={{ color: styleSettings.textColor }}
                  className="px-3 data-[state=active]:bg-white/10 text-sm"
                >
                  검색
                </TabsTrigger>
                {selectedCategory === 'all' && (
                  <>
                    <TabsTrigger 
                      value="latest" 
                      style={{ color: styleSettings.textColor }}
                      className="px-3 data-[state=active]:bg-white/10 text-sm"
                    >
                      최신순
                    </TabsTrigger>
                    <TabsTrigger 
                      value="likes" 
                      style={{ color: styleSettings.textColor }}
                      className="px-3 data-[state=active]:bg-white/10 text-sm"
                    >
                      인기순
                    </TabsTrigger>
                  </>
                )}
              </TabsList>
            </Tabs>
          </div>
        </div>

              {/* 로그인 모달 */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md bg-white/10 backdrop-blur-sm border border-white/20">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-white text-center">로그인</DialogTitle>
            <p className="text-white/80 text-center mb-2">모두트리에 오신 것을 환영합니다!</p>
            {/KAKAOTALK/i.test(navigator?.userAgent) && (
              <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-yellow-200 text-sm text-center">
                  카카오톡 창 구글 로그인 미지원
                  <br />
                  아래 새창 열기 또는 카톡 로그인 이용하세요
                </p>
              </div>
            )}
          </DialogHeader>
          <div className="w-full flex flex-col gap-6 py-4">
            <button
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black font-semibold shadow hover:bg-gray-100 transition-all hover:scale-[1.02]"
              onClick={async () => {
                const auth = getAuth(app);
                const provider = new GoogleAuthProvider();
                try {
                  await auth.setPersistence(browserLocalPersistence);
                  const result = await signInWithPopup(auth, provider);
                  const user = result.user;

                  // Firestore에 사용자 정보 저장
                  const userRef = doc(db, "users", user.uid);
                  const userDoc = await getDoc(userRef);

                  if (!userDoc.exists()) {
                    await setDoc(userRef, {
                      email: user.email,
                      photoURL: user.photoURL,
                      provider: "google",
                      createdAt: serverTimestamp(),
                    });

                    // 기본 설정 저장
                    await setDoc(doc(db, "users", user.uid, "settings", "background"), {
                      type: 'image',
                      value: 'https://firebasestorage.googleapis.com/v0/b/mtree-e0249.firebasestorage.app/o/backgrounds%2F1752324410072_leaves-8931849_1920.jpg?alt=media&token=bda5d723-d54d-43d5-8925-16aebeec8cfa',
                      animation: true
                    });
                  }

                  // Redux store 업데이트
                  dispatch(setUser({
                    uid: user.uid,
                    email: user.email,
                    photoURL: user.photoURL,
                    displayName: user.displayName
                  }));

                  setShowLoginModal(false);
                } catch (error) {
                  console.error("Google login error", error);
                  alert("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
                }
              }}
            >
              <svg className="w-5 h-5" viewBox="0 0 533.5 544.3">
                <path
                  d="M533.5 278.4c0-18.5-1.5-37.1-4.7-55.3H272.1v104.8h147c-6.1 33.8-25.7 63.7-54.4 82.7v68h87.7c51.5-47.4 81.1-117.4 81.1-200.2z"
                  fill="#4285f4" />
                <path
                  d="M272.1 544.3c73.4 0 135.3-24.1 180.4-65.7l-87.7-68c-24.4 16.6-55.9 26-92.6 26-71 0-131.2-47.9-152.8-112.3H28.9v70.1c46.2 91.9 140.3 149.9 243.2 149.9z"
                  fill="#34a853" />
                <path
                  d="M119.3 324.3c-11.4-33.8-11.4-70.4 0-104.2V150H28.9c-38.6 76.9-38.6 167.5 0 244.4l90.4-70.1z"
                  fill="#fbbc04" />
                <path
                  d="M272.1 107.7c38.8-.6 76.3 14 104.4 40.8l77.7-77.7C405 24.6 339.7-.8 272.1 0 169.2 0 75.1 58 28.9 150l90.4 70.1c21.5-64.5 81.8-112.4 152.8-112.4z"
                  fill="#ea4335" />
              </svg>
              <span>Google로 로그인</span>
            </button>
            <KakaoAuthButton />
            <div className="w-full flex justify-end mt-2">
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  window.location.href = "/register";
                }}
                className="text-blue-300 hover:underline text-sm"
              >
                회원가입
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 카테고리 관리 다이얼로그 */}
      <CategoryManager  
          isOpen={isEditingCategories}
          onOpenChange={setIsEditingCategories}
          categories={categories}
          onAddCategory={(newCategory) => {
            const updatedCategories = [...categories, newCategory];
            saveCategories(updatedCategories);
          }}
          onUpdateCategory={(category) => {
            const updatedCategories = categories.map(cat =>
              cat.id === category.id ? category : cat
            );
            saveCategories(updatedCategories);
          }}
          onDeleteCategory={handleDeleteCategory}
        />

        {/* 카테고리 탭 */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className={baseTabStyles.container}>
          <div className="relative">
            <div className="overflow-hidden mx-[-1rem] px-4" ref={emblaRef}>
              <TabsList className={baseTabStyles.list}>
                {categories.map(category => (
                  <TabsTrigger 
                    key={category.id} 
                    value={category.id}
                    className={cn(
                      baseTabStyles.trigger,
                      "h-9 px-4 rounded-full transition-all hover:bg-opacity-30"
                    )}
                    style={{ 
                      backgroundColor: category.id === selectedCategory 
                        ? `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.3) * 255).toString(16).padStart(2, '0')}`
                        : `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.1) * 255).toString(16).padStart(2, '0')}`,
                      color: styleSettings.textColor,
                      ...(['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(styleSettings.shadow) && {
                        borderColor: styleSettings.shadowColor || '#000000',
                        borderWidth: '2px',
                        borderStyle: 'solid'
                      })
                    }}
                  >
                    {category.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>
        </Tabs>
        
        {/* 게시글 목록 */}
        <div className="space-y-4 min-h-[200px]">
          {posts.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] bg-white/30 rounded-lg">
              <p className="text-black">등록된 게시글이 없습니다.</p>
            </div>
          ) : (
            <>
              {posts.map(post => (
                <PostCard key={post.id} post={post} />
              ))}
            </>
          )}
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
                value={writeFormCategory}
                onChange={(e) => setWriteFormCategory(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">카테고리 선택</option>
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
        <Dialog 
          open={!!selectedPost}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedPost(null);
              setEditingDiary(null);
              setComments([]);
              setNewComment('');
              setReplyTo(null);
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedPost && (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle>{selectedPost.title}</DialogTitle>
                    {(isEditable || currentUser?.uid === selectedPost.author?.uid || currentUser?.uid === finalUid) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem 
                            onClick={() => {
                              setEditingDiary(selectedPost);
                              setSelectedPost(null);
                            }}
                          >
                            수정
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              if (window.confirm('게시글을 삭제하시겠습니까?')) {
                                handleDelete(selectedPost);
                              }
                            }}
                          >
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
                    <span>
                      {selectedPost.createdAt.toLocaleString('ko-KR', { 
                        year: '2-digit', 
                        month: '2-digit', 
                        day: '2-digit', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>

                  <div className="prose max-w-none">
                    <div className="whitespace-pre-wrap break-words">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {selectedPost.content}
                      </ReactMarkdown>
                    </div>
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

                  <div className="mt-8 border-t pt-4">
                    <h3 className="text-lg font-semibold mb-4">
                      댓글 {selectedPost.commentCount}
                    </h3>

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
              </>
            )}
          </DialogContent>
        </Dialog>

      {/* 게시글 수정 다이얼로그 */}
      {editingDiary && (
        <Dialog open={!!editingDiary} onOpenChange={() => setEditingDiary(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>게시글 수정</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEdit} className="space-y-4">
              <input
                type="text"
                value={editingDiary.title}
                onChange={(e) => setEditingDiary(prev => ({ ...prev, title: e.target.value }))}
                placeholder="제목"
                className={cn(
                  "w-full p-3 rounded-lg",
                  styleSettings.rounded === 'none' && 'rounded-none',
                  styleSettings.rounded === 'sm' && 'rounded',
                  styleSettings.rounded === 'md' && 'rounded-lg',
                  styleSettings.rounded === 'lg' && 'rounded-xl',
                  styleSettings.rounded === 'full' && 'rounded-full'
                )}
                style={getStyleObject()}
              />
              <textarea
                value={editingDiary.content}
                onChange={(e) => setEditingDiary(prev => ({ ...prev, content: e.target.value }))}
                placeholder="내용을 입력하세요..."
                className={cn(
                  "w-full h-48 p-3 rounded-lg resize-none",
                  styleSettings.rounded === 'none' && 'rounded-none',
                  styleSettings.rounded === 'sm' && 'rounded',
                  styleSettings.rounded === 'md' && 'rounded-lg',
                  styleSettings.rounded === 'lg' && 'rounded-xl',
                  styleSettings.rounded === 'full' && 'rounded-full'
                )}
                style={getStyleObject()}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingDiary(null)}
                >
                  취소
                </Button>
                <Button type="submit">수정</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* 검색 다이얼로그 추가 */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>검색</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="title">제목</option>
                <option value="content">내용</option>
                <option value="author.displayName">작성자</option>
              </select>
              <Input
                placeholder="검색어를 입력하세요"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                    setIsSearchOpen(false);
                  }
                }}
                className="h-10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSearchOpen(false)}>
              취소
            </Button>
            <Button onClick={() => {
              handleSearch();
              setIsSearchOpen(false);
            }}>
              검색
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default Board; 