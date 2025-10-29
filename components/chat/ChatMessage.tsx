import { SearchResultCard } from "./SearchResultCard";
import { cn } from "@/lib/utils";

interface SearchResult {
  type: 'news' | 'blog';
  title: string;
  description: string;
  link: string;
  thumbnail?: string;
  source?: string;
  date?: string;
}

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  searchResults?: SearchResult[];
}

export function ChatMessage({ message }: { message: ChatMessage }) {
  return (
    <div className={cn(
      "flex w-full gap-4 p-4",
      message.role === 'user' ? "bg-transparent" : "bg-white/5"
    )}>
      {/* 프로필 아이콘 */}
      <div className="w-8 h-8 rounded-full bg-blue-500 flex-shrink-0">
        {message.role === 'user' ? '👤' : '🤖'}
      </div>

      {/* 메시지 내용 */}
      <div className="flex-1 min-w-0">
        {/* 메인 메시지 */}
        <div className="text-white whitespace-pre-wrap">
          {message.content}
        </div>

        {/* 검색 결과 카드들 */}
        {message.searchResults && message.searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-sm text-gray-400 mb-2">관련 정보:</div>
            {message.searchResults.map((result, index) => (
              <SearchResultCard key={index} result={result} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
















