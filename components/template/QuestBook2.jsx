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
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
} from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const db = getFirestore(app);
const storage = getStorage(app);

const MESSAGES_PER_PAGE = 10;

const QuestBook2 = ({ username, uid }) => {
  const pathname = usePathname();
  const isEditable = pathname.startsWith('/editor');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState('latest');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  const { currentUser } = useSelector((state) => state.user);
  const finalUid = uid ?? currentUser?.uid;
  const userRole = currentUser?.uid;
  const canEdit = isEditable ? finalUid : userRole === uid;

  const fetchMessages = async (isFirstPage = false) => {
    try {
      let q;
      if (sortBy === 'latest') {
        q = query(
          collection(db, 'users', finalUid, 'comments'),
          where('parentId', '==', null),
          orderBy('createdAt', 'desc'),
          limit(MESSAGES_PER_PAGE),
          ...(isFirstPage ? [] : [startAfter(lastVisible)])
        );
      } else {
        q = query(
          collection(db, 'users', finalUid, 'comments'),
          where('parentId', '==', null),
          orderBy('likes', 'desc'),
          orderBy('createdAt', 'desc'),
          limit(MESSAGES_PER_PAGE),
          ...(isFirstPage ? [] : [startAfter(lastVisible)])
        );
      }

      console.log('Fetching messages for uid:', finalUid);
      const snapshot = await getDocs(q);
      console.log('Fetched messages:', snapshot.docs.length);
      
      const messageList = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const message = { id: doc.id, ...doc.data() };
          console.log('Message data:', message);
          
          // 답글 가져오기
          const repliesQuery = query(
            collection(db, 'users', finalUid, 'comments'),
            where('parentId', '==', doc.id),
            orderBy('createdAt', 'asc')
          );
          const repliesSnapshot = await getDocs(repliesQuery);
          message.replies = repliesSnapshot.docs.map(replyDoc => ({
            id: replyDoc.id,
            ...replyDoc.data()
          }));
          
          return message;
        })
      );

      console.log('Final message list:', messageList);

      if (isFirstPage) {
        setMessages(messageList);
      } else {
        setMessages(prev => [...prev, ...messageList]);
      }

      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === MESSAGES_PER_PAGE);
    } catch (error) {
      console.error('메시지 로드 실패:', error);
    }
  };

  useEffect(() => {
    console.log('QuestBook2 mounted with finalUid:', finalUid);
    if (finalUid) {
      fetchMessages(true);
    }
  }, [finalUid, sortBy]);

  const handleImageUpload = async (file) => {
    if (!file) return null;

    try {
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const storageRef = ref(storage, `guestbook2/${finalUid}/${fileName}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      return { url, path: snapshot.ref.fullPath };
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!newMessage.trim() && !imageFile) return;
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

      const messageData = {
        content: newMessage.trim(),
        author: {
          uid: currentUser.uid,
          displayName: currentUser.displayName || '익명',
          photoURL: currentUser.photoURL || null,
        },
        createdAt: serverTimestamp(),
        likes: 0,
        likedBy: [],
        reactions: {},
        parentId: replyTo?.id || null,
        ...(imageData && { image: imageData }),
      };

      await addDoc(collection(db, 'users', finalUid, 'comments'), messageData);

      setNewMessage('');
      setImageFile(null);
      setImagePreview('');
      setReplyTo(null);
      fetchMessages(true);
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      alert('메시지 전송에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (message) => {
    if (!canEdit && currentUser?.uid !== message.author.uid) return;
    if (!window.confirm('메시지를 삭제하시겠습니까?')) return;

    try {
      // 이미지가 있다면 삭제
      if (message.image?.path) {
        const imageRef = ref(storage, message.image.path);
        await deleteObject(imageRef);
      }

      // 답글이 있다면 모두 삭제
      if (!message.parentId) {
        const repliesQuery = query(
          collection(db, 'users', finalUid, 'comments'),
          where('parentId', '==', message.id)
        );
        const repliesSnapshot = await getDocs(repliesQuery);
        for (const replyDoc of repliesSnapshot.docs) {
          await deleteDoc(doc(db, 'users', finalUid, 'comments', replyDoc.id));
        }
      }

      await deleteDoc(doc(db, 'users', finalUid, 'comments', message.id));
      fetchMessages(true);
    } catch (error) {
      console.error('메시지 삭제 실패:', error);
      alert('메시지 삭제에 실패했습니다.');
    }
  };

  const handleLike = async (message) => {
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      const messageRef = doc(db, 'users', finalUid, 'comments', message.id);
      const hasLiked = message.likedBy.includes(currentUser.uid);

      await updateDoc(messageRef, {
        likes: hasLiked ? message.likes - 1 : message.likes + 1,
        likedBy: hasLiked
          ? message.likedBy.filter(uid => uid !== currentUser.uid)
          : [...message.likedBy, currentUser.uid],
      });

      fetchMessages(true);
    } catch (error) {
      console.error('좋아요 실패:', error);
    }
  };

  const handleReaction = async (message, emoji) => {
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      const messageRef = doc(db, 'users', finalUid, 'comments', message.id);
      const reactions = { ...message.reactions };
      const emojiKey = emoji.id;

      if (!reactions[emojiKey]) {
        reactions[emojiKey] = { count: 1, users: [currentUser.uid] };
      } else {
        const hasReacted = reactions[emojiKey].users.includes(currentUser.uid);
        if (hasReacted) {
          reactions[emojiKey].count--;
          reactions[emojiKey].users = reactions[emojiKey].users.filter(
            uid => uid !== currentUser.uid
          );
          if (reactions[emojiKey].count === 0) {
            delete reactions[emojiKey];
          }
        } else {
          reactions[emojiKey].count++;
          reactions[emojiKey].users.push(currentUser.uid);
        }
      }

      await updateDoc(messageRef, { reactions });
      fetchMessages(true);
    } catch (error) {
      console.error('리액션 실패:', error);
    }
  };

  const handleEdit = async () => {
    if (!editingMessage || !currentUser) return;

    try {
      const messageRef = doc(db, 'users', finalUid, 'comments', editingMessage.id);
      await updateDoc(messageRef, {
        content: newMessage,
        editedAt: serverTimestamp(),
      });

      setEditingMessage(null);
      setNewMessage('');
      fetchMessages(true);
    } catch (error) {
      console.error('메시지 수정 실패:', error);
      alert('메시지 수정에 실패했습니다.');
    }
  };

  const MessageCard = ({ message, isReply = false }) => (
    <div className={`bg-white rounded-lg shadow p-4 ${isReply ? 'ml-8 mt-2' : 'mb-4'}`}>
      <div className="flex items-start gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={message.author.photoURL} />
          <AvatarFallback>
            {message.author.displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="font-medium">{message.author.displayName}</span>
              <span className="text-sm text-gray-500 ml-2">
                {message.createdAt?.toDate().toLocaleString()}
              </span>
              {message.editedAt && (
                <span className="text-xs text-gray-400 ml-2">(수정됨)</span>
              )}
            </div>
            {(canEdit || currentUser?.uid === message.author.uid) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() => {
                      setEditingMessage(message);
                      setNewMessage(message.content);
                    }}
                  >
                    수정
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete(message)}>
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div className="mt-2 text-gray-800 break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
          {message.image && (
            <div className="mt-3">
              <Image
                src={message.image.url}
                alt="첨부 이미지"
                width={300}
                height={200}
                className="rounded-lg object-cover"
              />
            </div>
          )}
          <div className="flex items-center gap-2 mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleLike(message)}
              className={`gap-1 ${
                message.likedBy.includes(currentUser?.uid) ? 'text-red-500' : ''
              }`}
            >
              <Heart className="w-4 h-4" />
              {message.likes > 0 && message.likes}
            </Button>
            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyTo(message)}
                className="gap-1"
              >
                <MessageCircle className="w-4 h-4" />
                {message.replies?.length > 0 && message.replies.length}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Smile className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="p-0" style={{ width: '320px' }}>
                <Picker
                  data={data}
                  onEmojiSelect={(emoji) => handleReaction(message, emoji)}
                  theme="light"
                  locale="ko"
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {Object.entries(message.reactions || {}).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(message.reactions).map(([emojiId, reaction]) => (
                <Badge
                  key={emojiId}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => handleReaction(message, { id: emojiId })}
                >
                  {emojiId} {reaction.count}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
      {message.replies?.map(reply => (
        <MessageCard key={reply.id} message={reply} isReply />
      ))}
    </div>
  );

  return (
    <div className="w-full max-w-[800px] mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">방명록</h2>
        <Tabs value={sortBy} onValueChange={setSortBy}>
          <TabsList>
            <TabsTrigger value="latest">최신순</TabsTrigger>
            <TabsTrigger value="likes">인기순</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 메시지 입력 */}
      <div className="bg-white rounded-lg shadow p-4">
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
        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="메시지를 입력하세요... (마크다운 사용 가능)"
          className="min-h-[100px] mb-3"
        />
        <div className="flex items-center justify-between">
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
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('imageUpload').click()}
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
                  variant="ghost"
                  size="sm"
                  className="absolute -top-2 -right-2 p-0 h-5 w-5"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview('');
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
          <Button
            onClick={editingMessage ? handleEdit : handleSubmit}
            disabled={loading || (!newMessage.trim() && !imageFile)}
          >
            <Send className="w-4 h-4 mr-2" />
            {editingMessage ? '수정' : '작성'}
          </Button>
        </div>
      </div>

      {/* 메시지 목록 */}
      <div className="space-y-4">
        {messages.map(message => (
          <MessageCard key={message.id} message={message} />
        ))}
        {hasMore && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => fetchMessages()}
          >
            <ChevronDown className="w-4 h-4 mr-2" />
            더 보기
          </Button>
        )}
      </div>
    </div>
  );
};

export default QuestBook2; 