import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

interface SearchResult {
  type: 'news' | 'blog';
  title: string;
  description: string;
  link: string;
  thumbnail?: string;
  source?: string;
  date?: string;
}

export function SearchResultCard({ result }: { result: SearchResult }) {
  return (
    <Card className="bg-white/5 hover:bg-white/10 transition-colors border-blue-500/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {result.thumbnail && (
            <img 
              src={result.thumbnail} 
              alt={result.title}
              className="w-20 h-20 object-cover rounded-lg"
            />
          )}
          <div className="flex-1 min-w-0">
            <Link 
              href={result.link}
              target="_blank"
              rel="noopener noreferrer" 
              className="text-blue-400 hover:text-blue-300 font-medium line-clamp-2"
            >
              {result.title}
            </Link>
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">
              {result.description}
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              {result.type === 'news' && (
                <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-300">
                  뉴스
                </span>
              )}
              {result.type === 'blog' && (
                <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-300">
                  블로그
                </span>
              )}
              {result.source && <span>{result.source}</span>}
              {result.date && <span>•</span>}
              {result.date && <span>{result.date}</span>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

















