const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// Gmail transporter 설정
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().email.user,
    pass: functions.config().email.password
  }
});

// 1. 캘린더 이벤트 등록 시 이메일 전송
exports.sendEmailOnNewEvent = functions.firestore
  .document('users/{userId}/event/{eventId}')
  .onCreate(async (snap, context) => {
    const newEvent = snap.data();
    const userId = context.params.userId;

    try {
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(userId)
        .get();
      
      const userData = userDoc.data();
      const userEmail = userData?.email;

      if (!userEmail) return;

      const mailOptions = {
        from: functions.config().email.user,
        to: userEmail,
        subject: '모두트리 새글 등록',
        html: `
          <h2>새로운 일정</h2>
          <p><strong>제목:</strong> ${newEvent.title}</p>
          <p><strong>내용:</strong> ${newEvent.content || '내용 없음'}</p>
          <p><strong>일시:</strong> ${newEvent.date} ${newEvent.startTime} - ${newEvent.endTime}</p>
          <p><strong>작성자:</strong> ${newEvent.authorName || '익명'}</p>
        `
      };

      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('이메일 전송 실패:', error);
    }
  });

// 2. 다이어리 글 등록 시 이메일 전송
exports.sendEmailOnNewDiary = functions.firestore
  .document('users/{userId}/diary/{diaryId}')
  .onCreate(async (snap, context) => {
    const newDiary = snap.data();
    const userId = context.params.userId;

    try {
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(userId)
        .get();
      
      const userData = userDoc.data();
      const userEmail = userData?.email;

      if (!userEmail) return;

      const mailOptions = {
        from: functions.config().email.user,
        to: userEmail,
        subject: '새로운 일기가 등록되었습니다',
        html: `
          <h2>새로운 일기</h2>
          <p><strong>제목:</strong> ${newDiary.title}</p>
          <p><strong>내용:</strong> ${newDiary.content}</p>
          <p><strong>작성자:</strong> ${newDiary.authorName || '익명'}</p>
          <p><strong>작성 시간:</strong> ${new Date(newDiary.createdAt.toDate()).toLocaleString()}</p>
          ${newDiary.isPrivate ? '<p><strong>비공개</strong> 글입니다.</p>' : ''}
        `
      };

      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('이메일 전송 실패:', error);
    }
  });

// 3. 게스트북 글 등록 시 이메일 전송
exports.sendEmailOnNewComment = functions.firestore
  .document('users/{userId}/comments/{commentId}')
  .onCreate(async (snap, context) => {
    const newComment = snap.data();
    const userId = context.params.userId;

    try {
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(userId)
        .get();
      
      const userData = userDoc.data();
      const userEmail = userData?.email;

      if (!userEmail) return;

      const mailOptions = {
        from: functions.config().email.user,
        to: userEmail,
        subject: '새로운 게스트북 글이 등록되었습니다',
        html: `
          <h2>새로운 게스트북 글</h2>
          <p><strong>작성자:</strong> ${newComment.name || '익명'}</p>
          <p><strong>내용:</strong> ${newComment.message}</p>
          <p><strong>작성 시간:</strong> ${new Date(newComment.createdAt.toDate()).toLocaleString()}</p>
        `
      };

      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('이메일 전송 실패:', error);
    }
  });

// 4. 답글 등록 시 이메일 전송 (게스트북)
exports.sendEmailOnNewReply = functions.firestore
  .document('users/{userId}/comments/{commentId}')
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
        .collection('users')
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
        subject: '게스트북에 새로운 답글이 등록되었습니다',
        html: `
          <h2>새로운 답글</h2>
          <p><strong>작성자:</strong> ${newReply.name || '익명'}</p>
          <p><strong>내용:</strong> ${newReply.message}</p>
          <p><strong>작성 시간:</strong> ${new Date(newReply.createdAt.toDate()).toLocaleString()}</p>
        `
      };

      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('이메일 전송 실패:', error);
    }
  }); 