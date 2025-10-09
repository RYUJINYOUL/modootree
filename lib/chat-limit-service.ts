import { adminDb as db } from './firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

const DAILY_CHAT_LIMIT = 100;

export async function checkAndUpdateChatLimit(uid: string) {
  const userRef = db.collection('users').doc(uid);
  const chatStatsRef = userRef.collection('stats').doc('chat');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const doc = await chatStatsRef.get();
  const data = doc.data();

  if (!data || !data.lastChat || data.lastChat.toDate() < today) {
    await chatStatsRef.set({
      lastChat: Timestamp.now(),
      dailyCount: 1
    });
    return { canChat: true, remainingChats: DAILY_CHAT_LIMIT - 1 };
  }

  if (data.dailyCount >= DAILY_CHAT_LIMIT) {
    return { canChat: false, remainingChats: 0 };
  }

  await chatStatsRef.update({
    lastChat: Timestamp.now(),
    dailyCount: data.dailyCount + 1
  });

  return { 
    canChat: true, 
    remainingChats: DAILY_CHAT_LIMIT - (data.dailyCount + 1)
  };
}
