import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

// 이메일 템플릿 생성
const createEmailContent = (type: string, data: any, username: string) => {
  const templates = {
    calendar: {
      subject: `[${username}] 새로운 일정이 등록되었습니다`,
      content: `
        <h2>새로운 일정이 등록되었습니다</h2>
        <p>제목: ${data.title}</p>
        <p>날짜: ${data.date}</p>
        ${data.description ? `<p>설명: ${data.description}</p>` : ''}
      `
    },
    questbook: {
      subject: `[${username}] 새로운 방명록이 작성되었습니다`,
      content: `
        <h2>새로운 방명록이 작성되었습니다</h2>
        <p>제목: ${data.title}</p>
        <p>작성자: ${data.author}</p>
        ${data.content ? `<p>내용: ${data.content}</p>` : ''}
      `
    },
    diary: {
      subject: `[${username}] 새로운 일기가 작성되었습니다`,
      content: `
        <h2>새로운 일기가 작성되었습니다</h2>
        <p>제목: ${data.title}</p>
        <p>날짜: ${data.date}</p>
        ${data.content ? `<p>내용: ${data.content.substring(0, 100)}...</p>` : ''}
      `
    },
    questbook2: {
      subject: `[${username}] 새로운 글이 등록되었습니다`,
      content: `
        <h2>새로운 글이 등록되었습니다</h2>
        <p>제목: ${data.title}</p>
        <p>작성자: ${data.author}</p>
        ${data.content ? `<p>내용: ${data.content}</p>` : ''}
      `
    }
  };

  return templates[type as keyof typeof templates] || templates.questbook;
};

export async function POST(request: Request) {
  try {
    const { ownerUid, username, type, data } = await request.json();
    console.log('Notification Request:', { ownerUid, username, type, data });

    if (!ownerUid || !username || !type || !data) {
      console.error('Missing required fields:', { ownerUid, username, type, data });
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.', details: { ownerUid, username, type, data } },
        { status: 400 }
      );
    }

    // 구독자 목록 가져오기
    const subscribersRef = doc(db, 'users', ownerUid, 'settings', 'subscribers');
    const subscribersDoc = await getDoc(subscribersRef);
    
    if (!subscribersDoc.exists()) {
      console.log('No subscribers document found');
      return NextResponse.json(
        { error: '구독자 문서를 찾을 수 없습니다.', path: `users/${ownerUid}/settings/subscribers` },
        { status: 404 }
      );
    }

    const subscribers = subscribersDoc.data().emails || [];
    console.log('Found subscribers:', subscribers);
    
    if (subscribers.length === 0) {
      console.log('Subscribers array is empty');
      return NextResponse.json(
        { error: '구독자가 없습니다.', details: '이메일 목록이 비어있습니다.' },
        { status: 404 }
      );
    }

    // 이메일 전송 설정
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Missing email configuration');
      return NextResponse.json(
        { error: '이메일 설정이 누락되었습니다.', details: 'EMAIL_USER 또는 EMAIL_PASS 환경 변수가 없습니다.' },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // 이메일 템플릿 생성
    const { subject, content } = createEmailContent(type, data, username);
    console.log('Email template:', { subject, content });

    // 각 구독자에게 이메일 전송 (순차적으로 처리)
    const failures = [];
    for (const email of subscribers) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: subject,
          html: content
        });
      } catch (error) {
        console.error(`Failed to send email to ${email}:`, error);
        failures.push({ error, email });
      }
    }
    
    if (failures.length > 0) {
      console.error('Some emails failed to send:', failures);
      return NextResponse.json({
        error: '일부 이메일 전송 실패',
        details: failures
      }, { status: 500 });
    }

    console.log('All emails sent successfully');
    return NextResponse.json({ 
      message: '알림 전송 완료',
      sentTo: subscribers.length
    });

  } catch (error) {
    console.error('알림 전송 실패 상세:', error);
    return NextResponse.json({ 
      error: '알림 전송 실패', 
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}