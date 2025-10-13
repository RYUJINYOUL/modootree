import { db } from './firebase-admin';
import { Timestamp, Transaction, DocumentSnapshot, DocumentData, DocumentReference } from 'firebase-admin/firestore';

const DAILY_CHAT_LIMIT = 100;

export async function checkAndUpdateChatLimit(uid: string) {
  const userRef = db.collection('users').doc(uid);
  const chatStatsRef: DocumentReference<DocumentData> = userRef.collection('stats').doc('chat');

  try {
    // 트랜잭션으로 처리
    const result = await db.runTransaction(async (transaction: Transaction) => {
      const doc: DocumentSnapshot<DocumentData> = await transaction.get(chatStatsRef);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 문서가 없거나 마지막 채팅이 오늘 이전인 경우
      const docData = doc.data();
      if (!doc.exists || !docData?.lastChat || docData.lastChat.toDate() < today) {
        transaction.set(chatStatsRef, {
          lastChat: Timestamp.now(),
          dailyCount: 1
        });
        return { canChat: true, remainingChats: DAILY_CHAT_LIMIT - 1 };
      }

      const data = doc.data()!;

      // 일일 한도 초과
      if (data.dailyCount >= DAILY_CHAT_LIMIT) {
        return { canChat: false, remainingChats: 0 };
      }

      // 대화 횟수 업데이트
      const newCount = data.dailyCount + 1;
      transaction.update(chatStatsRef, {
        lastChat: Timestamp.now(),
        dailyCount: newCount
      });

      return { 
        canChat: true, 
        remainingChats: DAILY_CHAT_LIMIT - newCount
      };
    });

    return result;

  } catch (error) {
    console.error('Chat limit check error:', error);
    // 오류 발생 시 기본값으로 허용
    return { canChat: true, remainingChats: DAILY_CHAT_LIMIT };
  }
}