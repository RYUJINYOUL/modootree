'use client';

interface TrendItem {
  title: string;
  summary: string;
  source: string;
  url: string;
  category: string;
}

export default function TechTab({ data = [] }: { data: TrendItem[] }) {
  if (!data?.length) {
    return (
      <div className="text-white/50 text-sm text-center py-4">
        테크 트렌드 데이터를 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {data.map((trend: any, index: number) => (
        <div key={index} className="bg-white/[0.02] rounded-lg p-4 space-y-3">
          <a
            href={trend.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/80 hover:text-white font-medium block"
          >
            {trend.title}
          </a>
          <div className="text-sm text-white/60">{trend.summary}</div>
          <div className="text-xs text-white/40">{trend.source}</div>
        </div>
      ))}
    </div>
  );
}
