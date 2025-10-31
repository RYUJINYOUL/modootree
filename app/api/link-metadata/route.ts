import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ 
        success: false, 
        error: 'URL이 필요합니다.' 
      }, { status: 400 });
    }

    // URL 정규화
    let normalizedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      normalizedUrl = `https://${url}`;
    }

    // URL 유효성 검사
    try {
      new URL(normalizedUrl);
    } catch {
      return NextResponse.json({ 
        success: false, 
        error: '유효하지 않은 URL입니다.' 
      }, { status: 400 });
    }

    // 웹페이지 메타데이터 가져오기
    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      // 타임아웃 설정 (10초)
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // 정규식을 사용한 메타데이터 추출
    const extractMetaContent = (html: string, patterns: string[]) => {
      for (const pattern of patterns) {
        const regex = new RegExp(pattern, 'i');
        const match = html.match(regex);
        if (match && match[1]) {
          return match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
        }
      }
      return '';
    };

    // 제목 추출
    const titlePatterns = [
      '<meta\\s+property=["\']og:title["\']\\s+content=["\']([^"\']*)["\']',
      '<meta\\s+name=["\']twitter:title["\']\\s+content=["\']([^"\']*)["\']',
      '<title[^>]*>([^<]*)</title>'
    ];
    const title = extractMetaContent(html, titlePatterns);

    // 설명 추출
    const descriptionPatterns = [
      '<meta\\s+property=["\']og:description["\']\\s+content=["\']([^"\']*)["\']',
      '<meta\\s+name=["\']twitter:description["\']\\s+content=["\']([^"\']*)["\']',
      '<meta\\s+name=["\']description["\']\\s+content=["\']([^"\']*)["\']'
    ];
    const description = extractMetaContent(html, descriptionPatterns);

    // 이미지 추출
    const imagePatterns = [
      '<meta\\s+property=["\']og:image["\']\\s+content=["\']([^"\']*)["\']',
      '<meta\\s+name=["\']twitter:image["\']\\s+content=["\']([^"\']*)["\']'
    ];
    const image = extractMetaContent(html, imagePatterns);

    // 사이트명 추출
    const siteNamePatterns = [
      '<meta\\s+property=["\']og:site_name["\']\\s+content=["\']([^"\']*)["\']'
    ];
    const siteName = extractMetaContent(html, siteNamePatterns);

    // 도메인에서 favicon URL 생성
    const urlObj = new URL(normalizedUrl);
    const favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;

    // 결과 정리
    const metadata = {
      title: title.trim() || urlObj.hostname,
      description: description.trim(),
      image: image ? (image.startsWith('http') ? image : new URL(image, normalizedUrl).href) : '',
      siteName: siteName.trim(),
      favicon,
      url: normalizedUrl
    };

    return NextResponse.json({
      success: true,
      metadata
    });

  } catch (error) {
    console.error('메타데이터 추출 오류:', error);
    
    // 기본 정보라도 제공
    try {
      const { url } = await req.json();
      const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
      const urlObj = new URL(normalizedUrl);
      
      return NextResponse.json({
        success: true,
        metadata: {
          title: urlObj.hostname.replace('www.', ''),
          description: '',
          image: '',
          siteName: '',
          favicon: `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`,
          url: normalizedUrl
        }
      });
    } catch {
      return NextResponse.json({ 
        success: false, 
        error: '메타데이터를 가져올 수 없습니다.' 
      }, { status: 500 });
    }
  }
}
