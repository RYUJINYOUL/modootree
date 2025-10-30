import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { adminAuth, db } from '@/src/lib/firebase-admin';
import { collection, query, where, getDocs } from 'firebase/firestore';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_AI_KEY || process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required.' }, { status: 400 });
    }

    // 1. 오늘 날짜의 채팅 기록 불러오기
    const today = new Date();
    const dateKey = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const docId = `${dateKey}_${userId}`;

    const chatDocRef = db.collection('dailyChats').doc(docId);
    const chatDoc = await chatDocRef.get();

    if (!chatDoc.exists) {
      return NextResponse.json({ success: false, error: 'No chat history found for today.' }, { status: 404 });
    }

    const chatData = chatDoc.data();
    const messages = chatData?.messages || [];

    if (messages.length === 0) {
      return NextResponse.json({ success: false, error: 'No messages found in today\'s chat history.' }, { status: 404 });
    }

    // 2. Gemini 모델을 사용하여 채팅 내용 요약
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.6,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
      ]
    });

    const chatHistoryText = messages.map((msg: { role: string; content: string }) => 
      `${msg.role === 'user' ? '사용자' : 'AI'}: ${msg.content}`
    ).join('\n\n');

    const prompt = `다음은 사용자와 AI의 오늘 대화 내용입니다. 이 대화 내용을 바탕으로 사용자 본인의 관점에서 400~1000자 내외의 자연스러운 '사연'을 작성해주세요. 사용자의 감정이나 고민이 잘 드러나도록 작성하고, AI 상담사의 내용은 간접적으로 언급만 해주세요.\n\n대화 내용:\n${chatHistoryText}\n\n사연:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const storySummary = response.text();

    if (!storySummary) {
      throw new Error('AI가 사연을 생성하지 못했습니다.');
    }

    return NextResponse.json({ success: true, summary: storySummary });

  } catch (error: any) {
    console.error('Failed to summarize chat history:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to summarize chat history.' }, { status: 500 });
  }
}

























