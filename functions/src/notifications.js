const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// 이메일 전송을 위한 transporter 생성 함수
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: functions.config().email.user,
      pass: functions.config().email.password
    }
  });
};

// 알림 타입별 이메일 템플릿
const getEmailTemplate = (notification) => {
  const { type, title, content, metadata } = notification;
  
  // 공통 스타일
  const styles = {
    container: 'font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;',
    header: 'background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;',
    title: 'color: #1a73e8; font-size: 24px; margin-bottom: 10px;',
    content: 'background-color: white; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;',
    footer: 'text-align: center; color: #666; font-size: 12px; margin-top: 20px;'
  };

  // 알림 타입별 아이콘과 색상
  const typeConfig = {
    calendar: { icon: '📅', color: '#4285f4' },
    questbook: { icon: '📖', color: '#34a853' },
    diary: { icon: '✏️', color: '#a142f4' },
    todayDiary: { icon: '📝', color: '#ea4335' }
  };

  const config = typeConfig[type] || { icon: '🔔', color: '#666' };

  return `
    <div style="${styles.container}">
      <div style="${styles.header}">
        <h1 style="${styles.title}">
          ${config.icon} ${title}
        </h1>
        <p style="color: ${config.color};">${metadata.authorName}님이 새로운 ${type}을(를) 등록했습니다.</p>
      </div>
      
      <div style="${styles.content}">
        ${metadata.postTitle ? `<h2 style="margin-top: 0;">${metadata.postTitle}</h2>` : ''}
        <p>${content}</p>
        
        ${metadata.eventDate ? `<p><strong>날짜:</strong> ${metadata.eventDate}</p>` : ''}
        ${metadata.postContent ? `<p><strong>내용:</strong> ${metadata.postContent}</p>` : ''}
      </div>

      <div style="${styles.footer}">
        <p>
          본 메일은 발신전용입니다.<br>
          알림 설정을 변경하시려면 페이지의 내 정보 → 알림 설정을 이용해주세요.
        </p>
      </div>
    </div>
  `;
};

// 새로운 알림이 추가될 때 이메일 발송
exports.sendNotificationEmail = functions.firestore
  .document('users/{userId}/notifications/list')
  .onWrite(async (change, context) => {
    const { userId } = context.params;

    try {
      // 변경된 데이터 확인
      const newData = change.after.data()?.notifications || {};
      const oldData = change.before.data()?.notifications || {};

      // 새로 추가된 알림 찾기
      const newNotifications = Object.entries(newData)
        .filter(([id, notification]) => {
          // 새로 추가되었거나 readAt이 변경되지 않은 알림만 처리
          const oldNotification = oldData[id];
          return !oldNotification || 
                 (oldNotification.readAt === notification.readAt && 
                  oldNotification.createdAt === notification.createdAt);
        })
        .map(([id, notification]) => ({ id, ...notification }));

      if (newNotifications.length === 0) {
        console.log('No new notifications to process');
        return null;
      }

      // 페이지 소유자 정보 가져오기
      const userDoc = await admin.firestore().doc(`users/${userId}`).get();
      const ownerEmail = userDoc.data()?.email;

      // 구독자 목록 가져오기
      const subscribersDoc = await admin.firestore()
        .doc(`users/${userId}/settings/subscribers`)
        .get();

      // 이메일을 받을 대상 목록 생성
      const emailList = new Set();
      
      // 페이지 소유자 이메일 추가
      if (ownerEmail) {
        emailList.add(ownerEmail);
      }

      // 구독자 이메일 추가
      if (subscribersDoc.exists) {
        const subscribers = subscribersDoc.data().users || {};
        Object.values(subscribers)
          .filter(sub => sub.email)
          .forEach(sub => emailList.add(sub.email));
      }

      if (emailList.size === 0) {
        console.log('No email recipients found');
        return null;
      }

      // 각 알림에 대해 이메일 발송
      const transporter = createTransporter();
      
      for (const notification of newNotifications) {
        // 비공개 컨텐츠는 소유자에게만 발송
        if (notification.metadata?.isPrivate) {
          if (ownerEmail) {
            const mailOptions = {
              from: functions.config().email.user,
              to: ownerEmail,
              subject: notification.title,
              html: getEmailTemplate(notification)
            };
            await transporter.sendMail(mailOptions);
          }
          continue;
        }

        // 공개 컨텐츠는 모든 구독자에게 발송
        const mailOptions = {
          from: functions.config().email.user,
          bcc: Array.from(emailList),
          subject: notification.title,
          html: getEmailTemplate(notification)
        };
        await transporter.sendMail(mailOptions);
      }

      console.log('Notification emails sent successfully');
      return null;

    } catch (error) {
      console.error('Error sending notification emails:', error);
      return null;
    }
  });





