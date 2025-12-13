import { Metadata } from 'next';
import ArticleClient from './ArticleClient';

export const metadata: Metadata = {
  title: '뉴스 투표 - 모두트리',
  description: '모두트리에서 뉴스에 대한 의견을 투표로 표현해보세요.',
};

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const { articleId } = await params;
  return <ArticleClient articleId={articleId} />;
}