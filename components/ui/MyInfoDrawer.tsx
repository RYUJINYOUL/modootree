'use client';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "./drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Calendar, Book, BookOpen, PenSquare, Bell, Settings, X } from 'lucide-react';
import Link from 'next/link';
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/firebase";
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs, updateDoc, serverTimestamp } from "firebase/firestore";

interface MyInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  ownerUid: string;  // 페이지 소유자의 uid
  ownerUsername: string;  // 페이지 소유자의 username
}

export default function MyInfoDrawer({ isOpen, onClose, ownerUid, ownerUsername }: MyInfoDrawerProps) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'calendar':
        return <Calendar className="w-4 h-4 text-blue-400" />;
      case 'questbook':
        return <Book className="w-4 h-4 text-green-400" />;
      case 'diary':
        return <PenSquare className="w-4 h-4 text-purple-400" />;
      case 'todayDiary':
        return <BookOpen className="w-4 h-4 text-pink-400" />;
      default:
        return <Bell className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleNotificationSettingChange = async (type: keyof typeof notificationSettings) => {
    const newSettings = {
      ...notificationSettings,
      [type]: !notificationSettings[type]
    };
    setNotificationSettings(newSettings);
    
    // 설정 저장
    await setDoc(doc(db, 'users', ownerUid, 'settings', 'notifications'), newSettings);
  };

  const handleDeleteNotification = async (notification: any, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const notificationsRef = doc(db, 'users', ownerUid, 'notifications', 'list');
    await updateDoc(notificationsRef, {
      [`notifications.${notification.id}`]: null
    });
  };

  const router = useRouter();
  const { currentUser } = useSelector((state: any) => state.user);
  
  const handleNotificationClick = async (notification: any) => {
    console.log('알림 클릭:', notification);
    
    // 읽음 처리
    if (!notification.readAt) {
      const notificationsRef = doc(db, 'users', ownerUid, 'notifications', 'list');
      await updateDoc(notificationsRef, {
        [`notifications.${notification.id}.readAt`]: serverTimestamp()
      });
    }

    // 알림 상세 다이얼로그 표시
    setSelectedNotification(notification);
  };

  const handleGoToContent = (notification: any) => {
    if (notification.metadata?.postId) {
      console.log('이동할 컨텐츠:', {
        type: notification.type,
        postId: notification.metadata.postId,
        eventDate: notification.metadata.eventDate
      });

      let url = '';
      switch (notification.type) {
        case 'calendar':
          url = `/${notification.sourceUsername}?date=${notification.metadata.eventDate}`;
          break;
        case 'questbook':
          url = `/${notification.sourceUsername}#${notification.metadata.postId}`;
          break;
        case 'diary':
        case 'todayDiary':
          url = `/${notification.sourceUsername}?diary=${notification.metadata.postId}`;
          break;
      }

      console.log('이동할 URL:', url);
      if (url) {
        // Drawer와 다이얼로그 닫기
        onClose();
        setSelectedNotification(null);
        // Next.js router로 페이지 이동
        router.push(url);
      }
    } else {
      console.log('이동할 컨텐츠 정보 없음:', notification.metadata);
    }
  };
  const [userDetails, setUserDetails] = useState<any>(null);
  const [allowedUsers, setAllowedUsers] = useState<Array<{email: string}>>([]);
  const [visitStats, setVisitStats] = useState<any>(null);
  const [subscribers, setSubscribers] = useState<Array<{email: string, subscribedAt: Date | null}>>([]);
  const [subscribedPages, setSubscribedPages] = useState<Array<{username: string, subscribedAt: Date | null}>>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [notificationSettings, setNotificationSettings] = useState<{
    calendar: boolean;
    questbook: boolean;
    diary: boolean;
    todayDiary: boolean;
  }>({
    calendar: true,
    questbook: true,
    diary: true,
    todayDiary: true
  });
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'calendar' | 'questbook' | 'diary' | 'todayDiary';
    title: string;
    content: string;
    createdAt: Date;
    readAt: Date | null;
    sourceTemplate: string;
    sourceUserId: string;
    sourceUsername: string;
    metadata: {
      authorName: string;
      authorEmail: string;
      postId?: string;
      eventDate?: string;
      isPrivate?: boolean;
      postTitle?: string;
      postContent?: string;
    };
  }>>([]);

  useEffect(() => {
    if (!ownerUid || !isOpen) return;

    // 실시간으로 허용된 사용자 목록 감시
    const unsubscribePermissions = onSnapshot(
      doc(db, "users", ownerUid, "settings", "permissions"),
      (doc) => {
        if (doc.exists()) {
          setAllowedUsers(doc.data().allowedUsers || []);
        }
      }
    );

    // 사용자 상세 정보 가져오기
    const fetchUserDetails = async () => {
      const userDoc = await getDoc(doc(db, "users", ownerUid));
      if (userDoc.exists()) {
        setUserDetails(userDoc.data());
      }
    };

    // 방문 통계 가져오기
    const fetchVisitStats = async () => {
      try {
        // 먼저 links/page 문서에서 통계 확인
        const linksDoc = await getDoc(doc(db, "users", ownerUid, "links", "page"));
        if (linksDoc.exists()) {
          const data = linksDoc.data();
          setVisitStats({
            totalVisits: data.totalVisits || 0,
            todayVisits: data.todayVisits || 0,
            lastVisited: data.lastVisited
          });
        }

        // statistics 컬렉션도 확인
        const statsDoc = await getDoc(doc(db, "users", ownerUid, "statistics", "visits"));
        if (statsDoc.exists()) {
          setVisitStats((prev: any) => ({
            ...prev,
            ...statsDoc.data()
          }));
        }
      } catch (error) {
        console.error("방문 통계 가져오기 실패:", error);
      }
    };

    // 내가 구독 중인 페이지 목록 가져오기
    const unsubscribeSubscriptions = onSnapshot(
      doc(db, 'users', ownerUid, 'settings', 'subscriptions'),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const pagesList = Object.entries(data.subscribedPages || {}).map(([pageId, page]: [string, any]) => ({
            username: page.username,
            subscribedAt: page.subscribedAt ? new Date(page.subscribedAt.seconds * 1000) : null
          }));
          setSubscribedPages(pagesList);
        }
      }
    );

    // 구독자 목록 가져오기
    const unsubscribeSubscribers = onSnapshot(
      doc(db, 'users', ownerUid, 'settings', 'subscribers'),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const subscribersList = Object.entries(data.users || {}).map(([id, sub]: [string, any]) => ({
            email: sub.email,
            subscribedAt: sub.subscribedAt ? new Date(sub.subscribedAt.seconds * 1000) : null
          }));
          setSubscribers(subscribersList);
        }
      }
    );

    // 알림 설정 불러오기
    const loadNotificationSettings = async () => {
      const settingsDoc = await getDoc(doc(db, 'users', ownerUid, 'settings', 'notifications'));
      if (settingsDoc.exists()) {
        setNotificationSettings(settingsDoc.data() as any);
      }
    };

    // 알림 데이터 가져오기 (내 알림 + 구독 중인 페이지의 알림)
    const fetchNotifications = async () => {
      try {
        // 1. 내 알림 가져오기
        const myNotificationsRef = doc(db, 'users', ownerUid, 'notifications', 'list');
        const myNotificationsDoc = await getDoc(myNotificationsRef);
        const myNotifications = myNotificationsDoc.exists() ? myNotificationsDoc.data().notifications || {} : {};

        // 2. 구독 중인 페이지의 알림 가져오기
        const subscriptionsRef = doc(db, 'users', ownerUid, 'settings', 'subscriptions');
        const subscriptionsDoc = await getDoc(subscriptionsRef);
        const subscribedPages = subscriptionsDoc.exists() ? subscriptionsDoc.data().subscribedPages || {} : {};

        // 3. 구독 중인 페이지의 알림 가져오기
        const subscribedNotifications = await Promise.all(
          Object.entries(subscribedPages).map(async ([pageOwnerId, pageData]: [string, any]) => {
            const pageNotificationsRef = doc(db, 'users', pageOwnerId, 'notifications', 'list');
            const pageNotificationsDoc = await getDoc(pageNotificationsRef);
            if (pageNotificationsDoc.exists()) {
              const notifications = pageNotificationsDoc.data().notifications || {};
              return Object.entries(notifications)
                .filter(([_, notification]) => notification !== null)
                .map(([id, notification]: [string, any]) => ({
                  id,
                  ...notification,
                  sourceUserId: pageOwnerId,
                  sourceUsername: pageData.username,
                  createdAt: notification?.createdAt?.toDate() || new Date(),
                  readAt: notification?.readAt?.toDate() || null
                }));
            }
            return [];
          })
        );

        // 4. 모든 알림 합치기
        const allNotifications = [
          ...Object.entries(myNotifications)
            .filter(([_, notification]) => notification !== null)
            .map(([id, notification]: [string, any]) => ({
              id,
              ...notification,
              sourceUserId: ownerUid,
              sourceUsername: ownerUsername,
              createdAt: notification.createdAt?.toDate() || new Date(),
              readAt: notification.readAt?.toDate() || null
            })),
          ...subscribedNotifications.flat()
        ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        console.log('모든 알림:', allNotifications);
        setNotifications(allNotifications);
      } catch (error) {
        console.error('알림 가져오기 실패:', error);
      }
    };

    // 실시간 업데이트 구독
    const unsubscribeNotifications = onSnapshot(
      doc(db, 'users', ownerUid, 'notifications', 'list'),
      () => {
        fetchNotifications();
      }
    );

    fetchUserDetails();
    fetchVisitStats();
    loadNotificationSettings();

    return () => {
      unsubscribePermissions();
      unsubscribeSubscribers();
      unsubscribeSubscriptions();
      unsubscribeNotifications();
    };
  }, [ownerUid, isOpen]);

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="bg-black/70 border-t border-white/20">
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader className="border-b border-white/10">
            <DrawerTitle className="text-2xl font-bold text-center text-white">내 정보</DrawerTitle>
          </DrawerHeader>
          
          <div className="px-4 py-6 pb-10 space-y-6 max-h-[calc(85vh-80px)] overflow-y-auto custom-scrollbar">
            {/* 프로필 정보 */}
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-white/10 border border-white/20">
                                 <img 
                   src={userDetails?.photoURL || "/modoo.png"} 
                   alt="프로필" 
                   className="w-full h-full object-cover"
                 />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {userDetails?.displayName || ownerUsername || '익명'}
                </h3>
                <p className="text-sm text-white/60">{userDetails?.email}</p>
                <p className="text-sm text-white/60">
                  내 사이트: {ownerUsername}
                </p>
              </div>
            </div>

            {/* 방문 통계 */}
            <div className="space-y-2">
              <h3 className="text-md font-semibold text-white">방문 통계</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm text-center">
                  <p className="text-xs text-white/40 mb-1">총 방문</p>
                  <p className="text-lg font-semibold text-white">{visitStats?.totalVisits || 0}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm text-center">
                  <p className="text-xs text-white/40 mb-1">오늘</p>
                  <p className="text-lg font-semibold text-white">{visitStats?.todayVisits || 0}</p>
                </div>
              </div>
            </div>

                         {/* 허용된 사용자 - 사이트 소유자만 볼 수 있음 */}
             {currentUser?.uid === ownerUid && (
               <Collapsible className="space-y-2">
                 <CollapsibleTrigger className="flex items-center justify-between w-full bg-white/10 rounded-lg p-4 backdrop-blur-sm hover:bg-white/20 transition-colors">
                   <h3 className="text-md font-semibold text-white">허용된 사용자</h3>
                   <ChevronDown className="w-4 h-4 text-white/60 transition-transform duration-200 collapsible-open:rotate-180" />
                 </CollapsibleTrigger>
                 <CollapsibleContent>
                   <div className="bg-white/5 rounded-lg p-4 space-y-2 backdrop-blur-sm mt-2">
                     <Link 
                       href={`/editor/${ownerUsername}`}
                       className="block w-full text-sm text-center py-2 mb-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-white/80"
                     >
                       허용된 사용자 관리하기
                     </Link>
                     {allowedUsers.length > 0 ? (
                       allowedUsers.map((user, index) => (
                         <p key={index} className="text-sm text-white/60 pl-2 border-l border-white/10">
                           {(() => {
                             const [username, domain] = user.email.split('@');
                             const maskedUsername = username.length > 3 
                               ? username.slice(0, 3) + '*'.repeat(username.length - 3)
                               : username.slice(0, 1) + '*'.repeat(username.length - 1);
                             return `${maskedUsername}@${domain}`;
                           })()}
                         </p>
                       ))
                     ) : (
                       <p className="text-sm text-white/40 text-center">아직 허용된 사용자가 없습니다</p>
                     )}
                   </div>
                 </CollapsibleContent>
               </Collapsible>
             )}

             {/* 소식 받는 이메일 */}
             <Collapsible className="space-y-2">
               <CollapsibleTrigger className="flex items-center justify-between w-full bg-white/10 rounded-lg p-4 backdrop-blur-sm hover:bg-white/20 transition-colors">
                 <h3 className="text-md font-semibold text-white">구독자 이메일</h3>
                 <ChevronDown className="w-4 h-4 text-white/60 transition-transform duration-200 collapsible-open:rotate-180" />
               </CollapsibleTrigger>
               <CollapsibleContent>
                 <div className="bg-white/5 rounded-lg p-4 space-y-2 backdrop-blur-sm mt-2">
                   <Link 
                     href={`/editor/${ownerUsername}`}
                     className="block w-full text-sm text-center py-2 mb-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-white/80"
                   >
                     구독자 관리하기
                   </Link>
                   {subscribers.length > 0 ? (
                     subscribers.map((subscriber, index) => {
                       // 이메일 마스킹 처리
                       const [username, domain] = subscriber.email.split('@');
                       const maskedUsername = username.length > 3 
                         ? username.slice(0, 3) + '*'.repeat(username.length - 3)
                         : username.slice(0, 1) + '*'.repeat(username.length - 1);
                       const maskedEmail = `${maskedUsername}@${domain}`;
                       
                       return (
                         <div key={index} className="text-sm text-white/60 pl-2 border-l border-white/10">
                           <p>{maskedEmail}</p>
                           <p className="text-xs text-white/40">
                             구독일: {subscriber.subscribedAt?.toLocaleDateString() || '-'}
                           </p>
                         </div>
                       );
                     })
                   ) : (
                     <p className="text-sm text-white/40 text-center">아직 구독자가 없습니다</p>
                   )}
                 </div>
               </CollapsibleContent>
             </Collapsible>

             {/* 구독 중인 페이지 */}
             <Collapsible className="space-y-2">
               <CollapsibleTrigger className="flex items-center justify-between w-full bg-white/10 rounded-lg p-4 backdrop-blur-sm hover:bg-white/20 transition-colors">
                 <h3 className="text-md font-semibold text-white">구독 중인 페이지</h3>
                 <ChevronDown className="w-4 h-4 text-white/60 transition-transform duration-200 collapsible-open:rotate-180" />
               </CollapsibleTrigger>
               <CollapsibleContent>
                 <div className="bg-white/5 rounded-lg p-4 space-y-2 backdrop-blur-sm mt-2">
                   {subscribedPages.length > 0 ? (
                     subscribedPages.map((page, index) => (
                       <div key={index} className="text-sm text-white/60 pl-2 border-l border-white/10">
                         <Link 
                           href={`/${page.username}`} 
                           target="_blank"
                           rel="noopener noreferrer"
                           className="text-white hover:text-white/80 flex items-center gap-1"
                         >
                           {page.username}
                           <svg className="w-3 h-3 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                           </svg>
                         </Link>
                         <p className="text-xs text-white/40">
                           구독일: {page.subscribedAt?.toLocaleDateString() || '-'}
                         </p>
                       </div>
                     ))
                   ) : (
                     <p className="text-sm text-white/40 text-center">구독 중인 페이지가 없습니다</p>
                   )}
                 </div>
               </CollapsibleContent>
             </Collapsible>

             {/* 새로운 소식 */}
             <Collapsible className="space-y-2">
               <CollapsibleTrigger className="flex items-center justify-between w-full bg-white/10 rounded-lg p-4 backdrop-blur-sm hover:bg-white/20 transition-colors">
                 <div className="flex items-center gap-2">
                   <h3 className="text-md font-semibold text-white">새로운 소식</h3>
                   {notifications.filter(n => !n.readAt).length > 0 && (
                     <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                       {notifications.filter(n => !n.readAt).length}
                     </span>
                   )}
                 </div>
                 <ChevronDown className="w-4 h-4 text-white/60 transition-transform duration-200 collapsible-open:rotate-180" />
               </CollapsibleTrigger>
               <CollapsibleContent>
                 <div className="bg-white/5 rounded-lg p-4 space-y-4 backdrop-blur-sm mt-2">
                   {/* 필터와 설정 */}
                   <div className="flex items-center justify-between">
                     <div className="flex gap-2">
                       <button
                         onClick={() => setNotificationFilter('all')}
                         className={`px-3 py-1 rounded-full text-sm ${
                           notificationFilter === 'all' 
                             ? 'bg-white/20 text-white' 
                             : 'text-white/60 hover:bg-white/10'
                         }`}
                       >
                         전체
                       </button>
                       <button
                         onClick={() => setNotificationFilter('unread')}
                         className={`px-3 py-1 rounded-full text-sm ${
                           notificationFilter === 'unread'
                             ? 'bg-white/20 text-white'
                             : 'text-white/60 hover:bg-white/10'
                         }`}
                       >
                         읽지 않음
                       </button>
                       <button
                         onClick={() => setNotificationFilter('read')}
                         className={`px-3 py-1 rounded-full text-sm ${
                           notificationFilter === 'read'
                             ? 'bg-white/20 text-white'
                             : 'text-white/60 hover:bg-white/10'
                         }`}
                       >
                         읽음
                       </button>
                     </div>
                     <button
                       onClick={() => setShowSettings(true)}
                       className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                     >
                       <Settings className="w-4 h-4 text-white/60" />
                     </button>
                   </div>

                   {/* 알림 목록 */}
                   <div className="space-y-3">
                     {notifications
                       .filter(notification => {
                         if (notificationFilter === 'unread') return !notification.readAt;
                         if (notificationFilter === 'read') return notification.readAt;
                         return true;
                       })
                       .map((notification) => (
                         <div
                           key={notification.id}
                           className={`w-full text-left border-l ${notification.readAt ? 'border-white/10' : 'border-blue-400'} pl-2 hover:bg-white/5 rounded transition-colors group cursor-pointer`}
                         >
                           <div className="flex items-start gap-2" onClick={() => handleNotificationClick(notification)}>
                             {getNotificationIcon(notification.type)}
                             <div className="flex-1">
                               <div className="flex items-center gap-2">
                                 <p className={`text-sm ${notification.readAt ? 'text-white/60' : 'text-white'}`}>
                                   {notification.title}
                                 </p>
                                 {notification.sourceUserId !== ownerUid && (
                                   <span className="text-xs px-1.5 py-0.5 bg-white/10 rounded text-white/60">
                                     {notification.sourceUsername}
                                   </span>
                                 )}
                               </div>
                               <p className={`text-sm ${notification.readAt ? 'text-white/40' : 'text-white/60'}`}>
                                 {notification.content}
                               </p>
                               <p className="text-xs text-white/40 mt-1">
                                 {new Date(notification.createdAt).toLocaleString('ko-KR', {
                                   year: '2-digit',
                                   month: '2-digit',
                                   day: '2-digit',
                                   hour: '2-digit',
                                   minute: '2-digit',
                                   hour12: false
                                 })}
                               </p>
                             </div>
                             <div 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleDeleteNotification(notification, e);
                               }}
                               className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all cursor-pointer"
                             >
                               <X className="w-4 h-4 text-white/60" />
                             </div>
                           </div>
                         </div>
                       ))}
                     {notifications.length === 0 && (
                       <p className="text-sm text-white/40 text-center">새로운 소식이 없습니다</p>
                     )}
                   </div>
                 </div>
               </CollapsibleContent>
             </Collapsible>

             {/* 알림 설정 모달 */}
             <Dialog open={showSettings} onOpenChange={setShowSettings}>
               <DialogContent className="bg-black/90 border-white/20">
                 <DialogHeader>
                   <DialogTitle className="text-xl font-bold text-white">알림 설정</DialogTitle>
                 </DialogHeader>
                 <div className="space-y-4 py-4">
                   <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                     <div className="flex items-center gap-2">
                       <Calendar className="w-5 h-5 text-blue-400" />
                       <span className="text-white">캘린더 알림</span>
                     </div>
                     <button
                       onClick={() => handleNotificationSettingChange('calendar')}
                       className={`w-12 h-6 rounded-full transition-colors ${
                         notificationSettings.calendar ? 'bg-blue-500' : 'bg-white/20'
                       }`}
                     >
                       <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                         notificationSettings.calendar ? 'translate-x-7' : 'translate-x-0.5'
                       }`} />
                     </button>
                   </div>
                   <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                     <div className="flex items-center gap-2">
                       <Book className="w-5 h-5 text-green-400" />
                       <span className="text-white">방명록 알림</span>
                     </div>
                     <button
                       onClick={() => handleNotificationSettingChange('questbook')}
                       className={`w-12 h-6 rounded-full transition-colors ${
                         notificationSettings.questbook ? 'bg-blue-500' : 'bg-white/20'
                       }`}
                     >
                       <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                         notificationSettings.questbook ? 'translate-x-7' : 'translate-x-0.5'
                       }`} />
                     </button>
                   </div>
                   <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                     <div className="flex items-center gap-2">
                       <PenSquare className="w-5 h-5 text-purple-400" />
                       <span className="text-white">일기 알림</span>
                     </div>
                     <button
                       onClick={() => handleNotificationSettingChange('diary')}
                       className={`w-12 h-6 rounded-full transition-colors ${
                         notificationSettings.diary ? 'bg-blue-500' : 'bg-white/20'
                       }`}
                     >
                       <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                         notificationSettings.diary ? 'translate-x-7' : 'translate-x-0.5'
                       }`} />
                     </button>
                   </div>
                   <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                     <div className="flex items-center gap-2">
                       <BookOpen className="w-5 h-5 text-pink-400" />
                       <span className="text-white">오늘의 일기 알림</span>
                     </div>
                     <button
                       onClick={() => handleNotificationSettingChange('todayDiary')}
                       className={`w-12 h-6 rounded-full transition-colors ${
                         notificationSettings.todayDiary ? 'bg-blue-500' : 'bg-white/20'
                       }`}
                     >
                       <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                         notificationSettings.todayDiary ? 'translate-x-7' : 'translate-x-0.5'
                       }`} />
                     </button>
                   </div>
                 </div>
               </DialogContent>
             </Dialog>

             {/* 알림 상세 다이얼로그 */}
             <Dialog open={!!selectedNotification} onOpenChange={(open) => !open && setSelectedNotification(null)}>
               <DialogContent className="bg-black/90 border-white/20">
                 <DialogHeader>
                   <div className="flex items-center gap-2">
                     {selectedNotification && getNotificationIcon(selectedNotification.type)}
                     <DialogTitle className="text-xl font-bold text-white">
                       {selectedNotification?.title}
                     </DialogTitle>
                   </div>
                   {selectedNotification?.sourceUserId !== ownerUid && (
                     <div className="flex items-center gap-2 mt-2">
                       <span className="text-sm text-white/60">From:</span>
                       <span className="text-sm px-2 py-0.5 bg-white/10 rounded text-white">
                         {selectedNotification?.sourceUsername}
                       </span>
                     </div>
                   )}
                 </DialogHeader>
                 <div className="space-y-4 py-4">
                   {/* 알림 내용 */}
                   <div className="bg-white/5 rounded-lg p-4">
                     <p className="text-white/80 whitespace-pre-wrap">
                       {selectedNotification?.content}
                     </p>
                     {selectedNotification?.metadata?.postContent && (
                       <div className="mt-4 p-3 bg-white/5 rounded border border-white/10">
                         <p className="text-sm text-white/60">
                           {selectedNotification.metadata.postContent}
                         </p>
                       </div>
                     )}
                   </div>

                   {/* 시간 정보 */}
                   <div className="flex items-center justify-between text-sm text-white/40">
                     <span>
                       작성: {selectedNotification?.createdAt.toLocaleString('ko-KR', {
                         year: '2-digit',
                         month: '2-digit',
                         day: '2-digit',
                         hour: '2-digit',
                         minute: '2-digit',
                         hour12: false
                       })}
                     </span>
                     {selectedNotification?.readAt && (
                       <span>
                         읽음: {selectedNotification.readAt.toLocaleString('ko-KR', {
                           year: '2-digit',
                           month: '2-digit',
                           day: '2-digit',
                           hour: '2-digit',
                           minute: '2-digit',
                           hour12: false
                         })}
                       </span>
                     )}
                   </div>

                   {/* 버튼 */}
                   {selectedNotification?.metadata?.postId && (
                     <button
                       onClick={() => handleGoToContent(selectedNotification)}
                       className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                     >
                       컨텐츠로 이동
                     </button>
                   )}
                 </div>
               </DialogContent>
             </Dialog>
           </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
