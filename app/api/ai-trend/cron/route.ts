import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FieldValue } from 'firebase-admin/firestore';

interface TrendItem {
  title: string;
  summary: string;
  source: string;
  url: string;
  category: string;
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.");
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const SYSTEM_INSTRUCTION = `You are a Korean trend analysis system. Generate a list of 10 trending topics in Korea.

IMPORTANT: Return ONLY a valid JSON object, no markdown or extra text.

{
  "trends": [
    {
      "title": "Korean title (max 50 chars)",
      "summary": "2-3 line summary in Korean (max 200 chars)",
      "source": "Source name in Korean",
      "url": "Real, accessible URL",
      "category": "테크|유튜브|SNS|뉴스"
    }
  ]
}

Distribution:
- Tech/Startup (테크): 3 items
- YouTube (유튜브): 3 items
- Social Media (SNS): 2 items
- Business/Finance (뉴스): 2 items

Rules:
1. Content < 7 days old
2. URLs must be real and accessible
3. Focus on Korean market/companies
4. NO line breaks in text
5. NO markdown formatting
6. Return ONLY the JSON object`;

export async function GET(request: NextRequest) {
    return generateTrendData();
}

export async function POST(request: NextRequest) {
    return generateTrendData();
}

async function generateTrendData() {
    try {
        console.log('트렌드 데이터 생성 시작...');
        
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-pro",
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192,
                topK: 40,
                topP: 0.8,
            }
        });

        console.log('AI 모델 초기화 완료, 컨텐츠 생성 시작...');

        const result = await model.generateContent([SYSTEM_INSTRUCTION]);

        const responseText = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log('응답 텍스트 (raw):', responseText);

        if (!responseText) {
            throw new Error('AI가 텍스트를 생성하지 못했습니다.');
        }

        let structuredData;
        try {
            // 응답에서 JSON 부분만 추출하고 줄바꿈 제거
            const cleanedText = responseText
                .replace(/```json\n|\n```/g, '')  // 마크다운 코드 블록 제거
                .replace(/\n\s*/g, ' ')           // 줄바꿈과 들여쓰기 제거
                .trim();
            
            console.log('정리된 JSON 텍스트:', cleanedText);
            
            structuredData = JSON.parse(cleanedText);
            
            // trends 배열이 있는지 확인
            if (!structuredData.trends || !Array.isArray(structuredData.trends)) {
                throw new Error('올바른 trends 배열이 없습니다.');
            }

            // 각 트렌드 항목의 문자열에서 줄바꿈 제거
            structuredData.trends = structuredData.trends.map((trend: Partial<TrendItem>) => ({
                ...trend,
                title: trend.title?.replace(/\n/g, ' ').trim(),
                summary: trend.summary?.replace(/\n/g, ' ').trim(),
                source: trend.source?.replace(/\n/g, ' ').trim(),
                url: trend.url?.trim(),
                category: trend.category?.trim()
            }));
        } catch (error) {
            console.error('JSON 파싱 오류:', error);
            throw new Error('AI가 올바른 JSON 형식을 생성하지 못했습니다.');
        }

        console.log('JSON 파싱 완료, Firebase 저장 시작...');

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];

        const dailyTrendRef = db.collection('trends').doc('daily').collection(dateStr).doc('content');
        await dailyTrendRef.set({
            content: structuredData,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            validUntil: new Date(now.getTime() + 24 * 60 * 60 * 1000),
            stats: {
                views: 0,
                shares: 0,
                clicks: 0
            }
        });

        console.log('Firebase 저장 완료');

        return NextResponse.json({
            success: true,
            message: '트렌드 데이터가 성공적으로 생성되었습니다.',
            data: structuredData
        });
    } catch (error) {
        console.error('트렌드 데이터 생성 오류:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        }, { status: 500 });
    }
}