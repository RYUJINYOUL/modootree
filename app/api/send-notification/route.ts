import { NextResponse } from 'next/server';
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Amazon SES 클라이언트 설정
const ses = new SESClient({
  region: "ap-southeast-2", // Sydney region
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
});

const EMAIL_CONFIG = {
  sender: 'hi@modootree.com',  // 모두트리 공식 이메일
};

// 이메일 템플릿 생성
const createEmailContent = (type: string, data: any, username: string) => {
  const baseTemplate = (title: string, content: string) => `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://modootree.com/logo.png" alt="모두트리" style="width: 150px;">
      </div>
      
      <h2 style="color: #333; margin-bottom: 20px;">${title}</h2>
      ${content}
      
      <div style="margin-top: 30px; text-align: center;">
        <a href="https://modootree.com" 
           style="background: #4A90E2; color: white; padding: 12px 25px; 
                  text-decoration: none; border-radius: 5px; display: inline-block;">
          모두트리 방문하기
        </a>
      </div>

      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; 
                  text-align: center; color: #888; font-size: 12px;">
        © 2024 모두트리. All rights reserved.
      </div>
    </div>
  `;

  const templates = {
    calendar: {
      subject: `[${username}] 새로운 일정이 등록되었습니다`,
      content: baseTemplate(
        '새로운 일정이 등록되었습니다',
        `
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #444;"><strong>제목:</strong> ${data.title}</p>
            <p style="margin: 10px 0; color: #444;"><strong>날짜:</strong> ${data.date}</p>
            ${data.description ? `<p style="margin: 0; color: #444;"><strong>설명:</strong> ${data.description}</p>` : ''}
          </div>
        `
      )
    },
    questbook: {
      subject: `[${username}] 새로운 방명록이 작성되었습니다`,
      content: baseTemplate(
        '새로운 방명록이 작성되었습니다',
        `
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #444;"><strong>제목:</strong> ${data.title}</p>
            <p style="margin: 10px 0; color: #444;"><strong>작성자:</strong> ${data.author}</p>
            ${data.content ? `<p style="margin: 0; color: #444;"><strong>내용:</strong> ${data.content}</p>` : ''}
          </div>
        `
      )
    },
    diary: {
      subject: `[${username}] 새로운 일기가 작성되었습니다`,
      content: baseTemplate(
        '새로운 일기가 작성되었습니다',
        `
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #444;"><strong>제목:</strong> ${data.title}</p>
            <p style="margin: 10px 0; color: #444;"><strong>날짜:</strong> ${data.date}</p>
            ${data.content ? `<p style="margin: 0; color: #444;"><strong>내용:</strong> ${data.content.substring(0, 100)}...</p>` : ''}
          </div>
        `
      )
    },
    questbook2: {
      subject: `[${username}] 새로운 글이 등록되었습니다`,
      content: baseTemplate(
        '새로운 글이 등록되었습니다',
        `
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #444;"><strong>제목:</strong> ${data.title}</p>
            <p style="margin: 10px 0; color: #444;"><strong>작성자:</strong> ${data.author}</p>
            ${data.content ? `<p style="margin: 0; color: #444;"><strong>내용:</strong> ${data.content}</p>` : ''}
          </div>
        `
      )
    }
  };

  return templates[type as keyof typeof templates] || {
    subject: `[${username}] 새로운 글이 작성되었습니다`,
    content: `
      <h2>새로운 글이 작성되었습니다</h2>
      <p>제목: ${data.title}</p>
    `
  };
};

export async function POST(request: Request) {
  try {
    console.log('1. API 호출 시작');
    
    // AWS 자격증명 확인
    console.log('2. AWS 자격증명 확인:', {
      hasAccessKeyId: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      region: "ap-northeast-2"
    });

    // 요청 데이터 확인
    const body = await request.json();
    console.log('3. Raw request body:', body);

    // 이메일 알림 데이터 구조 변환
    const { title, content, recipients, metadata } = body;
    
    // 필수 필드 검증
    if (!title || !content || !recipients || !metadata) {
      console.error('Missing required email fields:', { title, content, recipients, metadata });
      return NextResponse.json(
        { error: '필수 이메일 필드가 누락되었습니다.', details: { title, content, recipients, metadata } },
        { status: 400 }
      );
    }

    console.log('Email Notification Data:', { 
      title, 
      content, 
      recipients,
      metadata
    });

    // 각 수신자에게 이메일 전송
    const failures = [];
    for (const email of recipients) {
      try {
        console.log('Attempting to send email:', {
          to: email,
          from: EMAIL_CONFIG.sender,
          subject: title
        });

        console.log('4. 이메일 전송 시도:', {
          to: email,
          from: EMAIL_CONFIG.sender,
          subject: title
        });

        const command = new SendEmailCommand({
          Source: EMAIL_CONFIG.sender,
          Destination: {
            ToAddresses: [email],
          },
          Message: {
            Subject: {
              Data: title,
              Charset: "UTF-8",
            },
            Body: {
              Html: {
                Data: content,
                Charset: "UTF-8",
              },
            },
          },
        });

        console.log('5. SES 명령 생성 완료');
        await ses.send(command);
        console.log('6. SES 이메일 전송 완료');
        console.log('Email sent successfully to:', email);
      } catch (error: any) {
        console.error('SES Error details:', {
          code: error?.code,
          message: error?.message,
          email: email
        });
        failures.push({ error: error?.message || 'Unknown error', email });
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
      sentTo: recipients.length
    });

  } catch (error) {
    console.error('알림 전송 실패 상세:', error);
    return NextResponse.json({ 
      error: '알림 전송 실패', 
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}