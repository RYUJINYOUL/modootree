// app/api/news/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb as db } from '@/lib/firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FieldValue } from 'firebase-admin/firestore';
// import Parser from 'rss-parser'; // 웹페이지 콘텐츠 파싱을 위해 사용될 수 있지만, 여기서는 contentSnippet이 없으므로 직접 fetch하여 처리 (제거)

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' }); // Gemini 2.5 Pro 사용

export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증 토큰이 누락되었습니다.' }, { status: 401 });
    }

    const idToken = authorization.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      console.error('ID 토큰 검증 실패:', error);
      return NextResponse.json({ error: '유효하지 않은 인증 토큰입니다.' }, { status: 401 });
    }

    const { title, original_url, category } = await req.json();

    if (!title || !original_url || !category) {
      return NextResponse.json({ error: '제목, 원문 링크, 카테고리가 모두 필요합니다.' }, { status: 400 });
    }

    // 중복 URL 확인
    const existingArticle = await db.collection('articles')
      .where('original_url', '==', original_url)
      .limit(1)
      .get();

    if (!existingArticle.empty) {
      return NextResponse.json({ error: '이미 제출된 뉴스 기사입니다.' }, { status: 409 });
    }

    let contentSnippet = '';
    try {
        const response = await fetch(original_url);
        if (!response.ok) {
            throw new Error(`Failed to fetch original URL: ${response.statusText}`);
        }
        const html = await response.text();
        // 여기서 HTML 파싱 로직을 추가하여 contentSnippet을 추출할 수 있습니다.
        // 현재는 빈 문자열로 두어 AI가 제목만으로도 처리하도록 합니다.
        // 예: const dom = new JSDOM(html); const articleContent = dom.window.document.querySelector('article').textContent;
        // contentSnippet = articleContent ? articleContent.substring(0, 1000) : ''; // 첫 1000자
    } catch (fetchError) {
        console.warn(`원문 URL 콘텐츠 가져오기 실패: ${original_url}. AI는 제목만으로 처리합니다.`, fetchError);
    }


    // Gemini AI를 사용하여 요약 및 투표 옵션 생성
    const prompt = `다음 뉴스 기사의 제목과 원문 링크${contentSnippet ? ' 및 내용' : ''}을 바탕으로 핵심 내용을 상세하게 요약 정리하고, 이 뉴스와 관련된 가장 논쟁적인 질문 1개와 이에 대한 5개의 다양한 관점 투표 선택지를 JSON 형식으로 생성해 주세요.\n\n뉴스 제목: ${title}\n원문 링크: ${original_url}\n${contentSnippet ? `뉴스 내용: ${contentSnippet}\n` : ''}\nJSON 형식 예시:\n{\n  "summary": "여기 뉴스 상세 요약 내용",\n  "question": "이 뉴스를 어떻게 생각하십니까?",\n  "options": [\n    { "id": "opt_0", "content": "선택지 1" },\n    { "id": "opt_1", "content": "선택지 2" },\n    { "id": "opt_2", "content": "선택지 3" },\n    { "id": "opt_3", "content": "선택지 4" },\n    { "id": "opt_4", "content": "선택지 5" }\n  ]\n}\n`;

    let aiResponseText = '';
    try {
      const result = await model.generateContent(prompt);
      aiResponseText = result.response.text();
      
      // AI 응답에서 JSON 코드 블록 마크다운과 추가 텍스트 제거
      const jsonStartIndex = aiResponseText.indexOf('```json');
      const jsonEndIndex = aiResponseText.lastIndexOf('```');

      if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
        aiResponseText = aiResponseText.substring(jsonStartIndex + 7, jsonEndIndex).trim();
      } else {
        // '```json' 블록을 찾지 못했다면 전체 텍스트를 파싱 시도 (오류 발생 가능성 있음)
        console.warn("AI 응답에서 '```json' 블록을 찾지 못했습니다. 전체 텍스트로 JSON 파싱을 시도합니다.");
      }

    } catch (aiError) {
      console.error(`AI 요약/투표 생성 실패 for ${title}:`, aiError);
      return NextResponse.json({ error: 'AI 요약 및 투표 옵션 생성에 실패했습니다.' }, { status: 500 });
    }

    let summary = 'AI 요약 실패';
    let voteOptions = [
      { id: 'opt_0', content: '선택지 1', votes: 0 },
      { id: 'opt_1', content: '선택지 2', votes: 0 },
      { id: 'opt_2', content: '선택지 3', votes: 0 },
      { id: 'opt_4', content: '선택지 4', votes: 0 },
      { id: 'opt_5', content: '선택지 5', votes: 0 },
    ];
    let question = '투표 질문 생성 실패';

    try {
      const jsonResponse = JSON.parse(aiResponseText);
      summary = jsonResponse.summary || summary;
      question = jsonResponse.question || question;
      if (jsonResponse.options && jsonResponse.options.length >= 5) {
        voteOptions = jsonResponse.options.slice(0, 5).map((opt: any, index: number) => ({
          id: `opt_${index}`, content: opt.content, votes: 0
        }));
      } else {
        console.warn(`AI가 유효한 5개의 투표 옵션을 생성하지 못했습니다: ${title}`);
      }
    } catch (parseError) {
      console.error(`AI 응답 파싱 실패 for ${title}:`, parseError, aiResponseText);
      return NextResponse.json({ error: 'AI 응답 파싱 중 오류가 발생했습니다.' }, { status: 500 });
    }

    // Firestore에 뉴스 기사 저장
    await db.collection('articles').add({
      title: title,
      original_url: original_url,
      category: category,
      summary: summary,
      question: question,
      vote_options: voteOptions,
      total_votes: 0,
      view_count: 0,
      share_count: 0,
      created_by_uid: decodedToken.uid, // 제출한 사용자 UID
      created_at: FieldValue.serverTimestamp(),
      is_analyzed: true,
      analysis_status: 'completed',
      source_type: 'user_submitted', // 사용자 제출임을 명시
    });

    return NextResponse.json({ success: true, message: '뉴스가 성공적으로 제출되었습니다.' });

  } catch (error) {
    console.error('뉴스 제출 API 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
