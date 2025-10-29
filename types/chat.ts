interface SearchResult {
  type: 'news' | 'blog';
  title: string;
  description: string;
  link: string;
  source?: string;
  date?: string;
}

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: any; // Firestore Timestamp
  isLoading?: boolean;
  searchResults?: SearchResult[];
  suggestedActions?: string[]; // 추천 액션 배열
}

export type { SearchResult, ChatMessage };

















