import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { adminDb as db } from '@/lib/firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FieldValue } from 'firebase-admin/firestore';
import { searchNaverContent } from '@/src/lib/naver-search';

const SIMPLE_SEARCHES = [
  {
    keyword: '경제 뉴스',
    source: '네이버뉴스',
    category: 'economy_it',
  },
  {
    keyword: '연예 뉴스',
    source: '네이버뉴스',
    category: 'entertainment',
  },
  {
    keyword: '정치 뉴스',
    source: '네이버뉴스',
    category: 'current_affairs',
  },
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

    for (const search of SIMPLE_SEARCHES) {
      console.log(`네이버 검색 시작: ${search.keyword}`);
      const searchResults = await searchNaverContent(search.keyword);
      
      if (searchResults.news?.length > 0) {
        console.log(`검색 결과: ${searchResults.news.length}개 뉴스 발견`);
        
        for (const item of searchResults.news.slice(0, 4)) { // 각 카테고리당 최신 4개 처리
          // 네이버 검색 결과를 RSS item 형태로 변환
          const newsItem = {
            title: item.title,
            link: item.link,
            contentSnippet: item.description,
            pubDate: item.pubDate || new Date().toISOString()
          };

          // 최근 7일 이내의 기사만 처리
          const pubDate = newsItem.pubDate ? new Date(newsItem.pubDate) : new Date();
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          
          if (pubDate < sevenDaysAgo) {
            console.log(`7일 이상 지난 기사 건너뛰기: ${newsItem.title}, 발행일: ${pubDate.toISOString()}`);
            continue;
          }

          // URL로만 중복 체크 (하루 1회 실행이므로 충분함)
          const exists = await db.collection('articles')
            .where('original_url', '==', newsItem.link)
            .limit(1)
            .get();
        
          if (!exists.empty) {
            console.log(`기존 뉴스 건너뛰기: ${newsItem.title}`);
            continue;
          }

          console.log(`새로운 뉴스 처리 시작: ${newsItem.title}`);
          console.log(`- 발행일: ${pubDate.toISOString()}`);
          console.log(`- URL: ${newsItem.link}`);

          const prompt = `다음 뉴스 기사를 분석하여 핵심 내용을 상세하게 요약 정리하고, 이 뉴스와 관련된 가장 논쟁적인 질문 1개와 이에 대한 5개의 다양한 관점 투표 선택지를 JSON 형식으로 생성해 주세요.\n\n뉴스 제목: ${newsItem.title}\n뉴스 내용: ${newsItem.contentSnippet}\n\nJSON 형식 예시:\n{\n  "summary": "여기 뉴스 상세 요약 내용",\n  "question": "이 뉴스를 어떻게 생각하십니까?",\n  "options": [\n    { "id": "opt_0", "content": "선택지 1" },\n    { "id": "opt_1", "content": "선택지 2" },\n    { "id": "opt_2", "content": "선택지 3" },\n    { "id": "opt_3", "content": "선택지 4" },\n    { "id": "opt_4", "content": "선택지 5" }\n  ]\n}\n`;

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
            console.error(`AI 요약/투표 생성 실패 for ${newsItem.title}:`, aiError);
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
              console.warn(`AI가 유효한 5개의 투표 옵션을 생성하지 못했습니다: ${newsItem.title}`);
            }
          } catch (parseError) {
            console.error(`AI 응답 파싱 실패 for ${newsItem.title}:`, parseError, aiResponseText);
          }

          // Firestore에 저장
          await db.collection('articles').add({
            source_rss_url: search.keyword, // 검색 키워드로 변경
            title: newsItem.title || '제목 없음',
            original_url: newsItem.link || '',
            category: search.category,
            published_at: newsItem.pubDate ? new Date(newsItem.pubDate) : FieldValue.serverTimestamp(),
            created_at: FieldValue.serverTimestamp(),
            is_analyzed: true,
            analysis_status: 'completed',
            summary: summary,
            vote_options: voteOptions,
            total_votes: 0,
            view_count: 0,
            share_count: 0,
          });
          console.log(`새로운 뉴스 투표 저장됨: ${newsItem.title}`);
        } // Closes inner for loop (for item of searchResults.news)
      } // Closes if (searchResults.news?.length > 0)
    } // Closes outer for loop (for search of SIMPLE_SEARCHES)

    return NextResponse.json({ success: true, message: '뉴스 투표 크론 작업 완료' });
  } catch (error) {
    console.error('뉴스 투표 크론 작업 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '뉴스 투표 크론 작업 중 서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} // Closes export async function GET