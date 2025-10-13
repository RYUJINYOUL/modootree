import { db } from '@/firebase';
import { collection, doc, getDoc, setDoc, updateDoc, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: any;
}

export interface ChatSession {
  messages: ChatMessage[];
  lastUpdated: any;
}

export const saveChat = async (userId: string, message: ChatMessage) => {
  try {
    const chatRef = doc(db, 'users', userId, 'aiComfort', 'chat');
    const chatDoc = await getDoc(chatRef);

    if (!chatDoc.exists()) {
      // 새로운 채팅 세션 생성
      await setDoc(chatRef, {
        messages: [message],
        lastUpdated: serverTimestamp()
      });
    } else {
      // 기존 메시지에 추가
      const data = chatDoc.data() as ChatSession;
      await updateDoc(chatRef, {
        messages: [...data.messages, message],
        lastUpdated: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('채팅 저장 오류:', error);
    throw error;
  }
};

export const loadChat = async (userId: string): Promise<ChatMessage[]> => {
  try {
    const chatRef = doc(db, 'users', userId, 'aiComfort', 'chat');
    const chatDoc = await getDoc(chatRef);

    if (!chatDoc.exists()) {
      return [];
    }

    const data = chatDoc.data() as ChatSession;
    return data.messages;
  } catch (error) {
    console.error('채팅 불러오기 오류:', error);
    throw error;
  }
};








