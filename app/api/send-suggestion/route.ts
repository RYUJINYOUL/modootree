import { NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

// SendGrid API 키 설정
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function POST(request: Request) {
  try {
    const { toEmail, toName, suggestion, senderEmail } = await request.json();

    const msg = {
      to: toEmail,
      from: process.env.SENDGRID_FROM_EMAIL!, // SendGrid에서 인증한 이메일
      replyTo: senderEmail, // 회신 주소를 방문자 이메일로 설정
      subject: `[모두트리] ${toName}님에게 새로운 제안이 있습니다`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">새로운 제안이 도착했습니다</h2>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 0; color: #666;">
              <strong>보낸 사람:</strong> ${senderEmail}
            </p>
          </div>
          <div style="color: #666; line-height: 1.6;">
            ${suggestion}
          </div>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px;">
              이 이메일은 모두트리 제안하기 기능을 통해 전송되었습니다.<br>
              회신하시려면 이메일 회신 기능을 사용하시거나 ${senderEmail}로 직접 연락하실 수 있습니다.
            </p>
          </div>
        </div>
      `,
    };

    await sgMail.send(msg);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SendGrid error:', error);
    return NextResponse.json(
      { error: '이메일 전송에 실패했습니다.' },
      { status: 500 }
    );
  }
} 