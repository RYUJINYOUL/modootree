import { db } from '@/src/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET() {
  return handleTrendRequest();
}

export async function POST() {
  return handleTrendRequest();
}

async function handleTrendRequest() {
  try {
    const today = new Date();
    const dates = [0, 1, 2].map(days => {
      const date = new Date(today);
      date.setDate(date.getDate() - days);
      return date.toISOString().split('T')[0];
    });

    // Firebase에서 최근 3일간의 트렌드 데이터 가져오기
    const trendDocs = await Promise.all(
      dates.map(async dateStr => {
        const docRef = db.collection('trends').doc('daily').collection(dateStr).doc('content');
        const doc = await docRef.get();
        return { date: dateStr, doc };
      })
    );

    // 가장 최근 데이터 찾기
    const latestDoc = trendDocs.find(({ doc }) => doc.exists);

    if (!latestDoc) {
      return new Response(JSON.stringify({
        success: false,
        error: '트렌드 데이터가 아직 생성되지 않았습니다.',
      }), {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 404
      });
    }

    // 존재하는 데이터만 필터링하고 데이터 추출
    const trendsData = trendDocs
      .filter(({ doc }) => doc.exists)
      .map(({ date, doc }) => {
        const data = doc.data();
        console.log('Firebase에서 가져온 데이터:', { date, data });
        return {
          date,
          trends: data?.content?.trends || []
        };
      });

    // 조회수 증가
    await Promise.all(
      trendsData.map(({ date }) => 
        db.collection('trends')
          .doc('daily')
          .collection(date)
          .doc('content')
          .update({
            'stats.views': FieldValue.increment(1),
          })
      )
    );

    console.log('추출된 트렌드 데이터:', trendsData);

    return new Response(JSON.stringify({
      success: true,
      data: trendsData,
    }), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('트렌드 데이터 가져오기 오류:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 500
    });
  }
}