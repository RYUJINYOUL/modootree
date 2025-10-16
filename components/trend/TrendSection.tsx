'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import NewsTab from './NewsTab';
import YouTubeTab from './YouTubeTab';
import SocialTab from './SocialTab';
import TechTab from './TechTab';

interface TrendItem {
  title: string;
  summary: string;
  source: string;
  url: string;
  category: string;
}

export interface TrendDay {
  date: string;
  trends: TrendItem[];
}

export default function TrendSection({ data, isLoading }: { data: TrendDay[] | null; isLoading: boolean }) {
  const [activeTab, setActiveTab] = useState('news');

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-white/10 rounded w-1/3"></div>
        <div className="h-10 bg-white/10 rounded w-full"></div>
        <div className="space-y-2">
          {[1,2,3].map((i) => (
            <div key={i} className="h-24 bg-white/10 rounded w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="text-white/50 text-sm text-center py-4">
        트렌드 데이터를 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white/70 text-lg font-medium">AI 트렌드 리포트</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.03] text-white/60">매일 업데이트</span>
        </div>
      </div>
      <div className="bg-white/[0.03] backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <Tabs defaultValue="news" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="news">뉴스</TabsTrigger>
            <TabsTrigger value="youtube">유튜브</TabsTrigger>
            <TabsTrigger value="social">SNS</TabsTrigger>
            <TabsTrigger value="tech">테크</TabsTrigger>
          </TabsList>
          {data.map((dayData, index) => (
            <div key={dayData.date} className={index > 0 ? 'mt-8' : ''}>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px flex-grow bg-white/10"></div>
                <span className="text-sm text-white/40">
                  {new Date(dayData.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                </span>
                <div className="h-px flex-grow bg-white/10"></div>
              </div>
              <TabsContent value="news">
                <NewsTab data={dayData.trends.filter(item => item.category === '뉴스')} />
              </TabsContent>
              <TabsContent value="youtube">
                <YouTubeTab data={dayData.trends.filter(item => item.category === '유튜브')} />
              </TabsContent>
              <TabsContent value="social">
                <SocialTab data={dayData.trends.filter(item => item.category === 'SNS')} />
              </TabsContent>
              <TabsContent value="tech">
                <TechTab data={dayData.trends.filter(item => item.category === '테크')} />
              </TabsContent>
            </div>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
