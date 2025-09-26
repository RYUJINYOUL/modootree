import { Metadata } from 'next';
import ClientLayout from './components/ClientLayout';

export const metadata: Metadata = {
  title: '모두트리 공감투표',
  description: '사연 작성하면 공감 투표 AI 자동 생성',
  openGraph: {
    title: '모두트리 공감투표',
    description: '사연 작성하면 공감 투표 AI 자동 생성',
    images: ['/Image/logo.png'],
  },
};

export default function ModooAILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
}