export interface TrendContent {
  id: string;
  category: 'tech' | 'entertainment' | 'lifestyle' | 'finance';
  title: string;
  titleEn: string;
  summary: string;
  content: {
    mainPoints: string[];
    impact: string;
  };
  media: {
    news: {
      title: string;
      url: string;
      source: string;
      thumbnail?: string;
    }[];
    youtube: {
      title: string;
      videoId: string;
      channelName: string;
      thumbnail: string;
    }[];
    instagram: {
      postUrl: string;
      thumbnail: string;
      author: string;
      engagement: number;
    }[];
    tiktok: {
      videoUrl: string;
      thumbnail: string;
      author: string;
      views: number;
    }[];
  };
  keywords: string[];
  stats: {
    views: number;
    shares: number;
    clicks: number;
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    validUntil: Date;
  };
}




































