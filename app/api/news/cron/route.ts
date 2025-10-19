import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { adminDb as db } from '@/lib/firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FieldValue } from 'firebase-admin/firestore';

const RSS_FEEDS = [
  {
    url: 'https://www.mk.co.kr/rss/30000001/',
    source: '매일경제',
    category: 'economy_it', // 경제/IT
  },
  {
    url: 'https://rss.donga.com/sportsdonga/entertainment.xml',
    source: '스포츠동아',
    category: 'entertainment', // 연예/라이프
  },
  {
    url: 'https://www.yna.co.kr/rss/politics.xml',
    source: '연합뉴스',
    category: 'current_affairs', // 시사 (정치)
  },
  // {
  //   url: 'https://www.yna.co.kr/rss/life.xml',
  //   source: '연합뉴스',
  //   category: 'empathy', // 공감 (라이프) (제거)
  // },
  // {
  //   url: 'https://rss.hani.co.kr/rss',
  //   source: '한겨레',
  //   category: 'empathy', // 공감 (제거)
  // },
];

// // YouTube 검색 함수 (제거)
// async function searchYouTube(query: string): Promise<string | null> {
//   const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
//   if (!YOUTUBE_API_KEY) {
//     console.warn('YOUTUBE_API_KEY가 설정되지 않았습니다. YouTube 검색 기능을 건너뜁니다.');
//     console.warn(`현재 process.env.YOUTUBE_API_KEY 값: ${YOUTUBE_API_KEY}`);
//     return null;
//   }
//   try {
//     const response = await fetch(
//       `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${YOUTUBE_API_KEY}&maxResults=1`
//     );
//     const data = await response.json();
//     if (data.items && data.items.length > 0) {
//       return `https://www.youtube.com/watch?v=${data.items[0].id.videoId}`;
//     }
//   } catch (error) {
//     console.error('YouTube 검색 실패:', error);
//   }
//   return null;
// }

export async function GET(req: NextRequest) {
  try {
    const parser = new Parser();
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' }); // Gemini 2.5 Pro 사용

    for (const feed of RSS_FEEDS) {
      const feedData = await parser.parseURL(feed.url);
      
      for (const item of feedData.items.slice(0, 4)) { // 각 피드당 최신 4개 처리 (10개에서 4개로 수정)
        // 이미 존재하는 뉴스인지 originalUrl로 확인
        const exists = await db.collection('articles')
          .where('original_url', '==', item.link)
          .limit(1)
          .get();
        
        if (!exists.empty) {
          console.log(`기존 뉴스 건너뛰기: ${item.title}`);
          continue;
        }

        const prompt = `다음 뉴스 기사를 분석하여 핵심 내용을 상세하게 요약 정리하고, 이 뉴스와 관련된 가장 논쟁적인 질문 1개와 이에 대한 5개의 다양한 관점 투표 선택지를 JSON 형식으로 생성해 주세요.\n\n뉴스 제목: ${item.title}\n뉴스 내용: ${item.contentSnippet}\n\nJSON 형식 예시:\n{\n  "summary": "여기 뉴스 상세 요약 내용",\n  "question": "이 뉴스를 어떻게 생각하십니까?",\n  "options": [\n    { "id": "opt_0", "content": "선택지 1" },\n    { "id": "opt_1", "content": "선택지 2" },\n    { "id": "opt_2", "content": "선택지 3" },\n    { "id": "opt_3", "content": "선택지 4" },\n    { "id": "opt_4", "content": "선택지 5" }\n  ]\n}\n`;

        let aiResponseText = '';
        let suitable = true; // 적합성 플래그 초기화
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

          // suitable 필드 확인 (제거됨)
          // const tempJsonResponse = JSON.parse(aiResponseText); 
          // if (tempJsonResponse.suitable === false) { 
          //   suitable = false; 
          //   console.log(`[공감] 적합하지 않은 기사 건너뛰기: ${item.title}`); 
          //   continue; 
          // }

        } catch (aiError) {
          console.error(`AI 요약/투표 생성 실패 for ${item.title}:`, aiError);
          continue; // AI 생성 실패 시 다음 기사로 건너뛰기
        }

        if (!suitable) {
          continue; // suitable이 false인 경우도 여기서 다시 한번 건너뛰기
        }

        let summary = 'AI 요약 실패';
        let voteOptions = [
          { id: 'opt_0', content: '선택지 1', votes: 0 },
          { id: 'opt_1', content: '선택지 2', votes: 0 },
          { id: 'opt_2', content: '선택지 3', votes: 0 },
          { id: 'opt_3', content: '선택지 4', votes: 0 },
          { id: 'opt_4', content: '선택지 5', votes: 0 },
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
            console.warn(`AI가 유효한 5개의 투표 옵션을 생성하지 못했습니다: ${item.title}`);
          }
        } catch (parseError) {
          console.error(`AI 응답 파싱 실패 for ${item.title}:`, parseError, aiResponseText);
        }

        // Firestore에 저장
        await db.collection('articles').add({
          source_rss_url: feed.url,
          title: item.title || '제목 없음',
          original_url: item.link || '',
          category: feed.category,
          published_at: item.pubDate ? new Date(item.pubDate) : FieldValue.serverTimestamp(),
          created_at: FieldValue.serverTimestamp(),
          is_analyzed: true,
          analysis_status: 'completed',
          summary: summary,
          vote_options: voteOptions,
          total_votes: 0,
          view_count: 0,
          share_count: 0,
        });
        console.log(`새로운 뉴스 투표 저장됨: ${item.title}`);
      } // Closes inner for loop (for item of feedData.items)
    } // Closes outer for loop (for feed of RSS_FEEDS)

    return NextResponse.json({ success: true, message: '뉴스 투표 크론 작업 완료' });
  } catch (error) {
    console.error('뉴스 투표 크론 작업 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '뉴스 투표 크론 작업 중 서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} // Closes export async function GET