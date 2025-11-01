import { db } from '@/firebase';
import { collection, doc, getDoc, setDoc, updateDoc, serverTimestamp, query, orderBy, getDocs, where, Timestamp } from 'firebase/firestore'; // FieldPath와 limit 제거

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: Timestamp;
  searchResults?: any[]; // 선택적 필드로 추가
}

export interface ChatSession {
  messages: ChatMessage[];
  lastUpdated: any;
  userId?: string; // 문서 내부에 userId 필드 추가
  dateKey?: string; // 문서 내부에 dateKey 필드 추가
}

export const saveChat = async (userId: string, message: ChatMessage) => {
  try {
    console.log('saveChat 호출됨', { userId, message });
    const dateKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const docId = `${dateKey}_${userId}`; // 날짜와 userId를 결합한 문서 ID
    const chatRef = doc(db, 'dailyChats', docId); // 새로운 컬렉션 경로
    console.log('saveChat - chatRef:', chatRef.path);
    
    // Firestore 호환 메시지 객체 생성 (undefined 필드 제거)
    const cleanMessage = {
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      ...(message.searchResults && { searchResults: message.searchResults })
    };
    console.log('saveChat - cleanMessage:', cleanMessage);
    
    const chatDoc = await getDoc(chatRef);

    if (!chatDoc.exists()) {
      console.log('saveChat - 새 문서 생성:', docId);
      await setDoc(chatRef, {
        userId: userId, // userId 필드 추가
        dateKey: dateKey, // dateKey 필드 추가
        messages: [cleanMessage],
        lastUpdated: serverTimestamp()
      });
    } else {
      console.log('saveChat - 기존 문서 업데이트:', docId);
      const data = chatDoc.data() as ChatSession;
      await updateDoc(chatRef, {
        messages: [...(data.messages || []), cleanMessage],
        lastUpdated: serverTimestamp()
      });
    }
    console.log('saveChat - 저장 성공');
  } catch (error) {
    console.error('채팅 저장 오류:', error);
    throw error;
  }
};

export const loadChat = async (userId: string): Promise<ChatMessage[]> => {
  try {
    // 1. 3일 전의 날짜 키 계산
    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 2); // 오늘 포함 3일 전 (오늘, 어제, 그제)

    // YYYY-MM-DD 형식의 문자열 키 생성 함수
    const formatDateKey = (date: Date): string => date.toISOString().split('T')[0];
    const startDateKey = formatDateKey(threeDaysAgo);

    // 2. Firestore 쿼리
    const chatsRef = collection(db, 'dailyChats');
    
    const q = query(
        chatsRef,
        where('userId', '==', userId),
        where('dateKey', '>=', startDateKey),
        orderBy('dateKey', 'asc') // 오래된 날짜 순서대로 정렬
    );

    // 3. 쿼리 실행
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        console.log('최근 3일 대화 기록 없음.');
        return [];
    }

    // 4. 메시지 병합
    let mergedMessages: ChatMessage[] = [];
    
    snapshot.forEach(doc => {
        const data = doc.data();
        if (Array.isArray(data.messages)) {
            mergedMessages = mergedMessages.concat(data.messages as ChatMessage[]);
        }
    });

    // 5. 최종적으로 Timestamp를 기준으로 다시 정렬
    mergedMessages.sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());

    return mergedMessages;
  } catch (error) {
    console.error('채팅 불러오기 오류:', error); 
    throw error;
  }
};








