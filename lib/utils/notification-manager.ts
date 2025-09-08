import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';

interface NotificationData {
  type: 'calendar' | 'questbook' | 'questbook2' | 'diary' | 'todayDiary';
  title: string;
  content: string;
  sourceTemplate: string;
  metadata: {
    authorName: string;
    authorEmail?: string;
    postId?: string;
    postTitle?: string;
    postContent?: string;
    eventDate?: string;
  };
}

export async function sendNotification(ownerUid: string, data: NotificationData) {
  try {
    // 1. 알림 생성
    const notificationId = `${data.type}_${Date.now()}`;
    const notificationsRef = doc(db, 'users', ownerUid, 'notifications', 'list');
    
    await setDoc(notificationsRef, {
      notifications: {
        [notificationId]: {
          ...data,
          createdAt: serverTimestamp(),
          readAt: null
        }
      }
    }, { merge: true });

    // 2. 페이지 소유자 정보 가져오기
    const ownerRef = doc(db, 'users', ownerUid);
    const ownerDoc = await getDoc(ownerRef);
    const ownerEmail = ownerDoc.exists() ? ownerDoc.data().email : null;

    // 3. 구독자 목록 가져오기
    const subscribersRef = doc(db, 'users', ownerUid, 'settings', 'subscribers');
    const subscribersDoc = await getDoc(subscribersRef);
    const subscribers = subscribersDoc.exists() ? subscribersDoc.data().users || {} : {};
    const subscriberEmails = Object.values(subscribers).map((sub: any) => sub.email);

    // 4. 페이지 소유자와 구독자 이메일 합치기 (중복 제거)
    const allEmails = Array.from(new Set([ownerEmail, ...subscriberEmails].filter(Boolean)));

    // 3. 이메일이 있는 경우에만 전송
    if (allEmails.length > 0) {
      await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: data.title,
          content: data.content,
          recipients: allEmails,
          metadata: data.metadata
        })
      });
    }

    return true;
  } catch (error) {
    console.error('알림 전송 실패:', error);
    return false;
  }
}
