import { db } from '@/firebase';
import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface NotificationMetadata {
  authorName: string;
  authorEmail?: string;
  postId: string;
  postTitle: string;
  postContent: string;
  sourceUserId?: string;
  sourceUsername?: string;
}

interface Notification {
  id: string;
  type: 'calendar' | 'questbook' | 'questbook2' | 'diary' | 'todayDiary';
  title: string;
  content: string;
  createdAt: Date;
  readAt: Date | null;
  sourceTemplate: string;
  metadata: NotificationMetadata;
  sourceUserId: string;
  sourceUsername: string;
}

export async function createNotifications(
  ownerUid: string,
  notification: {
    type: 'calendar' | 'questbook' | 'questbook2' | 'diary' | 'todayDiary';
    title: string;
    content: string;
    sourceTemplate: string;
    metadata: NotificationMetadata;
  },
  emailData: {
    title: string;
    content: string;
    recipients: string[];
    metadata: NotificationMetadata;
  }
) {
  try {
    // 1. Firestore에 알림 저장
    const notificationId = `${notification.type}_${Date.now()}`;
    const notificationData = {
      ...notification,
      createdAt: serverTimestamp(),
      readAt: null,
      sourceUserId: notification.metadata.sourceUserId || '',
      sourceUsername: notification.metadata.sourceUsername || ''
    };

    // 페이지 소유자의 알림 목록에 추가
    const notificationsRef = doc(db, 'users', ownerUid, 'notifications', 'list');
    await setDoc(notificationsRef, {
      notifications: {
        [notificationId]: notificationData
      }
    }, { merge: true });

    // 2. 이메일 알림 전송
    await fetch('/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    });

  } catch (error) {
    console.error('알림 생성 실패:', error);
    throw error;
  }
}