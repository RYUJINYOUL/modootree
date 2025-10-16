'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface TrendItem {
  title: string;
  summary: string;
  source: string;
  url: string;
  category: string;
}

export default function SocialTab({ data = [] }: { data: TrendItem[] }) {
  if (!data?.length) {
    return (
      <div className="text-white/50 text-sm text-center py-4">
        소셜 미디어 데이터를 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((item: any, index: number) => (
        <div key={index} className="bg-white/[0.02] rounded-lg p-4 space-y-2">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/80 hover:text-white font-medium block"
          >
            {item.title}
          </a>
          <div className="text-sm text-white/60">{item.summary}</div>
          <div className="text-xs text-white/40">{item.source}</div>
        </div>
      ))}
    </div>
  );
}
