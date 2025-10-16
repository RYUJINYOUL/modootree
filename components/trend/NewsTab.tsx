'use client';

interface TrendItem {
  title: string;
  summary: string;
  source: string;
  url: string;
  category: string;
}

export default function NewsTab({ data = [] }: { data: TrendItem[] }) {
  if (!data?.length) {
    return (
      <div className="text-white/50 text-sm text-center py-4">
        뉴스 데이터를 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((news: any, index: number) => (
        <div key={index} className="bg-white/[0.02] rounded-lg p-4 space-y-2">
          <a
            href={news.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/80 hover:text-white font-medium block"
          >
            {news.title}
          </a>
          <p className="text-sm text-white/60">{news.summary}</p>
          <div className="flex items-center justify-between text-xs text-white/40">
            <span>{news.source}</span>
            <span>{news.category}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
