/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
admin.initializeApp();
// 이메일 전송을 위한 transporter 생성 함수
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: functions.config().email.user,
      pass: functions.config().email.password  // 'pass' 대신 'password' 사용
    }
  });
};

// 새 일정이 등록될 때 구독자들에게 이메일 발송
exports.sendEventNotification = functions.firestore
  .document('users/{userId}/event/{eventId}')
  .onCreate(async (snap, context) => {
    try {
      const eventData = snap.data();
      const { userId } = context.params;

      // 페이지 소유자 정보 가져오기
      const userDoc = await admin.firestore().doc(`users/${userId}`).get();
      const pageOwner = userDoc.data()?.displayName || '페이지 소유자';
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

      // 이메일 내용 구성
      const mailOptions = {
        from: functions.config().email.user,
        bcc: Array.from(emailList),
        subject: `[새 일정 알림] ${pageOwner}님의 페이지에 새 일정이 등록되었습니다`,
        html: `
          <h2>새로운 일정이 등록되었습니다</h2>
          <p><strong>제목:</strong> ${eventData.title}</p>
          <p><strong>날짜:</strong> ${eventData.date}</p>
          <p><strong>시간:</strong> ${eventData.startTime} - ${eventData.endTime}</p>
          ${eventData.content ? `<p><strong>내용:</strong> ${eventData.content}</p>` : ''}
          <hr>
          <p style="color: #666; font-size: 12px;">
            본 메일은 발신전용입니다. 구독을 취소하시려면 페이지를 방문하여 취소해주세요.
          </p>
        `
      };

      // 새로운 transporter로 이메일 발송
      const transporter = createTransporter();
      await transporter.sendMail(mailOptions);
      console.log('Notification emails sent successfully to', emailList.size, 'recipients');
      return null;

    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  });

// 구독 취소 요청 처리 (옵션)
exports.handleUnsubscribe = functions.https.onRequest(async (req, res) => {
  try {
    const { userId, email } = req.query;
    if (!userId || !email) {
      res.status(400).send('Missing required parameters');
      return;
    }

    const subscribersRef = admin.firestore()
      .doc(`users/${userId}/settings/subscribers`);
    
    const doc = await subscribersRef.get();
    if (!doc.exists) {
      res.status(404).send('Subscription not found');
      return;
    }

    const subscribers = doc.data().users || {};
    const updatedSubscribers = Object.entries(subscribers)
      .filter(([_, sub]) => sub.email !== email)
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    await subscribersRef.update({ users: updatedSubscribers });
    res.send('Unsubscribed successfully');

  } catch (error) {
    console.error('Error handling unsubscribe:', error);
    res.status(500).send('Internal server error');
  }
});

// 다이어리 글 등록 시 이메일 전송
exports.sendEmailOnNewDiary = functions.firestore
  .document("users/{userId}/diary/{diaryId}")
  .onCreate(async (snap, context) => {
    const newDiary = snap.data();
    const userId = context.params.userId;

    try {
      const userDoc = await admin.firestore()
        .collection("users")
        .doc(userId)
        .get();
      
      const userData = userDoc.data();
      const userEmail = userData?.email;

      if (!userEmail) return;

      const mailOptions = {
        from: functions.config().email.user,
        to: userEmail,
        subject: "새로운 일기가 등록되었습니다",
        html: `
          <h2>새로운 일기</h2>
          <p><strong>제목:</strong> ${newDiary.title}</p>
          <p><strong>내용:</strong> ${newDiary.content}</p>
          <p><strong>작성자:</strong> ${newDiary.authorName || "익명"}</p>
          <p><strong>작성 시간:</strong> ${new Date(newDiary.createdAt.toDate()).toLocaleString()}</p>
          ${newDiary.isPrivate ? "<p><strong>비공개</strong> 글입니다.</p>" : ""}
        `
      };

      // 새로운 transporter로 이메일 발송
      const transporter = createTransporter();
      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error("이메일 전송 실패:", error);
    }
  });

// 게스트북 글 등록 시 이메일 전송
exports.sendEmailOnNewComment = functions.firestore
  .document("users/{userId}/comments/{commentId}")
  .onCreate(async (snap, context) => {
    const newComment = snap.data();
    const userId = context.params.userId;

    try {
      const userDoc = await admin.firestore()
        .collection("users")
        .doc(userId)
        .get();
      
      const userData = userDoc.data();
      const userEmail = userData?.email;

      if (!userEmail) return;

      const mailOptions = {
        from: functions.config().email.user,
        to: userEmail,
        subject: "새로운 게스트북 글이 등록되었습니다",
        html: `
          <h2>새로운 게스트북 글</h2>
          <p><strong>작성자:</strong> ${newComment.name || "익명"}</p>
          <p><strong>내용:</strong> ${newComment.message}</p>
          <p><strong>작성 시간:</strong> ${new Date(newComment.createdAt.toDate()).toLocaleString()}</p>
        `
      };

      // 새로운 transporter로 이메일 발송
      const transporter = createTransporter();
      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error("이메일 전송 실패:", error);
    }
  });

// 답글 등록 시 이메일 전송 (게스트북)
exports.sendEmailOnNewReply = functions.firestore
  .document("users/{userId}/comments/{commentId}")
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    const userId = context.params.userId;

    // 답글이 추가되었는지 확인
    if (newData.replies?.length <= oldData.replies?.length) {
      return;
    }

    try {
      const userDoc = await admin.firestore()
        .collection("users")
        .doc(userId)
        .get();
      
      const userData = userDoc.data();
      const userEmail = userData?.email;

      if (!userEmail) return;

      // 새로 추가된 답글
      const newReply = newData.replies[newData.replies.length - 1];

      const mailOptions = {
        from: functions.config().email.user,
        to: userEmail,
        subject: "게스트북에 새로운 답글이 등록되었습니다",
        html: `
          <h2>새로운 답글</h2>
          <p><strong>작성자:</strong> ${newReply.name || "익명"}</p>
          <p><strong>내용:</strong> ${newReply.message}</p>
          <p><strong>작성 시간:</strong> ${new Date(newReply.createdAt.toDate()).toLocaleString()}</p>
        `
      };

      // 새로운 transporter로 이메일 발송
      const transporter = createTransporter();
      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error("이메일 전송 실패:", error);
    }
  });
